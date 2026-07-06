import { z } from "zod";

export type RawCsvRow = Record<string, unknown>;

const normalizeHeader = (header: string): string =>
    header
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

const getFieldValue = (row: RawCsvRow, aliases: string[]): unknown => {
    const normalizedAliases = new Set(aliases.map(normalizeHeader));

    for (const [key, value] of Object.entries(row)) {
        if (normalizedAliases.has(normalizeHeader(key))) {
            return value;
        }
    }

    return undefined;
};

const isBlank = (value: unknown): boolean =>
    value === undefined || value === null || (typeof value === "string" && value.trim() === "");

const stringFromField = (value: unknown): unknown => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? undefined : trimmed;
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    return value;
};

const intFromField = (value: unknown): unknown => {
    if (isBlank(value)) {
        return undefined;
    }

    if (typeof value === "number") {
        return Number.isInteger(value) ? value : undefined;
    }

    if (typeof value !== "string") {
        return value;
    }

    const normalized = value.trim();
    if (!/^-?\d+$/.test(normalized)) {
        return value;
    }

    return Number(normalized);
};

const numberFromField = (value: unknown): unknown => {
    if (typeof value === "number") {
        return value;
    }

    if (typeof value !== "string") {
        return value;
    }

    const normalized = value.trim().replace(/[₪$,\s]/g, "");
    return normalized ? Number(normalized) : undefined;
};

const booleanFromField = (value: unknown): unknown => {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "number") {
        return value === 1 ? true : value === 0 ? false : value;
    }

    if (typeof value !== "string") {
        return value;
    }

    const normalized = value.trim().toLowerCase();

    if (["1", "true", "yes", "y", "weightable", "weighable"].includes(normalized)) {
        return true;
    }

    if (["0", "false", "no", "n", "not weightable", "not weighable"].includes(normalized)) {
        return false;
    }

    return value;
};

const optionalIntSchema = z.preprocess(
    intFromField,
    z.number().int().positive().optional(),
);

export const productRowSchema = z
    .object({
        productId: optionalIntSchema,
        description: z.preprocess(
            stringFromField,
            z.string().min(1, "description is required").max(50, "description must be at most 50 characters"),
        ),
        isWeightable: z.preprocess(
            booleanFromField,
            z.boolean("IsWeightable must be a boolean-like value"),
        ),
        categoryId: optionalIntSchema,
        categoryName: z.preprocess(
            stringFromField,
            z.string().min(1).max(50).optional(),
        ),
        subCategoryId: optionalIntSchema,
        subCategoryName: z.preprocess(
            stringFromField,
            z.string().min(1).max(50).optional(),
        ),
        imageUrl: z.preprocess(
            stringFromField,
            z
                .string()
                .max(500)
                .optional()
                .refine((value) => value === undefined || /^https?:\/\//i.test(value), {
                    message: "ImageURL must be a valid URL",
                }),
        ),
        price: z.preprocess(
            numberFromField,
            z.number().finite("Price must be a valid number").nonnegative("Price must be zero or greater"),
        ),
    })
    .superRefine((row, context) => {
        if (row.categoryId === undefined && row.categoryName === undefined) {
            context.addIssue({
                code: "custom",
                message: "At least one of CategoryID or CategoryName is required",
                path: ["categoryId"],
            });
        }

        if (row.subCategoryId === undefined && row.subCategoryName === undefined) {
            return;
        }

        if (row.subCategoryId === undefined && row.subCategoryName === undefined) {
            return;
        }
    });

export type ProductRow = z.infer<typeof productRowSchema>;

export class CsvRowValidationError extends Error {
    constructor(
        readonly rowNumber: number,
        readonly issues: string[],
    ) {
        super(`CSV row ${rowNumber} failed validation: ${issues.join("; ")}`);
        this.name = "CsvRowValidationError";
    }
}

export const normalizeProductRow = (row: RawCsvRow, rowNumber: number): ProductRow => {
    const candidate = {
        productId: getFieldValue(row, ["ProductID", "product id", "productId", "ProductId"]),
        description: getFieldValue(row, ["description", "product desc", "product description", "productDesc"]),
        isWeightable: getFieldValue(row, ["IsWeightable", "isWeightable", "weightable", "wieghtable", "weighable"]),
        categoryId: getFieldValue(row, ["CategoryID", "category id", "categoryId"]),
        categoryName: getFieldValue(row, ["CategoryName", "category name", "category desc", "categoryDesc"]),
        subCategoryId: getFieldValue(row, ["SubCategoryID", "sub category id", "subCategoryId"]),
        subCategoryName: getFieldValue(row, [
            "SubCategoryName",
            "sub category name",
            "sub category desc",
            "subCategoryDesc",
        ]),
        imageUrl: getFieldValue(row, ["ImageURL", "image url", "imageUrl"]),
        price: getFieldValue(row, ["Price", "new price", "price"]),
    };

    const result = productRowSchema.safeParse(candidate);

    if (!result.success) {
        throw new CsvRowValidationError(
            rowNumber,
            result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
        );
    }

    return result.data;
};

export const descriptionsMatch = (left: string, right: string): boolean =>
    left.trim().toLowerCase() === right.trim().toLowerCase();
