import { parse } from "csv-parse";
import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

import { allocateNextId, reservePreferredId } from "./auto-increment";
import { resolveCategory, resolveSubCategory } from "./category-resolver";
import { logger } from "./logger";
import {
    CsvRowValidationError,
    descriptionsMatch,
    normalizeProductRow,
    type ProductRow,
    type RawCsvRow,
} from "./product-row";

export interface StorageFileReader {
    name: string;
    createReadStream: () => NodeJS.ReadableStream;
}

export interface ImportProductCsvInput {
    db: Firestore;
    file: StorageFileReader;
    batchSize?: number;
}

export interface FailedRowDetail {
    csvLineNumber: number;
    error: string;
    productId?: number;
    description?: string;
}

export interface ImportProductCsvResult {
    rowCount: number;
    passedRowCount: number;
    failedRowCount: number;
    failedRows: FailedRowDetail[];
    upsertedCount: number;
    categoryUpsertedCount: number;
    subCategoryUpsertedCount: number;
    priceListUpsertedCount: number;
    batchCommitCount: number;
}

const DEFAULT_BATCH_SIZE = 450;

interface ResolvedProduct {
    id: number;
    created: boolean;
}

interface RowWriteCounters {
    categoryUpsertedCount: number;
    subCategoryUpsertedCount: number;
}

type QueueSet = (
    ref: FirebaseFirestore.DocumentReference,
    payload: FirebaseFirestore.DocumentData,
    merge?: boolean,
) => Promise<void>;

