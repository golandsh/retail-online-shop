import type {
    CatalogAddress,
    CatalogCategory,
    CatalogProduct,
    CatalogUser,
} from "./types";

const toTimestampMillis = (value: unknown): number => {
    if (value === null || value === undefined) {
        return 0;
    }

    if (typeof value === "number") {
        return value;
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    if (typeof value === "object" && value !== null && "toMillis" in value) {
        const millis = (value as { toMillis: () => number }).toMillis();
        return typeof millis === "number" ? millis : 0;
    }

    if (typeof value === "object" && value !== null && "seconds" in value) {
        const seconds = (value as { seconds: number }).seconds;
        return typeof seconds === "number" ? seconds * 1000 : 0;
    }

    return 0;
};

export const mapCategory = (data: FirebaseFirestore.DocumentData): CatalogCategory => ({
    categoryId: String(data.id ?? ""),
    categoryDesc: String(data.description ?? ""),
    parentID: data.parentId === null || data.parentId === undefined ? null : String(data.parentId),
});

export const mapProduct = (
    data: FirebaseFirestore.DocumentData,
    priceByProductId: Map<number, number>,
): CatalogProduct | null => {
    const productId = Number(data.id);
    if (!Number.isFinite(productId)) {
        return null;
    }

    const price = priceByProductId.get(productId);
    if (price === undefined) {
        return null;
    }

    const categoryIdValue = data.subCategoryId ?? data.categoryId;
    const categoryId =
        categoryIdValue === null || categoryIdValue === undefined ? "" : String(categoryIdValue);

    const product: CatalogProduct = {
        productId: String(productId),
        productDesc: String(data.description ?? ""),
        categoryId,
        price,
        weightable: Boolean(data.isWeightable),
    };

    const imageUrl = data.imageUrl;
    if (typeof imageUrl === "string" && imageUrl.trim() !== "") {
        product.image = imageUrl;
    }

    return product;
};

export const buildPriceByProductId = (
    priceListDocs: FirebaseFirestore.QueryDocumentSnapshot[],
): Map<number, number> => {
    const latestPriceByProduct = new Map<number, { price: number; modifyDateMs: number }>();

    for (const doc of priceListDocs) {
        const data = doc.data();
        const productId = Number(data.productId);
        const price = Number(data.price);

        if (!Number.isFinite(productId) || !Number.isFinite(price)) {
            continue;
        }

        const modifyDateMs = toTimestampMillis(data.modifyDate ?? data.createDate);
        const existing = latestPriceByProduct.get(productId);

        if (!existing || modifyDateMs >= existing.modifyDateMs) {
            latestPriceByProduct.set(productId, { price, modifyDateMs });
        }
    }

    return new Map(
        [...latestPriceByProduct.entries()].map(([productId, entry]) => [productId, entry.price]),
    );
};

export const mapAddress = (data: FirebaseFirestore.DocumentData): CatalogAddress => ({
    city: String(data.city ?? ""),
    street: String(data.street ?? ""),
    streetNumber: Number(data.streetNumber ?? 0),
    apartment: data.apartment === null || data.apartment === undefined ? null : Number(data.apartment),
    postalCode: Number(data.postalCode ?? 0),
    notes: data.notes === null || data.notes === undefined ? null : String(data.notes),
    pt: String(data.pt ?? ""),
});

export const mapUser = (
    data: FirebaseFirestore.DocumentData,
    address: CatalogAddress | null,
): CatalogUser => ({
    id: String(data.id ?? ""),
    fullName: String(data.fullName ?? ""),
    phone: String(data.phone ?? ""),
    address,
});

export const parseCatalogQuery = (query: Record<string, unknown>): { phone?: string; userId?: string } => {
    const phoneRaw = query.phone;
    const userIdRaw = query.userId;

    const phone = typeof phoneRaw === "string" && phoneRaw.trim() !== "" ? phoneRaw.trim() : undefined;
    const userId =
        typeof userIdRaw === "string" && userIdRaw.trim() !== "" ? userIdRaw.trim() : undefined;

    return { phone, userId };
};
