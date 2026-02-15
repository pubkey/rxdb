import { RxReplicationWriteToMasterRow, WithDeletedAndAttachments } from '../../index.ts';
import { newRxError, newRxFetchError } from '../../rx-error.ts';
import { deepEqual, ensureNotFalsy } from '../utils/index.ts';
import { fetchDocumentContents, getDocumentFiles, insertDocumentFiles, updateDocumentFiles } from './document-handling.ts';
import { DRIVE_MAX_BULK_SIZE, fillFileIfEtagMatches } from './google-drive-helper.ts';
import type {
    DriveFileMetadata,
    GoogleDriveOptionsWithDefaults
} from './google-drive-types';
import { DriveStructure } from './init.ts';
import { commitTransaction, startTransaction } from './transaction.ts';

export const WAL_FILE_NAME = 'rxdb-wal.json';

export async function fetchConflicts<RxDocType>(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
    primaryPath: keyof WithDeletedAndAttachments<RxDocType>,
    writeRows: RxReplicationWriteToMasterRow<RxDocType>[]
) {
    if (writeRows.length > DRIVE_MAX_BULK_SIZE) {
        throw newRxError('GDR18', {
            args: {
                DRIVE_MAX_BULK_SIZE
            }
        });
    }

    const ids = writeRows.map(row => (row.newDocumentState as any)[primaryPath]);
    const filesMeta = await getDocumentFiles(
        googleDriveOptions,
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
        googleDriveOptions,
        fileIds
    );

    const conflicts: WithDeletedAndAttachments<RxDocType>[] = [];
    const nonConflicts: RxReplicationWriteToMasterRow<RxDocType>[] = [];
    writeRows.forEach(row => {
        const docId = (row.newDocumentState as any)[primaryPath];
        let fileContent: undefined | WithDeletedAndAttachments<RxDocType>;
        const fileId = fileIdByDocId.get(docId);
        if (fileId) {
            fileContent = contentsByFileId[fileId];
        }
        if (row.assumedMasterState) {
            if (!deepEqual(row.assumedMasterState, fileContent)) {
                conflicts.push(ensureNotFalsy(fileContent));
            }
        } else if (fileContent) {
            conflicts.push(fileContent);
        } else {
            nonConflicts.push(row);
        }
    });

    return {
        conflicts,
        nonConflicts
    };
}

export async function writeToWal<RxDocType>(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
    writeRows?: RxReplicationWriteToMasterRow<RxDocType>[]
) {
    const walFileId = init.walFile.fileId;

    const metaUrl =
        googleDriveOptions.apiEndpoint +
        `/drive/v2/files/${encodeURIComponent(walFileId)}?` +
        new URLSearchParams({
            fields: "id,fileSize,mimeType,title,etag",
            supportsAllDrives: "true"
        }).toString();
    const metaRes = await fetch(metaUrl, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${googleDriveOptions.authToken}`,
        },
    });
    if (!metaRes.ok) {
        throw await newRxFetchError(metaRes);
    }
    const meta: DriveFileMetadata = await metaRes.json();
    const sizeStr = meta.fileSize ?? "0";
    const sizeNum = Number(sizeStr);
    if (writeRows && (!meta.fileSize || sizeNum > 0)) {
        throw newRxError("GDR19", {
            args: {
                sizeNum,
                walFileId,
                size: meta.size,
                meta,
                writeRows: writeRows?.length
            }
        });
    }

    const etag = ensureNotFalsy(metaRes.headers.get("etag"), 'etag missing');
    const writeResult = await fillFileIfEtagMatches(
        googleDriveOptions,
        walFileId,
        etag,
        writeRows
    );
    if (writeResult.status !== 200) {
        throw newRxError("GDR19", {
            args: {
                walFileId,
                meta,
                writeRows: writeRows?.length
            }
        });
    }
}


export async function readWalContent<RxDocType>(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
): Promise<{
    etag: string;
    rows: RxReplicationWriteToMasterRow<RxDocType>[] | undefined;
}> {
    const walFileId = init.walFile.fileId;
    const contentUrl =
        googleDriveOptions.apiEndpoint +
        `/drive/v2/files/${encodeURIComponent(walFileId)}?alt=media`;

    const res = await fetch(contentUrl, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${googleDriveOptions.authToken}`,
        },
    });

    if (!res.ok) {
        throw await newRxFetchError(res);
    }
    const etag = ensureNotFalsy(
        res.headers.get("etag"),
        "etag missing on WAL read"
    );

    const text = await res.text();

    // If empty or whitespace → no WAL entries
    if (!text || !text.trim()) {
        return {
            etag,
            rows: undefined
        };
    }

    return {
        etag,
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
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
    primaryPath: keyof RxDocType
) {
    const content = await readWalContent<RxDocType>(
        googleDriveOptions,
        init
    );
    if (!content.rows) {
        return;
    }


    const docIds = content.rows.map(row => row.newDocumentState[primaryPath]);
    const docFiles = await getDocumentFiles(
        googleDriveOptions,
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
            googleDriveOptions,
            init,
            primaryPath,
            toInsert
        ),
        updateDocumentFiles(
            googleDriveOptions,
            primaryPath,
            toUpdate,
            fileIdByDocId,
        )
    ]);


    // overwite wal with emptyness
    await writeToWal(
        googleDriveOptions,
        init,
        undefined
    );

}

export async function handleUpstreamBatch<RxDocType>(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
    primaryPath: keyof WithDeletedAndAttachments<RxDocType>,
    writeRows: RxReplicationWriteToMasterRow<RxDocType>[]
): Promise<WithDeletedAndAttachments<RxDocType>[]> {
    const transaction = await startTransaction(googleDriveOptions, init);
    const conflictResult = await fetchConflicts(
        googleDriveOptions,
        init,
        primaryPath,
        writeRows
    );
    await writeToWal(
        googleDriveOptions,
        init,
        conflictResult.nonConflicts
    );
    await commitTransaction(googleDriveOptions, init, transaction);

    return conflictResult.conflicts;
}
