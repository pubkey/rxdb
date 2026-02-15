import type { GoogleDriveOptionsWithDefaults } from './google-drive-types.ts';
import {
    ensureFolderExists,
    readFolder,
    createEmptyFile,
    fillFileIfEtagMatches,
    readJsonFileContent
} from './google-drive-helper.ts';
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
    googleDriveOptions: GoogleDriveOptionsWithDefaults
) {

    NON_ALLOWED_ROOT_FOLDERS.forEach(nonAllowed => {
        if (googleDriveOptions.folderPath === nonAllowed) {
            throw newRxError('GDR1', {
                folderPath: googleDriveOptions.folderPath
            });
        }
    });


    // root folder
    const rootFolderId = await ensureFolderExists(googleDriveOptions, googleDriveOptions.folderPath);

    const rootFolderContent = await readFolder(googleDriveOptions, googleDriveOptions.folderPath);

    /**
     * Folder but either be empty
     * or already used as a RxDB google-drive sync target.
     */
    const hasRxDBJson = rootFolderContent.find((file: any) => file.name === 'rxdb.json');
    const hasOther = rootFolderContent.find((file: any) => file.name !== 'rxdb.json');
    if (hasOther && !hasRxDBJson) {
        throw newRxError('GDR9', {
            folderPath: googleDriveOptions.folderPath
        });
    }

    /**
     * Create rxdb.json file.
     * This must always be the first step.
     */
    const rxdbJson = await createEmptyFile(googleDriveOptions, rootFolderId, 'rxdb.json');
    let replicationIdentifier: string;
    if (rxdbJson.size === 0) {
        const rxdbJsonData = await fillFileIfEtagMatches<{ replicationIdentifier: string }>(
            googleDriveOptions,
            rxdbJson.fileId,
            rxdbJson.etag,
            { replicationIdentifier: randomToken(10) }
        );
        replicationIdentifier = rxdbJsonData.content.replicationIdentifier;
    } else {
        const rxdbJsonData = await readJsonFileContent<{ replicationIdentifier: string }>(
            googleDriveOptions,
            rxdbJson.fileId
        );
        replicationIdentifier = rxdbJsonData.content.replicationIdentifier;
    }


    // docs folder
    const docsFolderId = await ensureFolderExists(googleDriveOptions, googleDriveOptions.folderPath + '/docs');

    // transaction file
    const transactionFile = await createEmptyFile(
        googleDriveOptions,
        rootFolderId,
        TRANSACTION_FILE_NAME
    );

    // WAL file
    const walFile = await createEmptyFile(
        googleDriveOptions,
        rootFolderId,
        WAL_FILE_NAME
    );

    return {
        rootFolderId,
        docsFolderId,
        replicationIdentifier,
        rxdbJson,
        transactionFile,
        walFile
    };
}

export type DriveStructure = Awaited<ReturnType<typeof initDriveStructure>>;
