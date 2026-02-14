import { newRxError, newRxFetchError } from '../../rx-error.ts';
import { ById } from '../../types/util';
import { ensureNotFalsy } from '../utils/index.ts';
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
    console.log(q);
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
        const text = await res.text().catch(() => "");
        throw newRxError('GDR12', {
            ids: docIds,
            status: res.status,
            errorText: text
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
        const text = await res.text().catch(() => "");
        throw newRxError("GDR18", { status: res.status, errorText: text });
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
        const content = JSON.stringify(doc); // The actual JSON content

        const metadata = {
            name: id + '.json',
            mimeType: 'application/json',
            parents: [init.docsFolderId],
        };
        const boundary = "batch_" + Math.random().toString(16).slice(2);
        const delimiter = "\r\n--" + boundary + "\r\n";
        const closeDelim = "\r\n--" + boundary + "--";
        const body =
            delimiter +
            "Content-Type: application/json\r\n\r\n" +
            JSON.stringify(metadata) +
            delimiter +
            "Content-Type: application/json\r\n\r\n" +
            content +
            closeDelim;
        const res = await fetch(googleDriveOptions.apiEndpoint + "/upload/drive/v3/files?uploadType=multipart", {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${googleDriveOptions.authToken}`,
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            body: body
        });
        if (!res.ok) {
            throw await newRxFetchError(res);
        }
    }));
}

export async function updateDocumentFiles<DocType>(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    primaryPath: keyof DocType,
    docs: DocType[],
    fileIdByDocId: Record<string, string>,
    concurrency = 5
) {
    const queue = docs.slice(0);
    const results: Record<string, { id: string }> = {};

    async function worker() {
        while (queue.length) {
            const doc = queue.shift()!;
            const docId = (doc as any)[primaryPath] as string;
            const fileId = ensureNotFalsy(fileIdByDocId[docId]);

            const url =
                googleDriveOptions.apiEndpoint +
                `/upload/drive/v3/files/${encodeURIComponent(fileId)}` +
                `?uploadType=media&supportsAllDrives=true&fields=id`;

            const res = await fetch(url, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${googleDriveOptions.authToken}`,
                    "Content-Type": "application/json; charset=UTF-8",
                },
                body: JSON.stringify(doc),
            });

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
): Promise<ById<DocType>> {
    const results: Record<string, any> = {};
    const queue = [...fileIds];

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    async function fetchOne(fileId: string, attempt = 0): Promise<any> {
        const url =
            googleDriveOptions.apiEndpoint +
            `/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${googleDriveOptions.authToken}` },
        });

        // Retry on transient errors
        if ([429, 500, 502, 503, 504].includes(res.status) && attempt < 4) {
            const backoffMs = 250 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
            await sleep(backoffMs);
            return fetchOne(fileId, attempt + 1);
        }

        if (!res.ok) {
            throw await newRxFetchError(res, {
                args: {
                    fileId
                }
            });
        }

        const content = await res.text();
        if (content) {
            return JSON.parse(content);
        } else {
            return undefined;
        }
    }

    async function worker() {
        while (queue.length) {
            const fileId = queue.shift()!;
            results[fileId] = await fetchOne(fileId);
        }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    return results;
}
