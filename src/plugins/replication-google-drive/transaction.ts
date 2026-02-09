import type { GoogleDriveOptionsWithDefaults } from './google-drive-types.ts';
import { createEmptyFile, deleteIfEtagMatches, ensureFolderExists, fillFileIfEtagMatches, readJsonFileContent } from './google-drive-helper.ts';
import { newRxError } from '../../rx-error.ts';
import { DriveStructure } from './init.ts';
import { now } from '../utils/index.ts';

export type DriveTransaction = {
    etag: string;
};
export type TransactionFileContent = {
    createdAt: number;
};

export const TRANSACTION_FILE_NAME = 'transaction.json';
export const TRANSACTION_BLOCKED_FLAG = {
    retry: true
} as const;

export async function startTransaction(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
): Promise<typeof TRANSACTION_BLOCKED_FLAG | DriveTransaction> {
    const txFileContent = await readJsonFileContent(
        googleDriveOptions,
        init.transactionFile.fileId
    );


    if (!isEmpty(txFileContent.content)) {
        // tx already existed -> retry
        // TODO
        console.log('tx already exsits');
        console.dir(txFileContent.content);
        return TRANSACTION_BLOCKED_FLAG;
    }


    const newTxContent: TransactionFileContent = {
        createdAt: now()
    };


    const writeResult = await fillFileIfEtagMatches<TransactionFileContent>(
        googleDriveOptions,
        init.transactionFile.fileId,
        txFileContent.etag,
        newTxContent
    );

    if (writeResult.status !== 200) {
        console.log('tx wrong status ' + writeResult.status);
        return TRANSACTION_BLOCKED_FLAG;
    }


    return {
        etag: writeResult.etag
    };
}

export async function commitTransaction(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
    transactionInput: DriveTransaction | typeof TRANSACTION_BLOCKED_FLAG
) {
    if ((transactionInput as typeof TRANSACTION_BLOCKED_FLAG).retry) {
        throw newRxError('GDR11', {
            args: {
                transaction: transactionInput
            }
        });
    }

    const transaction: DriveTransaction = transactionInput as any;
    const writeResult = await fillFileIfEtagMatches<TransactionFileContent>(
        googleDriveOptions,
        init.transactionFile.fileId,
        transaction.etag,
        undefined
    );
    if (writeResult.status !== 200) {
        throw newRxError('GDR11', {
            args: {
                status: writeResult.status,
                etag: writeResult.etag
            }
        });
    }
}



function isEmpty(value: any) {
    if (value === undefined || value === null) return true;

    if (typeof value === "string") {
        return value.length === 0;
    }

    if (typeof value === "object" && !Array.isArray(value)) {
        return Object.keys(value).length === 0;
    }

    return false;
}
