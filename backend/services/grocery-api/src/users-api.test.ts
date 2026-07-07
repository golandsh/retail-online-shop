import type { Firestore } from "firebase-admin/firestore";
import { describe, expect, it, vi } from "vitest";

// Set up the dynamic mock before importing the target handlers
let mockDb: any = null;

vi.mock("firebase-admin/app", () => ({
    initializeApp: vi.fn(),
}));

vi.mock("firebase-admin/firestore", () => {
    const dbProxy = new Proxy({} as any, {
        get(target, prop) {
            if (prop === "batch") {
                return () => mockDb.batch();
            }
            if (prop === "collection") {
                return (name: string) => mockDb.collection(name);
            }
            if (prop === "runTransaction") {
                return (callback: any) => mockDb.runTransaction(callback);
            }
            return (mockDb as any)?.[prop];
        }
    });

    return {
        getFirestore: () => dbProxy,
        FieldValue: {
            serverTimestamp: () => "mock-timestamp",
        },
    };
});

vi.mock("./config", () => ({
    getApiConfig: () => ({
        region: "us-east1",
    }),
}));

import { handleUpsertUser } from "./users-api";

const createMockFirestore = (documentStore: Map<string, Record<string, unknown>>) => {
    const createMockQuery = (collectionPath: string, filters: Array<[string, string, unknown]>): any => ({
        where: (field: string, op: string, val: unknown) => createMockQuery(collectionPath, [...filters, [field, op, val]]),
        limit: () => createMockQuery(collectionPath, filters),
        get: async () => {
            const docs = [...documentStore.entries()]
                .filter(([path]) => path.startsWith(`${collectionPath}/`))
                .filter(([, data]) =>
                    filters.every(([f, op, val]) => op === "==" && data[f] === val)
                )
                .map(([path, data]) => ({
                    id: path.split("/").pop() ?? "",
                    get: (field: string) => data[field],
                    data: () => data,
                }));
            return { docs };
        },
    });

    const createMockDocumentRef = (path: string): any => ({
        path,
        set: async (payload: any, options?: any) => {
            const existing = documentStore.get(path) ?? {};
            if (options?.merge) {
                documentStore.set(path, { ...existing, ...payload });
            } else {
                documentStore.set(path, payload);
            }
        },
        get: async () => {
            const data = documentStore.get(path);
            return {
                exists: data !== undefined,
                id: path.split("/").pop() ?? "",
                get: (field: string) => data?.[field],
                data: () => data ?? {},
            };
        },
    });

    const createMockCollectionRef = (path: string): any => ({
        doc: (id: string) => createMockDocumentRef(`${path}/${id}`),
        where: (field: string, op: string, val: unknown) => createMockQuery(path, [[field, op, val]]),
    });

    const db = {
        collection: vi.fn((name: string) => createMockCollectionRef(name)),
        runTransaction: vi.fn(async (callback) => {
            const transaction = {
                get: async (documentRef: any) => {
                    const counterName = documentRef.path.split("/")[1];
                    const nextId = (documentStore.get(`counters/${counterName}`) as any)?.nextId ?? 1;
                    return {
                        exists: true,
                        get: (field: string) => field === "nextId" ? nextId : undefined,
                    };
                },
                set: (documentRef: any, payload: any) => {
                    const counterName = documentRef.path.split("/")[1];
                    documentStore.set(`counters/${counterName}`, payload);
                },
            };
            return callback(transaction);
        }),
    };

    return db;
};

describe("upsertUser", () => {
    it("returns 405 if method is not POST", async () => {
        const req = { method: "GET" } as any;
        const res = {
            set: vi.fn().mockReturnThis(),
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as any;

        await handleUpsertUser(req, res);

        expect(res.status).toHaveBeenCalledWith(405);
        expect(res.json).toHaveBeenCalledWith({ error: "Method not allowed" });
    });

    it("creates a new user and allocates user ID if phone is new", async () => {
        const store = new Map<string, Record<string, unknown>>([
            ["counters/users", { nextId: 42 }],
        ]);
        mockDb = createMockFirestore(store);

        const req = {
            method: "POST",
            body: {
                phone: "0509999999",
                fullName: "John Doe",
            },
        } as any;
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as any;

        await handleUpsertUser(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            id: "42",
            phone: "0509999999",
            fullName: "John Doe",
            address: null,
        });

        expect(store.get("users/42")).toMatchObject({
            id: 42,
            phone: "0509999999",
            fullName: "John Doe",
        });
        expect(store.get("counters/users")).toMatchObject({
            nextId: 43,
        });
    });

    it("updates existing user if phone already exists", async () => {
        const store = new Map<string, Record<string, unknown>>([
            ["users/10", { id: 10, phone: "0501234567", fullName: "Old Name" }],
            ["addresses/10", { id: 10, userId: 10, city: "Tel Aviv", street: "Herzl", streetNumber: 5, apartment: 1, postalCode: 12345, notes: null, pt: "apartment" }],
        ]);
        mockDb = createMockFirestore(store);

        const req = {
            method: "POST",
            body: {
                phone: "0501234567",
                fullName: "New Name",
            },
        } as any;
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as any;

        await handleUpsertUser(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            id: "10",
            phone: "0501234567",
            fullName: "New Name",
            address: {
                city: "Tel Aviv",
                street: "Herzl",
                streetNumber: 5,
                apartment: 1,
                postalCode: 12345,
                notes: null,
                pt: "apartment",
            },
        });

        expect(store.get("users/10")).toMatchObject({
            id: 10,
            phone: "0501234567",
            fullName: "New Name",
        });
    });

    it("returns 400 on Zod validation errors", async () => {
        mockDb = createMockFirestore(new Map());

        const req = {
            method: "POST",
            body: {
                phone: "  ",
                fullName: "New Name",
            },
        } as any;
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as any;

        await handleUpsertUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: expect.stringContaining("Phone number is required"),
        });
    });
});
