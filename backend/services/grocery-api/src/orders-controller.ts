import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

import { allocateNextId } from "./auto-increment";
import type { CreateOrderBody } from "./order-schema";
import {
    AddressNotFoundError,
    AddressOwnershipError,
    type CreateOrderResult,
    ProductNotFoundError,
    UserNotFoundError,
} from "./types";

const loadUserByPhone = async (db: Firestore, phone: string) => {
    const snapshot = await db.collection("users").where("phone", "==", phone).limit(1).get();
    return snapshot.docs[0] ?? null;
};

const loadAddressById = async (db: Firestore, addressId: number) => {
    const snapshot = await db.collection("addresses").doc(String(addressId)).get();
    return snapshot.exists ? snapshot : null;
};

const findMissingProductIds = async (db: Firestore, productIds: number[]): Promise<number[]> => {
    const snapshots = await Promise.all(
        productIds.map((productId) => db.collection("products").doc(String(productId)).get()),
    );

    return productIds.filter((productId, index) => !snapshots[index]?.exists);
};

export const createOrder = async (db: Firestore, input: CreateOrderBody): Promise<CreateOrderResult> => {
    const userDoc = await loadUserByPhone(db, input.phone);

    if (!userDoc) {
        throw new UserNotFoundError(`User with phone "${input.phone}" was not found`);
    }

    const userId = Number(userDoc.get("id") ?? userDoc.id);
    const addressDoc = await loadAddressById(db, input.addressId);

    if (!addressDoc) {
        throw new AddressNotFoundError(`Address with id "${input.addressId}" was not found`);
    }

    const addressUserId = Number(addressDoc.get("userId"));
    if (!Number.isFinite(addressUserId) || addressUserId !== userId) {
        throw new AddressOwnershipError(
            `Address "${input.addressId}" does not belong to user with phone "${input.phone}"`,
        );
    }

    const productIds = input.items.map((item) => item.productId);
    const missingProductIds = await findMissingProductIds(db, productIds);

    if (missingProductIds.length > 0) {
        throw new ProductNotFoundError(
            `Products not found: ${missingProductIds.join(", ")}`,
        );
    }

    const orderId = await allocateNextId(db, "orders");
    const batch = db.batch();
    const now = FieldValue.serverTimestamp();

    const orderRef = db.collection("orders").doc(String(orderId));
    batch.set(orderRef, {
        id: orderId,
        userId,
        addressId: input.addressId,
        phone: input.phone,
        status: "pre_authorized",
        preAuthPrice: input.preAuthPrice,
        completePrice: 0,
        notes: input.deliveryComment ?? null,
        startDate: now,
        modifyDate: now,
    });

    for (const item of input.items) {
        const detailRef = db.collection("orderDetails").doc(`${orderId}_${item.productId}`);
        batch.set(detailRef, {
            orderId,
            productId: item.productId,
            preAuthAmount: item.quantity,
            preAuthPrice: item.totalPrice,
            completeAmount: 0,
            completePrice: 0,
        });
    }

    await batch.commit();

    return {
        orderId: String(orderId),
        status: "pre_authorized",
        preAuthPrice: input.preAuthPrice,
        itemCount: input.items.length,
    };
};
