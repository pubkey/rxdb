import type { GoogleDriveOptionsWithDefaults } from './google-drive-types.ts';
import { createEmptyFile, deleteIfEtagMatches, ensureFolderExists } from './google-drive-helper.ts';
import { newRxError } from '../../rx-error.ts';
import { DriveStructure } from './init.ts';

export type DriveTransaction = {
    fileId: string;
    etag: string;
};

export const TRANSACTION_FILE_NAME = 'transaction.json';

export async function startTransaction(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
): Promise<{
    retry: true
} | DriveTransaction> {

    const txFile = await createEmptyFile(
        googleDriveOptions,
        init.rootFolderId,
        TRANSACTION_FILE_NAME
    );


    if (txFile.status === 409) {
        // tx already existed -> retry
        // TODO
        return {
            retry: true
        };
    }


    return {
        fileId: txFile.fileId,
        etag: txFile.etag
    }
}

export async function commitTransaction(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    transaction: DriveTransaction
) {
    await deleteIfEtagMatches(
        googleDriveOptions,
        transaction.fileId,
        transaction.etag
    );
}
