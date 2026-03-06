import { RxReplicationWriteToMasterRow, WithDeletedAndAttachments } from '../../index.ts';
import { newRxError, newRxFetchError } from '../../rx-error.ts';
import { deepEqual, ensureNotFalsy } from '../utils/index.ts';
import { fetchDocumentContents, getDocumentFiles, insertDocumentFiles, updateDocumentFiles } from './document-handling.ts';
import { fillFileIfEtagMatches, getDriveBaseUrl } from './microsoft-onedrive-helper.ts';
import type {
    OneDriveState,
    OneDriveItem
} from './microsoft-onedrive-types.ts';
import { DriveStructure } from './init.ts';

export const WAL_FILE_NAME = 'rxdb-wal.json';

// Batch insert limit in Graph api is often not fully restricted for files unless using batch endpoints, 
// a reasonable size is 100-250 to avoid timeout.
export const DRIVE_MAX_BULK_SIZE = 250;

export async function fetchConflicts<RxDocType>(
    oneDriveState: OneDriveState,
    init: DriveStructure,
    primaryPath: keyof WithDeletedAndAttachments<RxDocType>,
    writeRows: RxReplicationWriteToMasterRow<RxDocType>[]
) {
    if (writeRows.length > DRIVE_MAX_BULK_SIZE) {
        throw newRxError('ODR18', {
            args: {
                DRIVE_MAX_BULK_SIZE
            }
        });
    }

    const ids = writeRows.map(row => (row.newDocumentState as any)[primaryPath]);
    const filesMeta = await getDocumentFiles(
        oneDriveState,
        init,
        ids as string[]
    );
    const fileIdByDocId = new Map<string, string>();
    const fileIds: string[] = filesMeta.files.map((f) => {
        const fileId = ensureNotFalsy(f.id);
        const docId = f.name.split('.')[0];
        fileIdByDocId.set(docId, fileId);
        return fileId;
    });
    const contentsByFileId = await fetchDocumentContents<WithDeletedAndAttachments<RxDocType>>(
        oneDriveState,
        fileIds
    );

    const conflicts: WithDeletedAndAttachments<RxDocType>[] = [];
    const nonConflicts: RxReplicationWriteToMasterRow<RxDocType>[] = [];
    writeRows.forEach(row => {
        const docId = (row.newDocumentState as any)[primaryPath];
        let fileContent: undefined | WithDeletedAndAttachments<RxDocType>;
        const fileId = fileIdByDocId.get(docId);
        if (fileId) {
            fileContent = contentsByFileId.byId[fileId];
        }
        if (row.assumedMasterState) {
            if (!deepEqual(row.assumedMasterState, fileContent)) {
                conflicts.push(ensureNotFalsy(fileContent));
            } else {
                nonConflicts.push(row);
            }
        } else if (fileContent) {
            conflicts.push(fileContent);
        } else {
            nonConflicts.push(row);
        }
    });

    if ((nonConflicts.length + conflicts.length) !== writeRows.length) {
        throw newRxError('SNH', {
            pushRows: writeRows,
            args: {
                nonConflicts,
                conflicts,
                contentsByFileId: contentsByFileId.byId
            }
        });
    }

    return {
        conflicts,
        nonConflicts
    };
}

