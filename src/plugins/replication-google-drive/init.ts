import type { DriveStructure, GoogleDriveOptionsWithDefaults } from './google-drive-types.ts';
import { ensureFolderExists, readFolder, createEmptyFile } from './google-drive-helper.ts';
import { newRxError } from '../../rx-error.ts';


export async function initDriveStructure(
    googleDriveOptions: GoogleDriveOptionsWithDefaults
): Promise<DriveStructure> {
    if (googleDriveOptions.folderPath === '/' || !googleDriveOptions.folderPath) {
        throw newRxError('GDR1', {
            folderPath: googleDriveOptions.folderPath
        });
    }

    // root folder
    const rootFolderId = await ensureFolderExists(googleDriveOptions, googleDriveOptions.folderPath);
    // console.log('DEBUG: rootFolderId', rootFolderId);

    const rootFolderContent = await readFolder(googleDriveOptions, googleDriveOptions.folderPath);
    // console.log('DEBUG: rootFolderContent', JSON.stringify(rootFolderContent));

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
     *  Create rxdb.json file.
     * This must always be the first step.
     */
    const replicationIdentifier = await createEmptyFile(googleDriveOptions, rootFolderId, 'rxdb.json');

    // docs folder
    const docsFolderId = await ensureFolderExists(googleDriveOptions, googleDriveOptions.folderPath + '/docs');

    return {
        rootFolderId,
        docsFolderId,
        replicationIdentifier
    };
}
