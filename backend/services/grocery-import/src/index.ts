import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onObjectFinalized } from "firebase-functions/v2/storage";

import { archiveCsvFile } from "./archive-csv";
import { getImporterConfig, type ImporterConfig } from "./config";
import { sendImportFailureEmail } from "./email-notifier";
import { importProductCsv } from "./import-product-csv";
import { recordImportFailureLog, recordImportSuccessLog } from "./import-logs";
import { ImportPriceFail } from "./import-price-fail";
import { errorToLogContext, logger } from "./logger";

initializeApp();

const db = getFirestore();
const triggerConfig = getImporterConfig();

export const shouldProcessStorageObject = (
    fileName: string | undefined,
    config: Pick<ImporterConfig, "importFolder" | "historyFolder">,
): fileName is string => {
    if (!fileName) {
        return false;
    }

    const normalizedName = fileName.replace(/^\/+/, "");
    const lowerName = normalizedName.toLowerCase();

    return (
        normalizedName.startsWith(config.importFolder) &&
        !normalizedName.startsWith(config.historyFolder) &&
        lowerName.endsWith(".csv")
    );
};

export const importProductCsvOnUpload = onObjectFinalized(
    {
        region: "us-east1",
        bucket: triggerConfig.storageBucket,
        retry: false,
        timeoutSeconds: 540,
        memory: "512MiB",
    },
    async (event) => {
        const startedAt = Date.now();
        const config = getImporterConfig();
        const fileName = event.data.name;
        const bucketName = event.data.bucket;

        logger.info("Received Storage finalize event", {
            bucket: bucketName,
            fileName,
            generation: event.data.generation,
            storageBucket: config.storageBucket,
            importFolder: config.importFolder,
            historyFolder: config.historyFolder,
        });

        if (!shouldProcessStorageObject(fileName, config)) {
            logger.info("Skipping Storage object because it is outside the import contract", {
                bucket: bucketName,
                fileName,
            });
            logger.info("CSV import function summary", {
                status: "skipped",
                reason: "outside_import_contract",
                bucket: bucketName,
                fileName,
                durationMs: Date.now() - startedAt,
            });
            return;
        }

        const file = getStorage().bucket(bucketName).file(fileName);
        const logContext = {
            bucket: bucketName,
            fileName,
            generation: event.data.generation ? String(event.data.generation) : undefined,
            durationMs: 0,
        };

        try {
            const importResult = await importProductCsv({ db, file });

            if (importResult.passedRowCount === 0) {
                throw new ImportPriceFail(
                    fileName,
                    new Error(
                        `All ${importResult.failedRowCount} CSV rows failed import. Details: ${JSON.stringify(importResult.failedRows)}`,
                    ),
                );
            }

            const archivedFileName = await archiveCsvFile(file, config.historyFolder);
            logContext.durationMs = Date.now() - startedAt;

            const importStatus = importResult.failedRowCount > 0 ? "partial" : "succeeded";

            await recordImportSuccessLog(db, logContext, importResult, archivedFileName, importStatus);

            logger.info("Completed CSV import process", {
                bucket: bucketName,
                fileName,
                archivedFileName,
                importStatus,
                ...importResult,
            });
            logger.info("CSV import function summary", {
                status: importStatus,
                bucket: bucketName,
                fileName,
                archivedFileName,
                totalRows: importResult.rowCount,
                passedRows: importResult.passedRowCount,
                failedRows: importResult.failedRowCount,
                failedRowDetails: importResult.failedRows,
                rowCount: importResult.rowCount,
                upsertedCount: importResult.upsertedCount,
                categoryUpsertedCount: importResult.categoryUpsertedCount,
                subCategoryUpsertedCount: importResult.subCategoryUpsertedCount,
                priceListUpsertedCount: importResult.priceListUpsertedCount,
                batchCommitCount: importResult.batchCommitCount,
                durationMs: Date.now() - startedAt,
            });
        } catch (error) {
            logContext.durationMs = Date.now() - startedAt;

            await recordImportFailureLog(db, logContext, error);

            logger.error("CSV import failed", {
                bucket: bucketName,
                fileName,
                ...errorToLogContext(error),
            });

            await sendImportFailureEmail({
                config,
                fileName,
                bucket: bucketName,
                error,
            });

            logger.info("CSV import function summary", {
                status: "failed",
                bucket: bucketName,
                fileName,
                emailRecipients: config.failureEmailRecipients,
                durationMs: Date.now() - startedAt,
                ...errorToLogContext(error),
            });

            throw new ImportPriceFail(fileName, error);
        }
    },
);
