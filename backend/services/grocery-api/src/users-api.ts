import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { z } from "zod";

import { allocateNextId } from "./auto-increment";
import { getApiConfig } from "./config";
import { errorToLogContext, logger } from "./logger";
import { mapAddress } from "./mappers";
import type { CatalogUser } from "./types";

const db = getFirestore();
const apiConfig = getApiConfig();

export const upsertUserBodySchema = z.object({
    phone: z.string().trim().min(1, "Phone number is required"),
    fullName: z.string().trim().min(1, "Full name is required"),
});

export type UpsertUserBody = z.infer<typeof upsertUserBodySchema>;

export class UserValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "UserValidationError";
    }
}

export const parseUpsertUserBody = (body: unknown): UpsertUserBody => {
    const result = upsertUserBodySchema.safeParse(body);
    if (!result.success) {
        const message = result.error.issues.map((issue) => issue.message).join("; ");
        throw new UserValidationError(message);
    }
    return result.data;
};

const loadUserByPhone = async (phone: string) => {
    const snapshot = await db.collection("users").where("phone", "==", phone).limit(1).get();
    return snapshot.docs[0] ?? null;
};

const loadAddressForUser = async (userId: number) => {
    const snapshot = await db.collection("addresses").where("userId", "==", userId).limit(1).get();
    const doc = snapshot.docs[0];
    return doc ? mapAddress(doc.data()) : null;
};

export const handleUpsertUser = async (req: any, res: any) => {
    if (req.method !== "POST") {
        res.set("Allow", "POST");
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    try {
        const body = parseUpsertUserBody(req.body);
        const existingUserDoc = await loadUserByPhone(body.phone);
        
        let userId: number;
        let isNewUser = false;

        if (existingUserDoc) {
            userId = Number(existingUserDoc.get("id") ?? existingUserDoc.id);
            const userRef = db.collection("users").doc(String(userId));
            await userRef.set({
                fullName: body.fullName,
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });

            logger.info("User updated", { userId, phone: body.phone });
        } else {
            isNewUser = true;
            userId = await allocateNextId(db, "users");
            const userRef = db.collection("users").doc(String(userId));
            await userRef.set({
                id: userId,
                phone: body.phone,
                fullName: body.fullName,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });

            logger.info("User created", { userId, phone: body.phone });
        }

        const address = await loadAddressForUser(userId);
        const userResponse: CatalogUser = {
            id: String(userId),
            fullName: body.fullName,
            phone: body.phone,
            address,
        };

        res.status(isNewUser ? 201 : 200).json(userResponse);
    } catch (error) {
        if (error instanceof UserValidationError) {
            res.status(400).json({ error: error.message });
            return;
        }

        logger.error("Upsert user failed", errorToLogContext(error));
        res.status(500).json({ error: "Internal server error" });
    }
};

export const upsertUser = onRequest(
    {
        region: apiConfig.region,
        cors: true,
    },
    handleUpsertUser
);
