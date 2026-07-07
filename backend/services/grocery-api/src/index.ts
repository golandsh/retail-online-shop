import { initializeApp } from "firebase-admin/app";

initializeApp();

export { getCatalog } from "./catalog-api";
export { createOrder } from "./orders-api";
export { upsertUser } from "./users-api";
export { upsertAddress, deleteAddress } from "./addresses-api";
