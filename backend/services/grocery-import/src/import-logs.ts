import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

import type { ImportProductCsvResult } from "./import-product-csv";

export interface ImportLogContext {
    bucket: string;
    fileName: string;
    generation?: string;
    durationMs: number;
}

const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

export const writeImportLog = async (
    db: Firestore,
    payload: Record<string, unknown>,
): Promise<void> => {
    await db.collection("importLogs").add({
        ...payload,
        createdAt: FieldValue.serverTimestamp(),
    });
};

export const recordImportSuccessLog = async (
    db: Firestore,
    context: ImportLogContext,
    result: ImportProductCsvResult,
    archivedFileName: string,
): Promise<void> => {
    await writeImportLog(db, {
        bucket: context.bucket,
        fileName: context.fileName,
        generation: context.generation ?? null,
        status: "succeeded",
        result,
        archivedFileName,
        durationMs: context.durationMs,
    });
};

export const recordImportFailureLog = async (
    db: Firestore,
    context: ImportLogContext,
    error: unknown,
): Promise<void> => {
    await writeImportLog(db, {
        bucket: context.bucket,
        fileName: context.fileName,
        generation: context.generation ?? null,
        status: "failed",
        error: errorMessage(error),
        durationMs: context.durationMs,
    });
};
