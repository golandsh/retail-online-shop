import { Readable } from "node:stream";

import type { Firestore } from "firebase-admin/firestore";
import { describe, expect, it, vi } from "vitest";

import { importProductCsv } from "./import-product-csv";

interface MockDocumentRef {
    path: string;
    get: () => Promise<{
        exists: boolean;
        id: string;
        get: (field: string) => unknown;
    }>;
    set: (payload: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>;
    collection: (name: string) => MockCollectionRef;
}

interface MockQuery {
    where: (field: string, operator: string, value: unknown) => MockQuery;
    limit: (count: number) => MockQuery;
    get: () => Promise<{
        docs: Array<{
            id: string;
            get: (field: string) => unknown;
        }>;
    }>;
}

interface MockCollectionRef {
    doc: (id: string) => MockDocumentRef;
    where: (field: string, operator: string, value: unknown) => MockQuery;
}

const matchesWhere = (
    data: Record<string, unknown>,
    field: string,
    operator: string,
    value: unknown,
): boolean => {
    if (operator !== "==") {
        return false;
    }

    const actual = data[field];
    if (value === null) {
        return actual === null || actual === undefined;
    }

    return actual === value;
};

const createMockFirestore = () => {
    const batches: Array<{
        set: ReturnType<typeof vi.fn>;
        commit: ReturnType<typeof vi.fn>;
    }> = [];
    const documentStore = new Map<string, Record<string, unknown>>();
    const counters = new Map<string, number>([
        ["categories", 1],
        ["products", 1],
        ["priceLists", 1],
    ]);

    const getDocumentData = (path: string): Record<string, unknown> | undefined =>
        documentStore.get(path);

    const createMockDocumentRef = (path: string): MockDocumentRef => ({
        path,
        get: async () => {
            const data = getDocumentData(path);
            return {
                exists: data !== undefined,
                id: path.split("/").pop() ?? "",
                get: (field: string) => data?.[field],
            };
        },
        set: async (payload, options) => {
            documentStore.set(path, {
                ...(options?.merge ? documentStore.get(path) ?? {} : {}),
                ...payload,
            });
        },
        collection: (name: string) => createMockCollectionRef(`${path}/${name}`),
    });

    const createMockQuery = (collectionPath: string, filters: Array<[string, string, unknown]>): MockQuery => ({
        where: (field, operator, value) =>
            createMockQuery(collectionPath, [...filters, [field, operator, value]]),
        limit: () => createMockQuery(collectionPath, filters),
        get: async () => {
            const docs = [...documentStore.entries()]
                .filter(([path]) => path.startsWith(`${collectionPath}/`))
                .filter(([, data]) =>
                    filters.every(([field, operator, value]) => matchesWhere(data, field, operator, value)),
                )
                .map(([path, data]) => ({
                    id: path.split("/").pop() ?? "",
                    get: (field: string) => data[field],
                }));

            return { docs };
        },
    });

    const createMockCollectionRef = (path: string): MockCollectionRef => ({
        doc: (id: string) => createMockDocumentRef(`${path}/${id}`),
        where: (field, operator, value) => createMockQuery(path, [[field, operator, value]]),
    });

    const db = {
        batch: vi.fn(() => {
            const batch = {
                set: vi.fn((documentRef: MockDocumentRef, payload: Record<string, unknown>) => {
                    documentStore.set(documentRef.path, {
                        ...(documentStore.get(documentRef.path) ?? {}),
                        ...payload,
                    });
                }),
                commit: vi.fn().mockResolvedValue(undefined),
            };
            batches.push(batch);
            return batch;
        }),
        collection: vi.fn((name: string) => createMockCollectionRef(name)),
        runTransaction: vi.fn(async (callback) => {
            const transaction = {
                get: vi.fn(async (documentRef: MockDocumentRef) => ({
                    exists: documentStore.has(documentRef.path),
                    get: (field: string) => documentStore.get(documentRef.path)?.[field],
                })),
                set: vi.fn((documentRef: MockDocumentRef, payload: Record<string, unknown>) => {
                    documentStore.set(documentRef.path, {
                        ...(documentStore.get(documentRef.path) ?? {}),
                        ...payload,
                    });
                }),
            };

            return callback(transaction);
        }),
    };

    const allocateCounter = (counterName: string): number => {
        const nextId = counters.get(counterName) ?? 1;
        counters.set(counterName, nextId + 1);
        return nextId;
    };

    db.runTransaction.mockImplementation(async (callback) => {
        const transaction = {
            get: vi.fn(async (documentRef: MockDocumentRef) => {
                if (documentRef.path.startsWith("counters/")) {
                    const counterName = documentRef.path.split("/")[1];
                    return {
                        exists: true,
                        get: (field: string) => (field === "nextId" ? counters.get(counterName) ?? 1 : undefined),
                    };
                }

                return {
                    exists: documentStore.has(documentRef.path),
                    get: (field: string) => documentStore.get(documentRef.path)?.[field],
                };
            }),
            set: vi.fn((documentRef: MockDocumentRef, payload: Record<string, unknown>) => {
                if (documentRef.path.startsWith("counters/")) {
                    const counterName = documentRef.path.split("/")[1];
                    if (typeof payload.nextId === "number") {
                        counters.set(counterName, payload.nextId);
                    }
                    return;
                }

                documentStore.set(documentRef.path, {
                    ...(documentStore.get(documentRef.path) ?? {}),
                    ...payload,
                });
            }),
        };

        return callback(transaction);
    });

    return {
        db: db as unknown as Firestore,
        batches,
        documentStore,
        allocateCounter,
    };
};

describe("importProductCsv", () => {
    it("upserts products, categories, subcategories, and price lists with numeric ids", async () => {
        const { db, batches, documentStore } = createMockFirestore();
        documentStore.set("categories/1", {
            id: 1,
            description: "Dairy Products",
            parentId: null,
        });
        documentStore.set("categories/10", {
            id: 10,
            description: "Milk",
            parentId: 1,
        });
        documentStore.set("categories/3", {
            id: 3,
            description: "Produce",
            parentId: null,
        });
        documentStore.set("categories/30", {
            id: 30,
            description: "Fruit",
            parentId: 3,
        });

        const csv = [
            "ProductID,description,IsWeightable,CategoryID,CategoryName,SubCategoryID,SubCategoryName,ImageURL,Price",
            "1001,Milk,false,1,Dairy Products,10,Milk,https://example.com/milk.jpg,7.50",
            "1002,Bananas,true,3,Produce,30,Fruit,,4.20",
        ].join("\n");

        const result = await importProductCsv({
            db,
            batchSize: 20,
            file: {
                name: "imports/prices/sample-products.csv",
                createReadStream: () => Readable.from([csv]),
            },
        });

        const setCalls = batches.flatMap((batch) => batch.set.mock.calls);
        const writtenPaths = setCalls.map(([documentRef]) => (documentRef as MockDocumentRef).path);

        expect(result).toMatchObject({
            rowCount: 2,
            upsertedCount: 2,
            categoryUpsertedCount: 2,
            subCategoryUpsertedCount: 2,
            priceListUpsertedCount: 2,
        });
        expect(writtenPaths).toContain("products/1001");
        expect(writtenPaths).toContain("products/1002");
        expect(writtenPaths).toContain("categories/1");
        expect(writtenPaths).toContain("categories/10");
        expect(documentStore.get("products/1001")).toMatchObject({
            id: 1001,
            description: "Milk",
            isWeightable: false,
            categoryId: 1,
            subCategoryId: 10,
            imageUrl: "https://example.com/milk.jpg",
        });
        expect(documentStore.get("categories/1")).toMatchObject({
            id: 1,
            description: "Dairy Products",
            parentId: null,
        });
        expect(documentStore.get("categories/10")).toMatchObject({
            description: "Milk",
            parentId: 1,
        });
    });

    it("creates categories by name when ids are omitted", async () => {
        const { db, documentStore } = createMockFirestore();
        const csv = [
            "description,IsWeightable,CategoryName,SubCategoryName,Price",
            "Tomatoes,true,Produce,Vegetables,5.80",
        ].join("\n");

        await importProductCsv({
            db,
            file: {
                name: "imports/prices/sample-products.csv",
                createReadStream: () => Readable.from([csv]),
            },
        });

        const categories = [...documentStore.entries()]
            .filter(([path]) => path.startsWith("categories/"))
            .map(([, data]) => data);

        expect(categories).toHaveLength(2);
        expect(categories.some((category) => category.description === "Produce" && category.parentId === null)).toBe(
            true,
        );
        expect(
            categories.some((category) => category.description === "Vegetables" && category.parentId !== null),
        ).toBe(true);
    });
});
