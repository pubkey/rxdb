import type { OneDriveState } from './microsoft-onedrive-types.ts';
import {
    fillFileIfEtagMatches,
    readJsonFileContent,
    getDriveBaseUrl
} from './microsoft-onedrive-helper.ts';
import { newRxError } from '../../rx-error.ts';
import { DriveStructure } from './init.ts';
import { ensureNotFalsy, now, promiseWait } from '../utils/index.ts';
import { processWalFile } from './upstream.ts';

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
    oneDriveState: OneDriveState,
    init: DriveStructure,
): Promise<typeof TRANSACTION_BLOCKED_FLAG | DriveTransaction> {
    const txFileContent = await readJsonFileContent(
        oneDriveState,
        init.transactionFile.fileId
    );

    const content = txFileContent.content;

    if (!isEmpty(content)) {
        // tx already existed -> retry
        return TRANSACTION_BLOCKED_FLAG;
    }


    const newTxContent: TransactionFileContent = {
        createdAtClientTime: now()
    };

    const writeResult = await fillFileIfEtagMatches<TransactionFileContent>(
        oneDriveState,
        init.transactionFile.fileId,
        txFileContent.etag,
        newTxContent
    );

    if (writeResult.status !== 200 && writeResult.status !== 201) {
        return TRANSACTION_BLOCKED_FLAG;
    }

    return {
        etag: writeResult.etag
    };
}

export async function startTransaction(
    oneDriveState: OneDriveState,
    init: DriveStructure,
): Promise<DriveTransaction> {
    let current = await startTransactionTryOnce(
        oneDriveState,
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
            oneDriveState,
            init
        );
        if (timeoutState.expired) {
            await fillFileIfEtagMatches<TransactionFileContent>(
                oneDriveState,
                init.transactionFile.fileId,
                timeoutState.etag,
                undefined
            );
        }

        /**
         * Try to get the transaction again
         */
        current = await startTransactionTryOnce(
            oneDriveState,
            init
        );

        attempts = attempts + 1;
    }

    return current as DriveTransaction;
}

export async function isTransactionTimedOut(
    oneDriveState: OneDriveState,
    init: DriveStructure,
) {
    const baseUrl = getDriveBaseUrl(oneDriveState);
    const request = await fetch(
        `${baseUrl}/items/${init.transactionFile.fileId}?$select=lastModifiedDateTime,eTag`,
        {
            headers: {
                Authorization: 'Bearer ' + oneDriveState.authToken
            }
        }
    );
    const data = await request.json();

    const dateHeader = request.headers.get('date');
    let serverTime = Date.parse(ensureNotFalsy(dateHeader, 'header time'));

    const transactionCreation = Date.parse(ensureNotFalsy(data.lastModifiedDateTime, 'tx time'));

    /**
     * By definition the HTTP Date header
     * only has seconds precision so if
     * the serverTime is "impossible", set it
     * to the transaction creation time.
     */
    if (serverTime < transactionCreation) {
        serverTime = transactionCreation;
    }

    const transactionAge = serverTime - transactionCreation;
    const timeLeft = (oneDriveState.transactionTimeout || 10000) - transactionAge;

    return {
        timeLeft,
        transactionAge,
        expired: timeLeft <= 0,
        etag: ensureNotFalsy(data.eTag, 'etag')
    }
}

export async function commitTransaction(
    oneDriveState: OneDriveState,
    init: DriveStructure,
    transactionInput: DriveTransaction | typeof TRANSACTION_BLOCKED_FLAG
) {
    if ((transactionInput as typeof TRANSACTION_BLOCKED_FLAG).retry) {
        throw newRxError('ODR11', {
            args: {
                transaction: transactionInput
            }
        });
    }

    const transaction: DriveTransaction = transactionInput as any;
    const writeResult = await fillFileIfEtagMatches<TransactionFileContent>(
        oneDriveState,
        init.transactionFile.fileId,
        transaction.etag,
        undefined
    );
    if (writeResult.status !== 200 && writeResult.status !== 201) {
        throw newRxError('ODR11', {
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
        if (value.type === 'Buffer' && Array.isArray(value.data) && value.data.length === 0) {
            return true;
        }
        return Object.keys(value).length === 0;
    }
    return false;
}


export async function runInTransaction<T>(
    oneDriveState: OneDriveState,
    init: DriveStructure,
    primaryPath: string,
    fn: () => Promise<T>,
    runAfter?: () => any
): Promise<T> {
    const transaction = await startTransaction(oneDriveState, init);
    await processWalFile(
        oneDriveState,
        init,
        primaryPath
    );
    const result = await fn();
    await commitTransaction(oneDriveState, init, transaction);
    if (runAfter) {
        await runAfter();
    }
    return result;
}
