import { BulkWriteRow, RxDocumentData } from '../../index.ts';
import { newRxError, newRxFetchError } from '../../rx-error.ts';
import { deepEqual, ensureNotFalsy, getFromMapOrThrow, getFromObjectOrThrow, lastOfArray } from '../utils/index.ts';
import { fetchDocumentContents, getDocumentFiles, insertDocumentFiles, updateDocumentFiles } from './document-handling.ts';
import { DRIVE_MAX_BULK_SIZE, fillFileIfEtagMatches } from './google-drive-helper.ts';
import type {
    DriveFileMetadata,
    GoogleDriveCheckpointType,
    GoogleDriveOptionsWithDefaults
} from './google-drive-types';
import { DriveStructure } from './init.ts';

export const WAL_FILE_NAME = 'rxdb-wal.json';

export async function fetchConflicts<RxDocType>(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
    primaryPath: keyof RxDocumentData<RxDocType>,
    writeRows: BulkWriteRow<RxDocType>[]
) {
    if (writeRows.length > DRIVE_MAX_BULK_SIZE) {
        throw newRxError('GDR18', {
            args: {
                DRIVE_MAX_BULK_SIZE
            }
        });
    }

    const ids = writeRows.map(row => row.document[primaryPath]);
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
    const contentsByFileId = await fetchDocumentContents<RxDocumentData<RxDocType>>(
        googleDriveOptions,
        fileIds
    );

    const conflicts: RxDocumentData<RxDocType>[] = [];
    writeRows.forEach(row => {
        const docId = row.document[primaryPath] as string;
        let fileContent: undefined | RxDocumentData<RxDocType>;
        const fileId = fileIdByDocId.get(docId);
        if (fileId) {
            fileContent = contentsByFileId[fileId];
        }
        if (row.previous) {
            if (!deepEqual(row.previous, fileContent)) {
                conflicts.push(ensureNotFalsy(fileContent));
            }
        } else if (fileContent) {
            conflicts.push(fileContent);
        }
    });

    return conflicts;
}

export async function writeToWal<RxDocType>(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
    writeRows?: BulkWriteRow<RxDocType>[]
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
    rows: BulkWriteRow<RxDocType>[] | undefined;
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
        rows: JSON.parse(text) as BulkWriteRow<RxDocType>[]
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


    const docIds = content.rows.map(row => row.document[primaryPath]);
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

    const toInsert: RxDocumentData<RxDocType>[] = [];
    const toUpdate: RxDocumentData<RxDocType>[] = [];
    content.rows.filter(row => {
        const docId = row.document[primaryPath];
        const fileExists = fileIdByDocId[docId as any];
        if (!fileExists) {
            toInsert.push(row.document);
        } else {
            toUpdate.push(row.document);
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
