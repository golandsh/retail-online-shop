import { getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";

import { getApiConfig } from "./config";
import { errorToLogContext, logger } from "./logger";
import { OrderValidationError, parseCreateOrderBody } from "./order-schema";
import { createOrder as insertOrder } from "./orders-controller";
import {
    AddressNotFoundError,
    AddressOwnershipError,
    ProductNotFoundError,
    UserNotFoundError,
} from "./types";

const db = getFirestore();
const apiConfig = getApiConfig();

export const createOrder = onRequest(
    {
        region: apiConfig.region,
        cors: true,
    },
    async (req, res) => {
        if (req.method !== "POST") {
            res.set("Allow", "POST");
            res.status(405).json({ error: "Method not allowed" });
            return;
        }

        try {
            const body = parseCreateOrderBody(req.body);
            const result = await insertOrder(db, body);

            logger.info("Order created", {
                orderId: result.orderId,
                phone: body.phone,
                addressId: body.addressId,
                itemCount: result.itemCount,
                preAuthPrice: result.preAuthPrice,
            });

            res.status(201).json(result);
        } catch (error) {
            if (error instanceof OrderValidationError) {
                res.status(400).json({ error: error.message });
                return;
            }

            if (error instanceof UserNotFoundError || error instanceof AddressNotFoundError) {
                res.status(404).json({ error: error.message });
                return;
            }

            if (error instanceof AddressOwnershipError || error instanceof ProductNotFoundError) {
                res.status(400).json({ error: error.message });
                return;
            }

            logger.error("Create order failed", errorToLogContext(error));
            res.status(500).json({ error: "Internal server error" });
        }
    },
);
