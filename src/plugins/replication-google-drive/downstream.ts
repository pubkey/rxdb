import { newRxFetchError } from '../../rx-error.ts';
import { ensureNotFalsy, lastOfArray } from '../utils/index.ts';
import { fetchDocumentContents } from './document-handling.ts';
import type {
    DriveFileMetadata,
    GoogleDriveCheckpointType,
    GoogleDriveOptionsWithDefaults
} from './google-drive-types';
import { DriveStructure } from './init.ts';

export async function fetchChanges<DocType>(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
    checkpoint?: GoogleDriveCheckpointType,
    batchSize: number = 10
): Promise<{
    checkpoint?: GoogleDriveCheckpointType,
    files: DocType[]
}> {
    const filesResult = await fetchChangesFiles(
        googleDriveOptions,
        init,
        checkpoint,
        batchSize
    );

    const contents = await fetchDocumentContents<DocType>(
        googleDriveOptions,
        filesResult.files.map(file => file.id)
    );

    return {
        checkpoint: filesResult.checkpoint,
        files: Object.values(contents)
    };
}
export async function fetchChangesFiles(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
    checkpoint?: GoogleDriveCheckpointType,
    batchSize: number = 10
): Promise<{
    checkpoint?: GoogleDriveCheckpointType,
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
    if (!res.ok) {
        throw await newRxFetchError(res);
    }

    const data: { files: DriveFileMetadata[] } = await res.json();

    let files = data.files;
    if (checkpoint) {
        files = files
            .filter(file => !(file.modifiedTime === checkpoint.modifiedTime && checkpoint.docIdsWithSameModifiedTime.includes(file.name)));
    }
    files = files.slice(0, batchSize);

    let newCheckpoint = checkpoint;
    const last = lastOfArray(files);
    if (last) {
        const lastModified = ensureNotFalsy(last.modifiedTime);
        const docIdsWithSameModifiedTime = files
            .filter(file => file.modifiedTime === lastModified)
            .map(file => file.name);
        newCheckpoint = {
            docIdsWithSameModifiedTime,
            modifiedTime: lastModified
        }
    }

    return {
        checkpoint: newCheckpoint,
        files
    };
}
