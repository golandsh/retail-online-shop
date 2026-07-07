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

import { handleUpsertAddress, handleDeleteAddress } from "./addresses-api";

const createMockFirestore = (documentStore: Map<string, Record<string, unknown>>) => {
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
        delete: async () => {
            documentStore.delete(path);
        },
    });

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
                    ref: createMockDocumentRef(path),
                    get: (field: string) => data[field],
                    data: () => data,
                }));
            return { docs };
        },
    });

    const createMockCollectionRef = (path: string): any => ({
        doc: (id: string) => createMockDocumentRef(`${path}/${id}`),
        where: (field: string, op: string, val: unknown) => createMockQuery(path, [[field, op, val]]),
    });

    const db = {
        collection: vi.fn((name: string) => createMockCollectionRef(name)),
    };

    return db;
};

describe("upsertAddress", () => {
    it("returns 405 if method is not POST", async () => {
        const req = { method: "GET" } as any;
        const res = {
            set: vi.fn().mockReturnThis(),
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as any;

        await handleUpsertAddress(req, res);

        expect(res.status).toHaveBeenCalledWith(405);
        expect(res.json).toHaveBeenCalledWith({ error: "Method not allowed" });
    });

    it("returns 404 if user not found", async () => {
        mockDb = createMockFirestore(new Map());

        const req = {
            method: "POST",
            body: {
                phone: "0500000000",
                city: "Tel Aviv",
                street: "Herzl",
                streetNumber: 5,
                postalCode: 12345,
            },
        } as any;
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as any;

        await handleUpsertAddress(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'User with phone "0500000000" was not found' });
    });

    it("creates a new address (returning 201) if user has no address", async () => {
        const store = new Map<string, Record<string, unknown>>([
            ["users/12", { id: 12, phone: "0501234567" }],
        ]);
        mockDb = createMockFirestore(store);

        const req = {
            method: "POST",
            body: {
                phone: "0501234567",
                city: "Ramat Gan",
                street: "Bialik",
                streetNumber: 15,
                apartment: 4,
                postalCode: 52522,
                notes: "Doorbell broken",
            },
        } as any;
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as any;

        await handleUpsertAddress(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            id: 12,
            userId: 12,
            city: "Ramat Gan",
            street: "Bialik",
            streetNumber: 15,
            apartment: 4,
            postalCode: 52522,
            notes: "Doorbell broken",
        });

        expect(store.get("addresses/12")).toMatchObject({
            id: 12,
            userId: 12,
            city: "Ramat Gan",
            street: "Bialik",
            streetNumber: 15,
            apartment: 4,
            postalCode: 52522,
            notes: "Doorbell broken",
        });
    });

    it("updates existing address (returning 200) if user already has an address", async () => {
        const store = new Map<string, Record<string, unknown>>([
            ["users/12", { id: 12, phone: "0501234567" }],
            ["addresses/12", { id: 12, userId: 12, city: "Tel Aviv", street: "Herzl", streetNumber: 5, apartment: 1, postalCode: 12345, notes: null }],
        ]);
        mockDb = createMockFirestore(store);

        const req = {
            method: "POST",
            body: {
                phone: "0501234567",
                city: "Givatayim",
                street: "Weizmann",
                streetNumber: 50,
                postalCode: 53201,
            },
        } as any;
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as any;

        await handleUpsertAddress(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            id: 12,
            userId: 12,
            city: "Givatayim",
            street: "Weizmann",
            streetNumber: 50,
            apartment: null,
            postalCode: 53201,
            notes: null,
        });

        expect(store.get("addresses/12")).toMatchObject({
            id: 12,
            userId: 12,
            city: "Givatayim",
            street: "Weizmann",
            streetNumber: 50,
            apartment: null,
            postalCode: 53201,
            notes: null,
        });
    });
});

describe("deleteAddress", () => {
    it("returns 405 if method is not allowed", async () => {
        const req = { method: "GET" } as any;
        const res = {
            set: vi.fn().mockReturnThis(),
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as any;

        await handleDeleteAddress(req, res);

        expect(res.status).toHaveBeenCalledWith(405);
        expect(res.json).toHaveBeenCalledWith({ error: "Method not allowed" });
    });

    it("returns 400 if phone is missing", async () => {
        const req = { method: "DELETE", query: {}, body: {} } as any;
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as any;

        await handleDeleteAddress(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Phone number is required to identify the user" });
    });

    it("returns 404 if user not found", async () => {
        mockDb = createMockFirestore(new Map());

        const req = { method: "DELETE", query: { phone: "0500000000" } } as any;
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as any;

        await handleDeleteAddress(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'User with phone "0500000000" was not found' });
    });

    it("returns 404 if address not found", async () => {
        const store = new Map<string, Record<string, unknown>>([
            ["users/12", { id: 12, phone: "0501234567" }],
        ]);
        mockDb = createMockFirestore(store);

        const req = { method: "DELETE", query: { phone: "0501234567" } } as any;
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as any;

        await handleDeleteAddress(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'No address found for user with phone "0501234567"' });
    });

    it("deletes address and returns 200 on success", async () => {
        const store = new Map<string, Record<string, unknown>>([
            ["users/12", { id: 12, phone: "0501234567" }],
            ["addresses/12", { id: 12, userId: 12, city: "Tel Aviv" }],
        ]);
        mockDb = createMockFirestore(store);

        const req = { method: "DELETE", query: { phone: "0501234567" } } as any;
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as any;

        await handleDeleteAddress(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true, message: "Address deleted successfully" });
        expect(store.has("addresses/12")).toBe(false);
    });
});
