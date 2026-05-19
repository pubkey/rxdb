import { newRxError, newRxFetchError } from '../../rx-error.ts';
import { stripAttachmentsDataFromDocument } from '../../rx-storage-helper.ts';
import { ById } from '../../types/util';
import { ensureNotFalsy } from '../utils/index.ts';
import { blobToBase64String, createBlobFromBase64 } from '../utils/index.ts';
import { insertMultipartFile } from './google-drive-helper.ts';
import type {
    DriveFileListResponse,
    GoogleDriveOptionsWithDefaults
} from './google-drive-types.ts';
import { DriveStructure } from './init.ts';

const MAX_DRIVE_PAGE_SIZE = 1000;



export async function getDocumentFiles(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
    docIds: string[]
): Promise<DriveFileListResponse> {
    const fileNames = docIds.map(id => id + '.json');
    let q = fileNames
        .map(name => `name = '${name.replace("'", "\\'")}'`)
        .join(' or ');
    q = '(' + q + ') and trashed = false';
    q += ' and \'' + init.docsFolderId + '\' in parents';
    if (docIds.length >= MAX_DRIVE_PAGE_SIZE) {
        throw newRxError('SNH');
    }
    const params = new URLSearchParams({
        q,
        pageSize: MAX_DRIVE_PAGE_SIZE + '',
        fields: "nextPageToken, files(id,name,mimeType,parents,modifiedTime,size)",
        // Shared drives support (safe to include always)
        includeItemsFromAllDrives: "true",
        supportsAllDrives: "true",
    });
    const url = googleDriveOptions.apiEndpoint + '/drive/v3/files?' + params.toString();
    const res = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${googleDriveOptions.authToken}`,
        },
    });

    if (!res.ok) {
        throw await newRxFetchError(res, {
            ids: docIds,
        });
    }

    const data = await res.json();
    return data;
}

export async function batchGetFilesMetadata(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    fileIds: string[]
) {
    const boundary = "batch_" + Math.random().toString(16).slice(2);

    const parts = fileIds.map((id, i) => {
        return (
            `--${boundary}\r\n` +
            `Content-Type: application/http\r\n` +
            `Content-ID: <item-${i}>\r\n\r\n` +
            `GET /drive/v3/files/${encodeURIComponent(id)}?` +
            `fields=id,name,mimeType,parents,modifiedTime,size&supportsAllDrives=true HTTP/1.1\r\n\r\n`
        );
    });

    const batchBody = parts.join("") + `--${boundary}--`;

    const res = await fetch(googleDriveOptions.apiEndpoint + "/batch/drive/v3", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${googleDriveOptions.authToken}`,
            "Content-Type": `multipart/mixed; boundary=${boundary}`,
        },
        body: batchBody,
    });

    if (!res.ok) {
        throw await newRxFetchError(res);
    }

    // multipart/mixed; you can parse it, or just return raw.
    return await res.text();
}

export async function insertDocumentFiles<RxDocType>(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
    primaryPath: keyof RxDocType,
    docs: RxDocType[]
) {
    // Run uploads in parallel
    await Promise.all(docs.map(async (doc) => {
        const id = (doc as any)[primaryPath];
        await insertMultipartFile(
            googleDriveOptions,
            init.docsFolderId,
            id + '.json',
            doc
        );
    }));
}

