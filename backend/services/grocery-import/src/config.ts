import "dotenv/config";

export interface ImporterConfig {
    storageBucket: string;
    importFolder: string;
    historyFolder: string;
    failureEmailEnabled: boolean;
    failureEmailRecipients: string[];
    smtp: {
        host?: string;
        port: number;
        user?: string;
        pass?: string;
        from?: string;
    };
}

const withTrailingSlash = (value: string): string => {
    const trimmed = value.trim().replace(/^\/+/, "");
    return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
};

const parseRecipients = (value?: string): string[] =>
    (value ?? "")
        .split(",")
        .map((recipient) => recipient.trim())
        .filter(Boolean);

const parseBooleanFlag = (value: string | undefined, defaultValue: boolean): boolean => {
    if (value === undefined || value.trim() === "") {
        return defaultValue;
    }

    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
};

export const getImporterConfig = (): ImporterConfig => ({
    storageBucket: process.env.IMPORT_STORAGE_BUCKET ?? "online-shop-bf396.firebasestorage.app",
    importFolder: withTrailingSlash(process.env.IMPORT_FOLDER ?? "imports/prices/"),
    historyFolder: withTrailingSlash(process.env.HISTORY_FOLDER ?? "imports/history/"),
    failureEmailEnabled: parseBooleanFlag(process.env.IMPORT_FAILURE_EMAIL_ENABLED, false),
    failureEmailRecipients: parseRecipients(process.env.IMPORT_FAILURE_EMAIL_TO),
    smtp: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM,
    },
});
