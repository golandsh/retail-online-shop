import "dotenv/config";

export interface ApiConfig {
    region: string;
}

export const getApiConfig = (): ApiConfig => ({
    region: process.env.FUNCTIONS_REGION ?? "us-east1",
});