export async function updateDocumentFiles<DocType>(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    primaryPath: keyof DocType,
    docs: DocType[],
    fileMetaByDocId: Record<string, { fileId: string; etag: string }>,
    concurrency = 5
) {
    const queue = docs.slice(0);
    const results: Record<string, { id: string }> = {};

    async function worker() {
        while (queue.length) {
            const doc = queue.shift()!;
            const docId = (doc as any)[primaryPath] as string;
            const meta = ensureNotFalsy(fileMetaByDocId[docId]);
            const fileId = meta.fileId;
            const etag = meta.etag;

            const url =
                googleDriveOptions.apiEndpoint +
                `/upload/drive/v2/files/${encodeURIComponent(fileId)}` +
                `?uploadType=media&supportsAllDrives=true&fields=id`;

            const res = await fetch(url, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${googleDriveOptions.authToken}`,
                    "Content-Type": "application/json; charset=UTF-8",
                    "If-Match": etag,
                },
                body: JSON.stringify(doc),
            });

            if (res.status === 412) {
                throw newRxError('GDR20', {
                    args: {
                        docId,
                        fileId
                    }
                });
            }

            if (!res.ok) {
                throw await newRxFetchError(res, {
                    args: {
                        docId,
                        fileId
                    }
                });
            }

            results[docId] = await res.json(); // { id }
        }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    return results;
}


export async function fetchDocumentContents<DocType>(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    fileIds: string[],
    concurrency = 5
): Promise<{ byId: ById<DocType>; ordered: (DocType)[] }> {
    const byId: ById<DocType> = {};
    const ordered = new Array<DocType>(fileIds.length);
    let nextIndex = 0;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    async function fetchOne(fileId: string, attempt = 0): Promise<DocType | undefined> {
        const url =
            googleDriveOptions.apiEndpoint +
            `/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${googleDriveOptions.authToken}` },
        });

        if ([429, 500, 502, 503, 504].includes(res.status) && attempt < 4) {
            const backoffMs = 250 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
            await sleep(backoffMs);
            return fetchOne(fileId, attempt + 1);
        }

        if (!res.ok) throw await newRxFetchError(res, { args: { fileId } });

        const text = await res.text();
        return text ? (JSON.parse(text) as DocType) : undefined;
    }

    async function worker() {
        while (true) {
            const i = nextIndex++;
            if (i >= fileIds.length) return;

            const fileId = fileIds[i];
            const doc = await fetchOne(fileId);

            ordered[i] = ensureNotFalsy(doc);
            byId[fileId] = doc as any; // if ById allows undefined, remove `as any`
        }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    return { byId, ordered };
}

/**
 * Serialises attachment data in a document clone so it can safely be stored
 * as JSON in Google Drive.
 *
 * - When `serializeData` is true: Blob values are extracted and stored as
 *   base64 strings in the top-level `_attachments_data` field, while
 *   `_attachments` is stripped to clean stubs via `stripAttachmentsDataFromDocument`.
 * - When `serializeData` is false: attachment data is stripped entirely
 *   (stubs only, no `_attachments_data`), so Blob values are never serialised
 *   as `{}` by JSON.stringify.
 *
 * The function returns a NEW document object; the original is not mutated.
 */
export async function serializeDocAttachments<T>(doc: T, serializeData: boolean): Promise<T> {
    const d = doc as any;
    if (!d?._attachments) {
        return doc;
    }

    const attachmentData: Record<string, string> = {};
    if (serializeData) {
        await Promise.all(
            Object.entries(d._attachments as Record<string, any>).map(async ([id, att]) => {
                if (att.data instanceof Blob) {
                    attachmentData[id] = await blobToBase64String(att.data);
                }
            })
        );
    }

    // Strip binary data from _attachments, leaving clean stubs {digest, length, type}.
    const stripped = stripAttachmentsDataFromDocument(d) as any;

    if (serializeData && Object.keys(attachmentData).length > 0) {
        return { ...stripped, _attachments_data: attachmentData } as any;
    }
    return stripped as any;
}

/**
 * Converts attachment data stored in `_attachments_data` back to Blobs in the
 * document, so that the downstream replication protocol can write them to the
 * fork storage instance correctly.
 *
 * Mutates the document in place and removes the `_attachments_data` field.
 */
export async function deserializeDocAttachments(doc: any): Promise<void> {
    const attachmentData: Record<string, string> | undefined = doc._attachments_data;
    if (!attachmentData || !doc._attachments) {
        return;
    }
    await Promise.all(
        Object.entries(attachmentData).map(async ([id, base64]) => {
            if (doc._attachments[id]) {
                doc._attachments[id] = {
                    ...doc._attachments[id],
                    data: await createBlobFromBase64(base64, doc._attachments[id].type)
                };
            }
        })
    );
    delete doc._attachments_data;
}
