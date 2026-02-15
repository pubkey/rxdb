import type { GoogleDriveOptionsWithDefaults } from './google-drive-types.ts';
import {
    createEmptyFile,
    deleteIfEtagMatches,
    ensureFolderExists,
    fillFileIfEtagMatches,
    readJsonFileContent
} from './google-drive-helper.ts';
import { newRxError } from '../../rx-error.ts';
import { DriveStructure } from './init.ts';
import { ensureNotFalsy, now, promiseWait } from '../utils/index.ts';

export type DriveTransaction = {
    etag: string;
};
export type TransactionFileContent = {
    createdAtClientTime: number;
};

export const TRANSACTION_FILE_NAME = 'transaction.json';
export const TRANSACTION_BLOCKED_FLAG = {
    retry: true
} as const;

export async function startTransactionTryOnce(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
): Promise<typeof TRANSACTION_BLOCKED_FLAG | DriveTransaction> {
    const txFileContent = await readJsonFileContent(
        googleDriveOptions,
        init.transactionFile.fileId
    );


    if (!isEmpty(txFileContent.content)) {
        // tx already existed -> retry
        return TRANSACTION_BLOCKED_FLAG;
    }


    const newTxContent: TransactionFileContent = {
        createdAtClientTime: now()
    };


    const writeResult = await fillFileIfEtagMatches<TransactionFileContent>(
        googleDriveOptions,
        init.transactionFile.fileId,
        txFileContent.etag,
        newTxContent
    );

    if (writeResult.status !== 200) {
        return TRANSACTION_BLOCKED_FLAG;
    }

    return {
        etag: writeResult.etag
    };
}

export async function startTransaction(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
): Promise<DriveTransaction> {
    let current = await startTransactionTryOnce(
        googleDriveOptions,
        init
    );

    let attempts = 0;
    while ((current as any).retry) {
        /**
         * Wait a bit.
         * Exponential backoff: 100, 200, 400, 800, ...
         */

        const waitTime = Math.min(
            100 * 1000,
            100 * Math.pow(1.5, attempts)
        );
        await promiseWait(waitTime);

        /**
         * Check for timeout
         */
        const timeoutState = await isTransactionTimedOut(
            googleDriveOptions,
            init
        );
        if (timeoutState.expired) {
            await fillFileIfEtagMatches<TransactionFileContent>(
                googleDriveOptions,
                init.transactionFile.fileId,
                timeoutState.etag,
                undefined
            );
        }


        /**
         * Try to get the transaction again
         */
        current = await startTransactionTryOnce(
            googleDriveOptions,
            init
        );

        attempts = attempts + 1;
    }

    return current as DriveTransaction;
}

export async function isTransactionTimedOut(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
) {
    const request = await fetch(
        googleDriveOptions.apiEndpoint + '/drive/v3/files/' + init.transactionFile.fileId + '?fields=modifiedTime',
        {
            headers: {
                Authorization: 'Bearer ' + googleDriveOptions.authToken
            }
        }
    );
    const data = await request.json();

    const dateHeader = request.headers.get('date');
    let serverTime = Date.parse(ensureNotFalsy(dateHeader, 'header time'));

    const transactionCreation = Date.parse(ensureNotFalsy(data.modifiedTime, 'tx time'));

    /**
     * By definition the HTTP Date header
     * only has seconds precission so if
     * the serverTime is "impossible", set it
     * to the transaction creation time.
     */
    if (serverTime < transactionCreation) {
        console.log('overwrite servertime ' + serverTime);
        serverTime = transactionCreation;
    }

    const transactionAge = serverTime - transactionCreation;
    const timeLeft = googleDriveOptions.transactionTimeout - transactionAge;

    return {
        timeLeft,
        transactionAge,
        // expired: false
        expired: timeLeft <= 0,
        etag: ensureNotFalsy(data.etag, 'etag')
    }
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
