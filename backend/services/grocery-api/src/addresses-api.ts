import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { z } from "zod";

import { getApiConfig } from "./config";
import { errorToLogContext, logger } from "./logger";
import {
    AddressNotFoundError,
    UserNotFoundError,
} from "./types";

const db = getFirestore();
const apiConfig = getApiConfig();

export const upsertAddressBodySchema = z.object({
    phone: z.string().trim().min(1, "Phone number is required"),
    city: z.string().trim().min(1, "City is required"),
    street: z.string().trim().min(1, "Street is required"),
    streetNumber: z.number().int().positive("Street number must be positive"),
    apartment: z.number().int().positive("Apartment number must be positive").nullable().optional(),
    postalCode: z.number().int().positive("Postal code must be positive"),
    notes: z.string().trim().nullable().optional(),
    pt: z.string().trim().min(1, "Property type is required"),
});

export type UpsertAddressBody = z.infer<typeof upsertAddressBodySchema>;

export class AddressValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AddressValidationError";
    }
}

export const parseUpsertAddressBody = (body: unknown): UpsertAddressBody => {
    const result = upsertAddressBodySchema.safeParse(body);
    if (!result.success) {
        const message = result.error.issues.map((issue) => issue.message).join("; ");
        throw new AddressValidationError(message);
    }
    return result.data;
};

const loadUserByPhone = async (phone: string) => {
    const snapshot = await db.collection("users").where("phone", "==", phone).limit(1).get();
    return snapshot.docs[0] ?? null;
};

const loadAddressDocForUser = async (userId: number) => {
    const snapshot = await db.collection("addresses").where("userId", "==", userId).limit(1).get();
    return snapshot.docs[0] ?? null;
};

export const handleUpsertAddress = async (req: any, res: any) => {
    if (req.method !== "POST") {
        res.set("Allow", "POST");
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    try {
        const body = parseUpsertAddressBody(req.body);
        const userDoc = await loadUserByPhone(body.phone);

        if (!userDoc) {
            throw new UserNotFoundError(`User with phone "${body.phone}" was not found`);
        }

        const userId = Number(userDoc.get("id") ?? userDoc.id);
        const existingAddressDoc = await loadAddressDocForUser(userId);

        let addressId: number;
        let isNewAddress = false;

        const addressData = {
            city: body.city,
            street: body.street,
            streetNumber: body.streetNumber,
            apartment: body.apartment ?? null,
            postalCode: body.postalCode,
            notes: body.notes ?? null,
            pt: body.pt,
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (existingAddressDoc) {
            addressId = Number(existingAddressDoc.get("id") ?? existingAddressDoc.id);
            const addressRef = db.collection("addresses").doc(String(addressId));
            await addressRef.set(addressData, { merge: true });

            logger.info("Address updated", { addressId, userId });
        } else {
            isNewAddress = true;
            addressId = userId; // Match seed-mock-user logic where addressId is same as userId
            const addressRef = db.collection("addresses").doc(String(addressId));
            await addressRef.set({
                id: addressId,
                userId,
                ...addressData,
                createdAt: FieldValue.serverTimestamp(),
            });

            logger.info("Address created", { addressId, userId });
        }

        res.status(isNewAddress ? 201 : 200).json({
            id: addressId,
            userId,
            city: body.city,
            street: body.street,
            streetNumber: body.streetNumber,
            apartment: body.apartment ?? null,
            postalCode: body.postalCode,
            notes: body.notes ?? null,
            pt: body.pt,
        });
    } catch (error) {
        if (error instanceof AddressValidationError) {
            res.status(400).json({ error: error.message });
            return;
        }

        if (error instanceof UserNotFoundError) {
            res.status(404).json({ error: error.message });
            return;
        }

        logger.error("Upsert address failed", errorToLogContext(error));
        res.status(500).json({ error: "Internal server error" });
    }
};

export const upsertAddress = onRequest(
    {
        region: apiConfig.region,
        cors: true,
    },
    handleUpsertAddress
);

export const handleDeleteAddress = async (req: any, res: any) => {
    const allowedMethods = ["DELETE", "POST"];
    if (!allowedMethods.includes(req.method)) {
        res.set("Allow", allowedMethods.join(", "));
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    try {
        const phoneRaw = typeof req.query.phone === "string" ? req.query.phone : req.body?.phone;
        if (!phoneRaw || typeof phoneRaw !== "string" || phoneRaw.trim() === "") {
            res.status(400).json({ error: "Phone number is required to identify the user" });
            return;
        }

        const phone = phoneRaw.trim();
        const userDoc = await loadUserByPhone(phone);

        if (!userDoc) {
            throw new UserNotFoundError(`User with phone "${phone}" was not found`);
        }

        const userId = Number(userDoc.get("id") ?? userDoc.id);
        const addressDoc = await loadAddressDocForUser(userId);

        if (!addressDoc) {
            throw new AddressNotFoundError(`No address found for user with phone "${phone}"`);
        }

        await addressDoc.ref.delete();
        logger.info("Address deleted", { addressId: addressDoc.id, userId });

        res.status(200).json({ success: true, message: "Address deleted successfully" });
    } catch (error) {
        if (error instanceof UserNotFoundError || error instanceof AddressNotFoundError) {
            res.status(404).json({ error: error.message });
            return;
        }

        logger.error("Delete address failed", errorToLogContext(error));
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deleteAddress = onRequest(
    {
        region: apiConfig.region,
        cors: true,
    },
    handleDeleteAddress
);
