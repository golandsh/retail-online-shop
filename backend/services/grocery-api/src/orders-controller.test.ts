import type { Firestore } from "firebase-admin/firestore";
import { describe, expect, it, vi } from "vitest";

import { createOrder } from "./orders-controller";
import {
    AddressNotFoundError,
    AddressOwnershipError,
    ProductNotFoundError,
    UserNotFoundError,
} from "./types";

interface MockDocumentRef {
    path: string;
    get: () => Promise<{ exists: boolean; id: string; get: (field: string) => unknown }>;
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

const createMockFirestore = (documentStore: Map<string, Record<string, unknown>>) => {
    const batches: Array<{
        set: ReturnType<typeof vi.fn>;
        commit: ReturnType<typeof vi.fn>;
    }> = [];

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
                    get: (field: string) => data[field],
                }));

            return { docs };
        },
    });

    const createMockDocumentRef = (path: string): MockDocumentRef => ({
        path,
        get: async () => {
            const data = documentStore.get(path);
            return {
                exists: data !== undefined,
                id: path.split("/").pop() ?? "",
                get: (field: string) => data?.[field],
            };
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
                get: vi.fn(async (documentRef: MockDocumentRef) => {
                    if (documentRef.path.startsWith("counters/")) {
                        const counterName = documentRef.path.split("/")[1];
                        return {
                            exists: true,
                            get: (field: string) =>
                                field === "nextId" ? documentStore.get(`counters/${counterName}`)?.nextId ?? 1 : undefined,
                        };
                    }

                    const data = documentStore.get(documentRef.path);
                    return {
                        exists: data !== undefined,
                        get: (field: string) => data?.[field],
                    };
                }),
                set: vi.fn((documentRef: MockDocumentRef, payload: Record<string, unknown>) => {
                    if (documentRef.path.startsWith("counters/")) {
                        const counterName = documentRef.path.split("/")[1];
                        documentStore.set(`counters/${counterName}`, {
                            ...(documentStore.get(`counters/${counterName}`) ?? {}),
                            ...payload,
                        });
                        return;
                    }

                    documentStore.set(documentRef.path, {
                        ...(documentStore.get(documentRef.path) ?? {}),
                        ...payload,
                    });
                }),
            };

            return callback(transaction);
        }),
    };

    return {
        db: db as unknown as Firestore,
        batches,
        documentStore,
    };
};

const validInput = {
    phone: "0501234567",
    addressId: 1,
    items: [{ productId: 1001, quantity: 2, totalPrice: 15 }],
    preAuthPrice: 15,
    deliveryComment: "test",
};

describe("createOrder", () => {
    it("creates order header and order details", async () => {
        const store = new Map<string, Record<string, unknown>>([
            ["users/1", { id: 1, phone: "0501234567", fullName: "Test User" }],
            ["addresses/1", { id: 1, userId: 1, city: "Ramat Gan" }],
            ["products/1001", { id: 1001, description: "Milk" }],
            ["counters/orders", { nextId: 10 }],
        ]);

        const { db, documentStore } = createMockFirestore(store);
        const result = await createOrder(db, validInput);

        expect(result).toEqual({
            orderId: "10",
            status: "pre_authorized",
            preAuthPrice: 15,
            itemCount: 1,
        });
        expect(documentStore.get("orders/10")).toMatchObject({
            id: 10,
            userId: 1,
            addressId: 1,
            phone: "0501234567",
            status: "pre_authorized",
            preAuthPrice: 15,
            completePrice: 0,
            notes: "test",
        });
        expect(documentStore.get("orderDetails/10_1001")).toMatchObject({
            orderId: 10,
            productId: 1001,
            preAuthAmount: 2,
            preAuthPrice: 15,
            completeAmount: 0,
            completePrice: 0,
        });
    });

    it("throws when user is not found", async () => {
        const { db } = createMockFirestore(new Map());
        await expect(createOrder(db, validInput)).rejects.toBeInstanceOf(UserNotFoundError);
    });

    it("throws when address does not belong to user", async () => {
        const store = new Map<string, Record<string, unknown>>([
            ["users/1", { id: 1, phone: "0501234567" }],
            ["addresses/1", { id: 1, userId: 99 }],
        ]);
        const { db } = createMockFirestore(store);
        await expect(createOrder(db, validInput)).rejects.toBeInstanceOf(AddressOwnershipError);
    });

    it("throws when address is missing", async () => {
        const store = new Map<string, Record<string, unknown>>([
            ["users/1", { id: 1, phone: "0501234567" }],
        ]);
        const { db } = createMockFirestore(store);
        await expect(createOrder(db, validInput)).rejects.toBeInstanceOf(AddressNotFoundError);
    });

    it("throws when product is missing", async () => {
        const store = new Map<string, Record<string, unknown>>([
            ["users/1", { id: 1, phone: "0501234567" }],
            ["addresses/1", { id: 1, userId: 1 }],
            ["counters/orders", { nextId: 1 }],
        ]);
        const { db } = createMockFirestore(store);
        await expect(createOrder(db, validInput)).rejects.toBeInstanceOf(ProductNotFoundError);
    });
});
