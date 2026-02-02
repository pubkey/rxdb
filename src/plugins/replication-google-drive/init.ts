import type { GoogleDriveOptionsWithDefaults } from './google-drive-types.ts';
import { ensureFolderExists, ensureRootFolderExists } from './google-drive-helper.ts';

export type DriveStructure = {
    mainFolderId: string;
    docsFolderId: string;
};