export async function writeToWal<RxDocType>(
    oneDriveState: OneDriveState,
    init: DriveStructure,
    writeRows?: RxReplicationWriteToMasterRow<RxDocType>[]
) {
    const walFileId = init.walFile.fileId;
    const baseUrl = getDriveBaseUrl(oneDriveState);

    const metaUrl = `${baseUrl}/items/${encodeURIComponent(walFileId)}?$select=id,size,eTag`;
    const metaRes = await fetch(metaUrl, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${oneDriveState.authToken}`,
        },
    });
    if (!metaRes.ok) {
        throw await newRxFetchError(metaRes);
    }
    const meta: OneDriveItem = await metaRes.json();
    const sizeNum = meta.size || 0;

    if (writeRows && sizeNum > 0) {
        throw newRxError("ODR19", {
            args: {
                sizeNum,
                walFileId,
                meta,
                writeRows: writeRows?.length
            }
        });
    }

    const etag = ensureNotFalsy(meta.eTag, 'etag missing');
    const writeResult = await fillFileIfEtagMatches(
        oneDriveState,
        walFileId,
        etag,
        writeRows
    );
    if (writeResult.status !== 200 && writeResult.status !== 201) {
        throw newRxError("ODR19", {
            args: {
                walFileId,
                meta,
                writeRows: writeRows?.length
            }
        });
    }
}


export async function readWalContent<RxDocType>(
    oneDriveState: OneDriveState,
    init: DriveStructure,
): Promise<{
    etag: string;
    rows: RxReplicationWriteToMasterRow<RxDocType>[] | undefined;
}> {
    const walFileId = init.walFile.fileId;
    const baseUrl = getDriveBaseUrl(oneDriveState);
    const contentUrl = `${baseUrl}/items/${encodeURIComponent(walFileId)}/content`;

    const res = await fetch(contentUrl, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${oneDriveState.authToken}`,
        },
    });

    if (!res.ok) {
        throw await newRxFetchError(res);
    }

    let etag = res.headers.get("etag") || res.headers.get("ETag");

    if (!etag) {
        const metaRes = await fetch(`${baseUrl}/items/${encodeURIComponent(walFileId)}?$select=eTag`, {
            headers: {
                Authorization: `Bearer ${oneDriveState.authToken}`,
            }
        });
        const meta: OneDriveItem = await metaRes.json();
        etag = meta.eTag;
    }

    const text = await res.text();

    if (!text || !text.trim()) {
        return {
            etag: ensureNotFalsy(etag),
            rows: undefined
        };
    }

    return {
        etag: ensureNotFalsy(etag),
        rows: JSON.parse(text) as RxReplicationWriteToMasterRow<RxDocType>[]
    };
}


/**
 * Here we read the WAL file content
 * and sort the content into the actual
 * document files.
 * Notice that when the JavaScript process
 * exists at any point here, we need to have
 * a recoverable state on the next run. So this
 * must be idempotent.
 */
export async function processWalFile<RxDocType>(
    oneDriveState: OneDriveState,
    init: DriveStructure,
    primaryPath: keyof RxDocType
) {
    const content = await readWalContent<RxDocType>(
        oneDriveState,
        init
    );
    if (!content.rows) {
        return;
    }


    const docIds = content.rows.map(row => row.newDocumentState[primaryPath]);
    const docFiles = await getDocumentFiles(
        oneDriveState,
        init,
        docIds as string[]
    );
    const fileIdByDocId: Record<string, string> = {};

    docFiles.files.forEach(file => {
        const docId = file.name.split('.')[0] as any;
        fileIdByDocId[docId] = file.id;
    });

    const toInsert: WithDeletedAndAttachments<RxDocType>[] = [];
    const toUpdate: WithDeletedAndAttachments<RxDocType>[] = [];
    content.rows.filter(row => {
        const docId = row.newDocumentState[primaryPath];
        const fileExists = fileIdByDocId[docId as any];
        if (!fileExists) {
            toInsert.push(row.newDocumentState);
        } else {
            toUpdate.push(row.newDocumentState);
        }
    });

    await Promise.all([
        insertDocumentFiles(
            oneDriveState,
            init,
            primaryPath,
            toInsert
        ),
        updateDocumentFiles(
            oneDriveState,
            primaryPath,
            toUpdate,
            fileIdByDocId,
        )
    ]);


    // overwrite wal with emptyness
    await writeToWal(
        oneDriveState,
        init,
        undefined
    );

}

export async function handleUpstreamBatch<RxDocType>(
    oneDriveState: OneDriveState,
    init: DriveStructure,
    primaryPath: keyof WithDeletedAndAttachments<RxDocType>,
    writeRows: RxReplicationWriteToMasterRow<RxDocType>[]
): Promise<WithDeletedAndAttachments<RxDocType>[]> {
    const conflictResult = await fetchConflicts(
        oneDriveState,
        init,
        primaryPath,
        writeRows
    );
    await writeToWal(
        oneDriveState,
        init,
        conflictResult.nonConflicts
    );

    return conflictResult.conflicts;
}
