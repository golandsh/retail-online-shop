import nodemailer from "nodemailer";

import type { ImporterConfig } from "./config";
import { logger } from "./logger";

export interface FailureEmailInput {
    config: ImporterConfig;
    fileName: string;
    bucket: string;
    error: unknown;
}

const getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

const hasSmtpConfig = (config: ImporterConfig): boolean =>
    Boolean(
        config.smtp.host &&
        config.smtp.port &&
        config.smtp.user &&
        config.smtp.pass &&
        config.smtp.from,
    );

const isPlaceholderSmtpHost = (host?: string): boolean =>
    !host || host === "smtp.example.com" || host.endsWith(".example.com");

export const sendImportFailureEmail = async ({
    config,
    fileName,
    bucket,
    error,
}: FailureEmailInput): Promise<void> => {
    if (!config.failureEmailEnabled) {
        logger.info("Skipping failure email because import failure emails are disabled", {
            fileName,
            bucket,
        });
        return;
    }

    if (config.failureEmailRecipients.length === 0) {
        logger.warn("Skipping failure email because no recipients are configured", {
            fileName,
            bucket,
        });
        return;
    }

    if (!hasSmtpConfig(config)) {
        logger.warn("Skipping failure email because SMTP configuration is incomplete", {
            fileName,
            bucket,
        });
        return;
    }

    if (isPlaceholderSmtpHost(config.smtp.host)) {
        logger.warn("Skipping failure email because SMTP host is a placeholder", {
            fileName,
            bucket,
            smtpHost: config.smtp.host,
        });
        return;
    }

    logger.info("Sending import failure email", {
        fileName,
        bucket,
        recipients: config.failureEmailRecipients,
    });

    try {
        const transporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.port === 465,
            auth: {
                user: config.smtp.user,
                pass: config.smtp.pass,
            },
        });

        await transporter.sendMail({
            from: config.smtp.from,
            to: config.failureEmailRecipients,
            subject: `CSV import failed: ${fileName}`,
            text: [
                "CSV price import failed.",
                "",
                `Bucket: ${bucket}`,
                `File: ${fileName}`,
                `Error: ${getErrorMessage(error)}`,
            ].join("\n"),
        });

        logger.info("Sent import failure email", {
            fileName,
            bucket,
        });
    } catch (emailError) {
        logger.error("Failed to send import failure email", {
            fileName,
            bucket,
            errorMessage: getErrorMessage(emailError),
        });
    }
};
