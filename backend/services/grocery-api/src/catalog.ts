import type { Firestore } from "firebase-admin/firestore";

import { getApiConfig } from "./config";
import {
    buildPriceByProductId,
    mapAddress,
    mapCategory,
    mapProduct,
    mapUser,
} from "./mappers";
import { fetchWhitelistedCityStreets } from "./street-directory";
import type { CatalogQuery, CatalogResponse } from "./types";
import { InvalidCatalogQueryError, UserNotFoundError } from "./types";

const loadUserByPhone = async (db: Firestore, phone: string) => {
    const snapshot = await db.collection("users").where("phone", "==", phone).limit(1).get();
    return snapshot.docs[0] ?? null;
};

const loadUserById = async (db: Firestore, userId: string) => {
    const snapshot = await db.collection("users").doc(userId).get();
    return snapshot.exists ? snapshot : null;
};

const loadAddressForUser = async (db: Firestore, userId: number) => {
    const snapshot = await db.collection("addresses").where("userId", "==", userId).limit(1).get();
    const doc = snapshot.docs[0];
    return doc ? mapAddress(doc.data()) : null;
};

export const fetchCatalog = async (db: Firestore, query: CatalogQuery): Promise<CatalogResponse> => {
    const { phone, userId } = query;
    const { cityWhitelist, streetsApiUrl } = getApiConfig();

    if (phone && userId) {
        throw new InvalidCatalogQueryError("Provide only one of phone or userId, not both");
    }

    const [productsSnapshot, priceListsSnapshot, categoriesSnapshot, cityStreets] = await Promise.all([
        db.collection("products").get(),
        db.collection("priceLists").get(),
        db.collection("categories").get(),
        fetchWhitelistedCityStreets(cityWhitelist, streetsApiUrl),
    ]);

    const priceByProductId = buildPriceByProductId(priceListsSnapshot.docs);

    const products = productsSnapshot.docs
        .map((doc) => mapProduct(doc.data(), priceByProductId))
        .filter((product): product is NonNullable<typeof product> => product !== null);

    const categories = categoriesSnapshot.docs.map((doc) => mapCategory(doc.data()));

    if (!phone && !userId) {
        return {
            products,
            categories,
            cityStreets,
            user: null,
        };
    }

    const userDoc = phone ? await loadUserByPhone(db, phone) : await loadUserById(db, userId!);

    if (!userDoc) {
        return {
            products,
            categories,
            cityStreets,
            user: null,
        };
    }

    const userData = userDoc.data();
    if (!userData) {
        return {
            products,
            categories,
            cityStreets,
            user: null,
        };
    }

    const resolvedUserId = Number(userData.id ?? userDoc.id);
    const address =
        Number.isFinite(resolvedUserId) ? await loadAddressForUser(db, resolvedUserId) : null;

    return {
        products,
        categories,
        cityStreets,
        user: mapUser(userData, address),
    };
};
