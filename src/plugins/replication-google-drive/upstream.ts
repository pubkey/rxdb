import { BulkWriteRow, RxDocumentData } from '../../index.ts';
import { newRxError, newRxFetchError } from '../../rx-error.ts';
import { deepEqual, ensureNotFalsy, lastOfArray } from '../utils/index.ts';
import { fetchDocumentContents, getDocumentFiles } from './document-handling.ts';
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
    primaryPath: string,
    writeRows: BulkWriteRow<RxDocType>[]
) {
    if (writeRows.length > DRIVE_MAX_BULK_SIZE) {
        throw newRxError('GDR18', {
            args: {
                DRIVE_MAX_BULK_SIZE
            }
        });
    }

    const ids = writeRows.map(row => (row.document as any)[primaryPath]);
    const filesMeta = await getDocumentFiles(
        googleDriveOptions,
        init,
        ids
    );
    const fileIds: string[] = filesMeta.files.map((f: any) => ensureNotFalsy(f.id));
    const contents = await fetchDocumentContents<RxDocumentData<RxDocType>>(
        googleDriveOptions,
        fileIds
    );

    const conflicts: RxDocumentData<RxDocType>[] = [];

    writeRows.forEach(row => {
        const id: string = (row.document as any)[primaryPath];
        if (row.previous) {
            if (!deepEqual(row.previous, contents[id])) {
                conflicts.push(contents[id]);
            }
        } else if (contents[id]) {
            conflicts.push(contents[id]);
        }
    });

    return conflicts;
}

export async function writeToWal<RxDocType>(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
    writeRows: BulkWriteRow<RxDocType>[]
) {
    const walFileId = init.walFile.fileId;

    const metaUrl =
        googleDriveOptions.apiEndpoint +
        `/drive/v2/files/${encodeURIComponent(walFileId)}?` + // Changed v3 -> v2
        new URLSearchParams({
            // v2 fields: id, fileSize (was size), mimeType, title (was name), etag
            fields: "id,fileSize,mimeType,title,etag",
            supportsAllDrives: "true" // 'supportsAllDrives' is also supported in v2
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
    if (!meta.fileSize || sizeNum > 0) {
        throw newRxError("GDR19", {
            args: {
                sizeNum,
                walFileId,
                size: meta.size,
                meta
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
                meta
            }
        });
    }
}
