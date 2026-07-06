import type { Firestore } from "firebase-admin/firestore";
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
