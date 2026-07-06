import type { DocumentReference, Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

export const allocateNextId = async (db: Firestore, counterName: string): Promise<number> =>
    db.runTransaction(async (transaction) => {
        const counterRef = db.collection("counters").doc(counterName);
        const counterSnapshot = await transaction.get(counterRef);
        const nextId = Number(counterSnapshot.get("nextId") ?? 1);

        transaction.set(
            counterRef,
            {
                nextId: nextId + 1,
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
        );

        return nextId;
    });

export const ensureDocumentHasId = async (
    db: Firestore,
    docRef: DocumentReference,
    counterName: string,
    preferredId?: number,
): Promise<number> =>
    db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(docRef);
        const existingId = snapshot.exists ? snapshot.get("id") : undefined;

        if (typeof existingId === "number") {
            return existingId;
        }

        const counterRef = db.collection("counters").doc(counterName);
        const counterSnapshot = await transaction.get(counterRef);
        const counterNextId = Number(counterSnapshot.get("nextId") ?? 1);
        const nextId =
            preferredId !== undefined ? Math.max(counterNextId, preferredId) : counterNextId;
        const counterUpdate =
            preferredId !== undefined
                ? Math.max(counterNextId, preferredId + 1)
                : counterNextId + 1;

        transaction.set(
            counterRef,
            {
                nextId: counterUpdate,
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
        );
        transaction.set(
            docRef,
            {
                id: nextId,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
        );

        return nextId;
    });

export const reservePreferredId = async (
    db: Firestore,
    counterName: string,
    preferredId: number,
): Promise<void> => {
    await db.runTransaction(async (transaction) => {
        const counterRef = db.collection("counters").doc(counterName);
        const counterSnapshot = await transaction.get(counterRef);
        const counterNextId = Number(counterSnapshot.get("nextId") ?? 1);

        if (preferredId >= counterNextId) {
            transaction.set(
                counterRef,
                {
                    nextId: preferredId + 1,
                    updatedAt: FieldValue.serverTimestamp(),
                },
                { merge: true },
            );
        }
    });
};
