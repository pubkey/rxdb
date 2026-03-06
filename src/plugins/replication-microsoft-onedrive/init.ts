import type { OneDriveState } from './microsoft-onedrive-types.ts';
import {
    ensureFolderExists,
    listFilesInFolder,
    createEmptyFile,
    fillFileIfEtagMatches,
    readJsonFileContent
} from './microsoft-onedrive-helper.ts';
import { newRxError } from '../../rx-error.ts';
import { randomToken } from '../utils/utils-string.ts';
import { TRANSACTION_FILE_NAME } from './transaction.ts';
import { ensureNotFalsy } from '../utils/index.ts';
import { WAL_FILE_NAME } from './upstream.ts';

const NON_ALLOWED_ROOT_FOLDERS = [
    '/',
    '',
    null,
    false,
    undefined,
    'root'
];

export async function initDriveStructure(
    oneDriveState: OneDriveState
) {

    NON_ALLOWED_ROOT_FOLDERS.forEach(nonAllowed => {
        if (oneDriveState.folderPath === nonAllowed) {
            throw newRxError('ODR1', {
                folderPath: oneDriveState.folderPath
            });
        }
    });

    // root folder
    const rootFolderId = await ensureFolderExists(oneDriveState, oneDriveState.folderPath);

    const rootFolderContent = await listFilesInFolder(oneDriveState, rootFolderId);

    /**
     * Folder must either be empty
     * or already used as a RxDB onedrive sync target.
     */
    const hasRxDBJson = rootFolderContent.find((file: any) => file.name === 'rxdb.json');
    const hasOther = rootFolderContent.find((file: any) => file.name !== 'rxdb.json');
    if (hasOther && !hasRxDBJson) {
        throw newRxError('ODR9', {
            folderPath: oneDriveState.folderPath
        });
    }

    /**
     * Create rxdb.json file.
     * This must always be the first step.
     */
    const rxdbJson = await createEmptyFile(oneDriveState, rootFolderId, 'rxdb.json');
    let replicationIdentifier: string;
    if (rxdbJson.size === 0) {
        const rxdbJsonData = await fillFileIfEtagMatches<{ replicationIdentifier: string }>(
            oneDriveState,
            rxdbJson.fileId,
            rxdbJson.etag,
            { replicationIdentifier: randomToken(10) }
        );
        replicationIdentifier = ensureNotFalsy(rxdbJsonData.content).replicationIdentifier;
    } else {
        const rxdbJsonData = await readJsonFileContent<{ replicationIdentifier: string }>(
            oneDriveState,
            rxdbJson.fileId
        );
        replicationIdentifier = ensureNotFalsy(rxdbJsonData.content).replicationIdentifier;
    }


    // docs folder
    const docsFolderId = await ensureFolderExists(oneDriveState, oneDriveState.folderPath + '/docs');

    // signaling folder
    const signalingFolderId = await ensureFolderExists(oneDriveState, oneDriveState.folderPath + '/signaling');

    // transaction file
    const transactionFile = await createEmptyFile(
        oneDriveState,
        rootFolderId,
        TRANSACTION_FILE_NAME
    );

    // WAL file
    const walFile = await createEmptyFile(
        oneDriveState,
        rootFolderId,
        WAL_FILE_NAME
    );

    return {
        rootFolderId,
        docsFolderId,
        signalingFolderId,
        replicationIdentifier,
        rxdbJson,
        transactionFile,
        walFile
    };
}

export type DriveStructure = Awaited<ReturnType<typeof initDriveStructure>>;