const errorMessage = (error: unknown): string => {
    if (error instanceof CsvRowValidationError) {
        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
};

const getFieldPreview = (rawRow: RawCsvRow, aliases: string[]): string | undefined => {
    const normalizedAliases = new Set(aliases.map((alias) => alias.trim().toLowerCase().replace(/[\s_-]+/g, "")));

    for (const [key, value] of Object.entries(rawRow)) {
        const normalizedKey = key.trim().toLowerCase().replace(/[\s_-]+/g, "");
        if (normalizedAliases.has(normalizedKey) && value !== undefined && value !== null && String(value).trim() !== "") {
            return String(value).trim();
        }
    }

    return undefined;
};

const buildFailedRowDetail = (
    csvLineNumber: number,
    rawRow: RawCsvRow,
    error: unknown,
): FailedRowDetail => {
    const productIdRaw = getFieldPreview(rawRow, ["ProductID", "product id", "productId", "ProductId"]);
    const parsedProductId =
        productIdRaw !== undefined && /^-?\d+$/.test(productIdRaw) ? Number(productIdRaw) : undefined;

    return {
        csvLineNumber,
        error: errorMessage(error),
        productId: parsedProductId,
        description: getFieldPreview(rawRow, ["description", "product desc", "product description", "productDesc"]),
    };
};

const findProductsByDescription = async (db: Firestore, description: string) => {
    const snapshot = await db
        .collection("products")
        .where("description", "==", description.trim())
        .limit(2)
        .get();

    return snapshot.docs;
};

const resolveProduct = async (db: Firestore, row: ProductRow): Promise<ResolvedProduct> => {
    if (row.productId !== undefined) {
        const productRef = db.collection("products").doc(String(row.productId));
        const snapshot = await productRef.get();

        if (snapshot.exists) {
            const storedDescription = String(snapshot.get("description") ?? "");
            if (!descriptionsMatch(storedDescription, row.description)) {
                throw new Error(
                    `ProductID ${row.productId} description mismatch (expected "${row.description}", found "${storedDescription}")`,
                );
            }

            return {
                id: Number(snapshot.get("id") ?? row.productId),
                created: false,
            };
        }

        await reservePreferredId(db, "products", row.productId);
        return {
            id: row.productId,
            created: true,
        };
    }

    const matches = await findProductsByDescription(db, row.description);
    if (matches.length > 0) {
        throw new Error(
            `Product description "${row.description}" already exists; provide ProductID to update it`,
        );
    }

    return {
        id: await allocateNextId(db, "products"),
        created: true,
    };
};

const findPriceListForProduct = async (db: Firestore, productId: number) => {
    const snapshot = await db
        .collection("priceLists")
        .where("productId", "==", productId)
        .limit(1)
        .get();

    return snapshot.docs[0] ?? null;
};

const toFirestoreProduct = (
    row: ProductRow,
    productId: number,
    categoryId: number,
    subCategoryId: number | null,
): FirebaseFirestore.DocumentData => ({
    id: productId,
    description: row.description,
    isWeightable: row.isWeightable,
    categoryId,
    subCategoryId,
    imageUrl: row.imageUrl ?? null,
    updatedAt: FieldValue.serverTimestamp(),
});

const toFirestoreCategory = (
    category: { id: number; description: string; parentId: number | null },
): FirebaseFirestore.DocumentData => ({
    id: category.id,
    description: category.description,
    parentId: category.parentId,
    updatedAt: FieldValue.serverTimestamp(),
});

const toFirestorePriceList = (
    priceListId: number,
    productId: number,
    price: number,
    isNew: boolean,
): FirebaseFirestore.DocumentData => ({
    id: priceListId,
    productId,
    price,
    source: "csv_import",
    ...(isNew
        ? {
              createDate: FieldValue.serverTimestamp(),
              modifyDate: FieldValue.serverTimestamp(),
          }
        : {
              modifyDate: FieldValue.serverTimestamp(),
          }),
});

const processImportRow = async (
    db: Firestore,
    row: ProductRow,
    queueSet: QueueSet,
): Promise<RowWriteCounters> => {
    const parentCategory = await resolveCategory(db, {
        id: row.categoryId,
        name: row.categoryName,
        parentId: null,
    });

    const subCategory = await resolveSubCategory(db, parentCategory.id, {
        id: row.subCategoryId,
        name: row.subCategoryName,
    });

    const product = await resolveProduct(db, row);
    const productRef = db.collection("products").doc(String(product.id));

    if (product.created) {
        await queueSet(productRef, {
            ...toFirestoreProduct(row, product.id, parentCategory.id, subCategory?.id ?? null),
            createdAt: FieldValue.serverTimestamp(),
        });
    } else {
        await queueSet(
            productRef,
            toFirestoreProduct(row, product.id, parentCategory.id, subCategory?.id ?? null),
        );
    }

    await queueSet(
        db.collection("categories").doc(String(parentCategory.id)),
        parentCategory.created
            ? {
                  ...toFirestoreCategory(parentCategory),
                  createdAt: FieldValue.serverTimestamp(),
              }
            : toFirestoreCategory(parentCategory),
    );

    if (subCategory) {
        await queueSet(
            db.collection("categories").doc(String(subCategory.id)),
            subCategory.created
                ? {
                      ...toFirestoreCategory(subCategory),
                      createdAt: FieldValue.serverTimestamp(),
                  }
                : toFirestoreCategory(subCategory),
        );
    }

    const existingPriceList = await findPriceListForProduct(db, product.id);
    if (existingPriceList) {
        const priceListId = Number(existingPriceList.get("id") ?? existingPriceList.id);
        await queueSet(
            db.collection("priceLists").doc(String(priceListId)),
            toFirestorePriceList(priceListId, product.id, row.price, false),
        );
    } else {
        const priceListId = await allocateNextId(db, "priceLists");
        await queueSet(
            db.collection("priceLists").doc(String(priceListId)),
            toFirestorePriceList(priceListId, product.id, row.price, true),
        );
    }

    return {
        categoryUpsertedCount: 1,
        subCategoryUpsertedCount: subCategory ? 1 : 0,
    };
};

export const importProductCsv = async ({
    db,
    file,
    batchSize = DEFAULT_BATCH_SIZE,
}: ImportProductCsvInput): Promise<ImportProductCsvResult> => {
    logger.info("Starting CSV stream parse", { fileName: file.name, batchSize });

    const parser = file.createReadStream().pipe(
        parse({
            bom: true,
            columns: true,
            skip_empty_lines: true,
            trim: true,
        }),
    );

    let batch = db.batch();
    let pendingWrites = 0;
    let rowCount = 0;
    let passedRowCount = 0;
    let failedRowCount = 0;
    const failedRows: FailedRowDetail[] = [];
    let upsertedCount = 0;
    let categoryUpsertedCount = 0;
    let subCategoryUpsertedCount = 0;
    let priceListUpsertedCount = 0;
    let batchCommitCount = 0;

    const commitBatch = async (): Promise<void> => {
        if (pendingWrites === 0) {
            return;
        }

        logger.info("Committing Firestore product upsert batch", {
            fileName: file.name,
            pendingWrites,
            batchCommitCount: batchCommitCount + 1,
        });

        await batch.commit();
        batchCommitCount += 1;
        batch = db.batch();
        pendingWrites = 0;
    };

    const queueSet: QueueSet = async (ref, payload, merge = true) => {
        if (pendingWrites + 1 > batchSize) {
            await commitBatch();
        }

        batch.set(ref, payload, { merge });
        pendingWrites += 1;
    };

    for await (const rawRow of parser as AsyncIterable<RawCsvRow>) {
        rowCount += 1;
        const csvLineNumber = rowCount + 1;

        try {
            const row = normalizeProductRow(rawRow, csvLineNumber);
            const rowCounts = await processImportRow(db, row, queueSet);

            passedRowCount += 1;
            upsertedCount += 1;
            categoryUpsertedCount += rowCounts.categoryUpsertedCount;
            subCategoryUpsertedCount += rowCounts.subCategoryUpsertedCount;
            priceListUpsertedCount += 1;
        } catch (error) {
            failedRowCount += 1;
            const failedRow = buildFailedRowDetail(csvLineNumber, rawRow, error);
            failedRows.push(failedRow);

            logger.error("CSV row import failed", {
                fileName: file.name,
                ...failedRow,
            });
        }
    }

    if (rowCount === 0) {
        throw new Error(`CSV file ${file.name} does not contain any product rows`);
    }

    await commitBatch();

    const result: ImportProductCsvResult = {
        rowCount,
        passedRowCount,
        failedRowCount,
        failedRows,
        upsertedCount,
        categoryUpsertedCount,
        subCategoryUpsertedCount,
        priceListUpsertedCount,
        batchCommitCount,
    };

    logger.info("CSV import summary", {
        fileName: file.name,
        totalRows: rowCount,
        passedRows: passedRowCount,
        failedRowCount,
        failedRowDetails: failedRows,
        upsertedCount,
        categoryUpsertedCount,
        subCategoryUpsertedCount,
        priceListUpsertedCount,
        batchCommitCount,
    });

    return result;
};
