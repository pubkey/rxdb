import { newRxFetchError } from '../../rx-error.ts';
import { ensureNotFalsy, lastOfArray } from '../utils/index.ts';
import { fetchDocumentContents } from './document-handling.ts';
import type {
    OneDriveItem,
    OneDriveCheckpointType,
    OneDriveState
} from './microsoft-onedrive-types.ts';
import { DriveStructure } from './init.ts';
import { getDriveBaseUrl } from './microsoft-onedrive-helper.ts';

export async function fetchChanges<DocType>(
    oneDriveState: OneDriveState,
    init: DriveStructure,
    checkpoint?: OneDriveCheckpointType,
    batchSize: number = 10
): Promise<{
    checkpoint: OneDriveCheckpointType | undefined,
    documents: DocType[]
}> {
    const filesResult = await fetchChangesFiles(
        oneDriveState,
        init,
        checkpoint,
        batchSize
    );

    const contents = await fetchDocumentContents<DocType>(
        oneDriveState,
        filesResult.files.map(file => file.id)
    );

    return {
        checkpoint: filesResult.checkpoint,
        documents: contents.ordered
    };
}


export async function fetchChangesFiles(
    oneDriveState: OneDriveState,
    init: DriveStructure,
    checkpoint?: OneDriveCheckpointType,
    batchSize: number = 10
): Promise<{
    checkpoint?: OneDriveCheckpointType,
    files: OneDriveItem[]
}> {

    const baseUrl = getDriveBaseUrl(oneDriveState);

    // Intentionally overfetch in case multiple docs have the same lastModifiedDateTime.
    const OVERFETCH_AMOUNT = 6;
    let url = `${baseUrl}/items/${init.docsFolderId}/children?`;

    const params = new URLSearchParams();
    params.set('$top', (batchSize + OVERFETCH_AMOUNT).toString());
    params.set('$select', 'id,name,eTag,lastModifiedDateTime,size,file');
    params.set('$orderby', 'lastModifiedDateTime asc,name asc');

    if (checkpoint) {
        // Warning: MS Graph $filter with string timestamps 
        params.set('$filter', `lastModifiedDateTime ge '${checkpoint.lastModifiedDateTime}'`);
    }

    url += params.toString();

    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${oneDriveState.authToken}`,
        },
    });

    if (!res.ok) {
        throw await newRxFetchError(res);
    }

    const data: { value: OneDriveItem[] } = await res.json();

    let files = data.value || [];
    if (checkpoint) {
        files = files.filter(file => {
            if (file.lastModifiedDateTime === checkpoint.lastModifiedDateTime) {
                // If it's the exact same time, check if we already processed it
                const docId = file.name.split('.')[0];
                return !(checkpoint as any).docIdsWithSameModifiedTime?.includes(docId);
            }
            return true;
        });
    }

    files = files.slice(0, batchSize);
    const first = files[0];

    let newCheckpoint = checkpoint;
    const last = lastOfArray(files);

    if (last) {
        const lastModified = ensureNotFalsy(last.lastModifiedDateTime);
        let docIdsWithSameModifiedTime = files
            .filter(file => file.lastModifiedDateTime === lastModified)
            .map(file => file.name.split('.')[0]);

        if (checkpoint && first && first.lastModifiedDateTime === checkpoint.lastModifiedDateTime) {
            const oldIds = (checkpoint as any).docIdsWithSameModifiedTime || [];
            docIdsWithSameModifiedTime = docIdsWithSameModifiedTime.concat(oldIds);
        }

        newCheckpoint = {
            docIdsWithSameModifiedTime,
            lastModifiedDateTime: lastModified
        } as any;
        // using 'any' to dynamically assign docIdsWithSameModifiedTime, 
        // as doing it on the type strictly might conflict with standard Checkpoint usage in RxDB.
    }

    return {
        checkpoint: newCheckpoint,
        files
    };
}
