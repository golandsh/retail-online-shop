import { getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";

import { fetchCatalog } from "./catalog";
import { getApiConfig } from "./config";
import { parseCatalogQuery } from "./mappers";
import { errorToLogContext, logger } from "./logger";
import { InvalidCatalogQueryError, UserNotFoundError } from "./types";

const db = getFirestore();
const apiConfig = getApiConfig();

export const getCatalog = onRequest(
    {
        region: apiConfig.region,
        cors: true,
    },
    async (req, res) => {
        if (req.method !== "GET") {
            res.set("Allow", "GET");
            res.status(405).json({ error: "Method not allowed" });
            return;
        }

        try {
            const { phone, userId } = parseCatalogQuery(req.query as Record<string, unknown>);
            const catalog = await fetchCatalog(db, { phone, userId });

            logger.info("Catalog fetched", {
                productCount: catalog.products.length,
                categoryCount: catalog.categories.length,
                cityCount: catalog.cityStreets.length,
                hasUser: catalog.user !== null,
                phone,
                userId,
            });

            res.status(200).json(catalog);
        } catch (error) {
            if (error instanceof InvalidCatalogQueryError) {
                res.status(400).json({ error: error.message });
                return;
            }

            if (error instanceof UserNotFoundError) {
                res.status(404).json({ error: error.message });
                return;
            }

            logger.error("Catalog fetch failed", errorToLogContext(error));
            res.status(500).json({ error: "Internal server error" });
        }
    },
);
