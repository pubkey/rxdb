import type {
    DriveFileMetadata,
    GoogleDriveCheckpointType,
    GoogleDriveOptionsWithDefaults
} from './google-drive-types';
import { DriveStructure } from './init.ts';

export async function fetchChanges(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
    checkpoint?: GoogleDriveCheckpointType,
    batchSize: number = 10
): Promise<{
    checkpoint: GoogleDriveCheckpointType,
    files: DriveFileMetadata[]
}> {

    const queryParts = [
        `'${init.docsFolderId}' in parents`,
        `and trashed = false`
    ];

    if (checkpoint) {
        queryParts.push(`and modifiedTime >= '${checkpoint.modifiedTime}'`);
    }

    const params = new URLSearchParams({
        q: queryParts.join(' '),
        /**
         * Intionally overfetch in case
         * multiple docs have the same modifiedTime.
         * We later have to strip the additional ones.
         */
        pageSize: (batchSize + 10) + '',
        orderBy: "modifiedTime asc,name asc",
        fields: "files(id,name,mimeType,parents,modifiedTime,size)",
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
    });

    const url =
        googleDriveOptions.apiEndpoint +
        "/drive/v3/files?" +
        params.toString();

    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${googleDriveOptions.authToken}`,
        },
    });

    return {} as any;
}
