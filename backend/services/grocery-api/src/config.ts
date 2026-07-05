import "dotenv/config";

const DEFAULT_STREETS_API_URL =
    "https://data.gov.il/api/3/action/datastore_search?resource_id=9ad3862c-8391-4b2f-84a4-2d4c68625f4b";

const parseCityWhitelist = (raw: string | undefined): string[] => {
    if (!raw?.trim()) {
        return [];
    }

    return raw
        .split(",")
        .map((city) => city.trim())
        .filter((city) => city.length > 0);
};

export interface ApiConfig {
    region: string;
    cityWhitelist: string[];
    streetsApiUrl: string;
}

export const getApiConfig = (): ApiConfig => ({
    region: process.env.FUNCTIONS_REGION ?? "us-east1",
    cityWhitelist: parseCityWhitelist(process.env.CATALOG_CITY_WHITELIST),
    streetsApiUrl: process.env.STREETS_API_URL ?? DEFAULT_STREETS_API_URL,
});
