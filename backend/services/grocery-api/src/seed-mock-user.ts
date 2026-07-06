/**
 * Seeds a mock user + address into Firestore (local emulator by default).
 * Phone numbers must be unique in the users collection.
 *
 * Usage:
 *   pnpm --filter grocery-api seed:mock-user
 */
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? "online-shop-bf396";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
}

initializeApp({ projectId: PROJECT_ID });

const db = getFirestore();

const MOCK_USER = {
    fullName: "ישראל ישראלי",
    phone: "0501234567",
    pt: "בניין דירות",
};

const MOCK_ADDRESS = {
    city: "רמת גן",
    street: "הרצל",
    number: 12,
    apartment: 3,
    postalCode: 52522,
    notes: null as null,
};

const allocateNextUserId = async (): Promise<number> =>
    db.runTransaction(async (transaction) => {
        const counterRef = db.collection("counters").doc("users");
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

const findUserByPhone = async (phone: string) => {
    const snapshot = await db.collection("users").where("phone", "==", phone).limit(2).get();

    if (snapshot.docs.length > 1) {
        throw new Error(`Phone "${phone}" is assigned to multiple users`);
    }

    return snapshot.docs[0] ?? null;
};

const findAddressForUser = async (userId: number) => {
    const snapshot = await db.collection("addresses").where("userId", "==", userId).limit(1).get();
    return snapshot.docs[0] ?? null;
};

const resolveUserId = async (phone: string, preferredId: number): Promise<number> => {
    const preferredRef = db.collection("users").doc(String(preferredId));
    const preferredSnapshot = await preferredRef.get();

    if (!preferredSnapshot.exists) {
        return preferredId;
    }

    const existingPhone = String(preferredSnapshot.get("phone") ?? "");
    if (existingPhone === phone) {
        return preferredId;
    }

    return allocateNextUserId();
};

const seedMockUser = async (): Promise<void> => {
    const existingByPhone = await findUserByPhone(MOCK_USER.phone);

    const userId = existingByPhone
        ? Number(existingByPhone.get("id") ?? existingByPhone.id)
        : await resolveUserId(MOCK_USER.phone, 1);

    const userRef = db.collection("users").doc(String(userId));
    const existingAddress = await findAddressForUser(userId);
    const addressId = existingAddress
        ? Number(existingAddress.get("id") ?? existingAddress.id)
        : userId;
    const addressRef = db.collection("addresses").doc(String(addressId));

    const userPayload = {
        id: userId,
        ...MOCK_USER,
        updatedAt: FieldValue.serverTimestamp(),
        ...(existingByPhone ? {} : { createdAt: FieldValue.serverTimestamp() }),
    };

    await userRef.set(userPayload, { merge: true });

    await addressRef.set(
        {
            id: addressId,
            ...MOCK_ADDRESS,
            userId,
            updatedAt: FieldValue.serverTimestamp(),
            ...(existingAddress ? {} : { createdAt: FieldValue.serverTimestamp() }),
        },
        { merge: true },
    );

    if (existingByPhone) {
        console.log(`Updated existing user with unique phone ${MOCK_USER.phone}:`, userPayload);
    } else {
        console.log("Seeded mock user:", userPayload);
    }

    console.log("Seeded mock address:", {
        id: addressId,
        ...MOCK_ADDRESS,
        userId,
    });
    console.log(`Test: curl "http://127.0.0.1:5001/${PROJECT_ID}/us-east1/getCatalog?phone=${MOCK_USER.phone}"`);
};

seedMockUser()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Failed to seed mock user:", error);
        process.exit(1);
    });
