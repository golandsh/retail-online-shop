import type { Firestore } from "firebase-admin/firestore";
import { describe, expect, it, vi } from "vitest";

import { resolveCategory } from "./category-resolver";

interface MockDocumentRef {
    path: string;
    get: () => Promise<{
        exists: boolean;
        id: string;
        get: (field: string) => unknown;
    }>;
    set: (payload: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>;
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

const createMockFirestore = (seed: Record<string, Record<string, unknown>> = {}) => {
    const documentStore = new Map<string, Record<string, unknown>>(Object.entries(seed));
    const counters = new Map<string, number>([["categories", 100]]);

    const createMockDocumentRef = (path: string): MockDocumentRef => ({
        path,
        get: async () => ({
            exists: documentStore.has(path),
            id: path.split("/").pop() ?? "",
            get: (field: string) => documentStore.get(path)?.[field],
        }),
        set: async (payload, options) => {
            documentStore.set(path, {
                ...(options?.merge ? documentStore.get(path) ?? {} : {}),
                ...payload,
            });
        },
    });

    const createMockQuery = (collectionPath: string, filters: Array<[string, string, unknown]>): MockQuery => ({
        where: (field, operator, value) =>
            createMockQuery(collectionPath, [...filters, [field, operator, value]]),
        limit: () => createMockQuery(collectionPath, filters),
        get: async () => ({
            docs: [...documentStore.entries()]
                .filter(([path]) => path.startsWith(`${collectionPath}/`))
                .filter(([, data]) =>
                    filters.every(([field, operator, value]) => {
                        if (operator !== "==") {
                            return false;
                        }

                        const actual = data[field];
                        if (value === null) {
                            return actual === null || actual === undefined;
                        }

                        return actual === value;
                    }),
                )
                .map(([path, data]) => ({
                    id: path.split("/").pop() ?? "",
                    get: (field: string) => data[field],
                })),
        }),
    });

    const db = {
        collection: vi.fn((name: string) => ({
            doc: (id: string) => createMockDocumentRef(`${name}/${id}`),
            where: (field: string, operator: string, value: unknown) =>
                createMockQuery(name, [[field, operator, value]]),
        })),
        runTransaction: vi.fn(async (callback) => {
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
        }),
    };

    return {
        db: db as unknown as Firestore,
        documentStore,
    };
};

describe("resolveCategory", () => {
    it("returns an existing category when id and name match", async () => {
        const { db } = createMockFirestore({
            "categories/1": {
                id: 1,
                description: "Dairy Products",
                parentId: null,
            },
        });

        const resolved = await resolveCategory(db, {
            id: 1,
            name: "Dairy Products",
            parentId: null,
        });

        expect(resolved).toMatchObject({
            id: 1,
            description: "Dairy Products",
            created: false,
        });
    });

    it("fails when an existing category id does not match the provided name", async () => {
        const { db } = createMockFirestore({
            "categories/1": {
                id: 1,
                description: "Dairy Products",
                parentId: null,
            },
        });

        await expect(
            resolveCategory(db, {
                id: 1,
                name: "Bakery",
                parentId: null,
            }),
        ).rejects.toThrow(/description mismatch/i);
    });

    it("creates a category by name when id is omitted", async () => {
        const { db, documentStore } = createMockFirestore();

        const resolved = await resolveCategory(db, {
            name: "Produce",
            parentId: null,
        });

        expect(resolved.created).toBe(true);
        expect(documentStore.get(`categories/${resolved.id}`)).toMatchObject({
            description: "Produce",
            parentId: null,
        });
    });
});
