import type { Firestore } from "firebase-admin/firestore";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchCatalog } from "./catalog";
import { buildPriceByProductId, mapCategory, mapProduct } from "./mappers";
import { InvalidCatalogQueryError, UserNotFoundError } from "./types";

vi.mock("./config", () => ({
    getApiConfig: () => ({
        region: "us-east1",
        cityWhitelist: [],
        streetsApiUrl:
            "https://data.gov.il/api/3/action/datastore_search?resource_id=9ad3862c-8391-4b2f-84a4-2d4c68625f4b",
    }),
}));

interface MockQuery {
    where: (field: string, operator: string, value: unknown) => MockQuery;
    limit: (count: number) => MockQuery;
    get: () => Promise<{
        docs: Array<{
            id: string;
            data: () => Record<string, unknown>;
            exists?: boolean;
        }>;
        empty?: boolean;
        exists?: boolean;
    }>;
}

interface MockCollectionRef {
    doc: (id: string) => {
        get: () => Promise<{
            exists: boolean;
            id: string;
            data: () => Record<string, unknown>;
        }>;
    };
    where: (field: string, operator: string, value: unknown) => MockQuery;
    get: () => Promise<{
        docs: Array<{
            id: string;
            data: () => Record<string, unknown>;
        }>;
    }>;
}

const createMockFirestore = (documentStore: Map<string, Record<string, unknown>>) => {
    const createMockQuery = (
        collectionPath: string,
        filters: Array<[string, string, unknown]>,
    ): MockQuery => ({
        where: (field, operator, value) =>
            createMockQuery(collectionPath, [...filters, [field, operator, value]]),
        limit: () => createMockQuery(collectionPath, filters),
        get: async () => {
            const docs = [...documentStore.entries()]
                .filter(([path]) => path.startsWith(`${collectionPath}/`))
                .filter(([, data]) =>
                    filters.every(([field, operator, value]) => {
                        if (operator !== "==") {
                            return false;
                        }

                        return data[field] === value;
                    }),
                )
                .map(([path, data]) => ({
                    id: path.split("/").pop() ?? "",
                    data: () => data,
                }));

            return { docs, empty: docs.length === 0 };
        },
    });

    const createMockCollectionRef = (path: string): MockCollectionRef => ({
        doc: (id: string) => ({
            get: async () => {
                const data = documentStore.get(`${path}/${id}`);
                return {
                    exists: data !== undefined,
                    id,
                    data: () => data ?? {},
                };
            },
        }),
        where: (field, operator, value) => createMockQuery(path, [[field, operator, value]]),
        get: async () => ({
            docs: [...documentStore.entries()]
                .filter(([entryPath]) => entryPath.startsWith(`${path}/`))
                .map(([entryPath, data]) => ({
                    id: entryPath.split("/").pop() ?? "",
                    data: () => data,
                })),
        }),
    });

    return {
        collection: vi.fn((name: string) => createMockCollectionRef(name)),
    } as unknown as Firestore;
};

describe("mappers", () => {
    it("picks the latest price by modifyDate for each product", () => {
        const priceMap = buildPriceByProductId([
            {
                id: "1",
                data: () => ({ productId: 1001, price: 5, modifyDate: { seconds: 100 } }),
            },
            {
                id: "2",
                data: () => ({ productId: 1001, price: 7.5, modifyDate: { seconds: 200 } }),
            },
        ] as never);

        expect(priceMap.get(1001)).toBe(7.5);
    });

    it("maps products using subCategoryId when present", () => {
        const product = mapProduct(
            {
                id: 1001,
                description: "Milk",
                isWeightable: false,
                categoryId: 1,
                subCategoryId: 10,
                imageUrl: "https://example.com/milk.jpg",
            },
            new Map([[1001, 7.5]]),
        );

        expect(product).toEqual({
            productId: "1001",
            productDesc: "Milk",
            categoryId: "10",
            price: 7.5,
            weightable: false,
            image: "https://example.com/milk.jpg",
        });
    });

    it("maps categories with parent ids", () => {
        expect(
            mapCategory({
                id: 10,
                description: "Milk",
                parentId: 1,
            }),
        ).toEqual({
            categoryId: "10",
            categoryDesc: "Milk",
            parentID: "1",
        });
    });
});

describe("fetchCatalog", () => {
    it("returns products and categories without user lookup", async () => {
        const store = new Map<string, Record<string, unknown>>([
            [
                "products/1001",
                {
                    id: 1001,
                    description: "Milk",
                    isWeightable: false,
                    categoryId: 1,
                    subCategoryId: 10,
                },
            ],
            ["priceLists/1", { productId: 1001, price: 7.5, modifyDate: { seconds: 100 } }],
            ["categories/1", { id: 1, description: "Dairy", parentId: null }],
            ["categories/10", { id: 10, description: "Milk", parentId: 1 }],
        ]);

        const db = createMockFirestore(store);
        const result = await fetchCatalog(db, {});

        expect(result.user).toBeNull();
        expect(result.products).toHaveLength(1);
        expect(result.categories).toHaveLength(2);
        expect(result.cityStreets).toEqual([]);
    });

    it("returns user and address when phone matches", async () => {
        const store = new Map<string, Record<string, unknown>>([
            ["users/42", { id: 42, fullName: "Israel Israeli", phone: "0501234567", pt: "apt" }],
            [
                "addresses/1",
                {
                    city: "Tel Aviv",
                    street: "Herzl",
                    number: 1,
                    apartment: 3,
                    postalCode: 12345,
                    notes: null,
                    userId: 42,
                },
            ],
        ]);

        const db = createMockFirestore(store);
        const result = await fetchCatalog(db, { phone: "0501234567" });

        expect(result.user).toMatchObject({
            id: "42",
            fullName: "Israel Israeli",
            phone: "0501234567",
            address: {
                city: "Tel Aviv",
                street: "Herzl",
                number: 1,
                apartment: 3,
                postalCode: 12345,
                notes: null,
            },
        });
    });

    it("throws when phone and userId are both provided", async () => {
        const db = createMockFirestore(new Map());
        await expect(fetchCatalog(db, { phone: "050", userId: "1" })).rejects.toBeInstanceOf(
            InvalidCatalogQueryError,
        );
    });

    it("throws when user lookup fails", async () => {
        const db = createMockFirestore(new Map());
        await expect(fetchCatalog(db, { phone: "0501234567" })).rejects.toBeInstanceOf(UserNotFoundError);
    });
});
