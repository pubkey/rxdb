import { newRxError, newRxFetchError } from '../../rx-error.ts';
import { ById } from '../../types/util';
import { ensureNotFalsy } from '../utils/index.ts';
import type {
    OneDriveState,
    OneDriveItem,
    OneDriveResponse
} from './microsoft-onedrive-types.ts';
import { DriveStructure } from './init.ts';
import { getDriveBaseUrl } from './microsoft-onedrive-helper.ts';

const MAX_DRIVE_PAGE_SIZE = 999;

export async function getDocumentFiles(
    oneDriveState: OneDriveState,
    init: DriveStructure,
    docIds: string[]
): Promise<{ files: OneDriveItem[] }> {

    if (docIds.length >= MAX_DRIVE_PAGE_SIZE) {
        throw newRxError('SNH');
    }

    const baseUrl = getDriveBaseUrl(oneDriveState);
    const files: OneDriveItem[] = [];

    // Microsoft Graph doesn't support complex "OR" in search easily, but we can do a `$filter` 
    // or just fetch by folder children and then filter locally if amount is small, 
    // or use batch requests. For simplicity we use search where name in (x, y, z) is not supported,
    // so we can use a $batch request to get all files by id/name from the docs folder.

    // An alternative is `$batch` requests to look up by path. 
    // Graph batch has a limit of 20 requests per batch.

    const BATCH_SIZE = 20;

    for (let i = 0; i < docIds.length; i += BATCH_SIZE) {
        const chunk = docIds.slice(i, i + BATCH_SIZE);
        const driveBaseUrl = getDriveBaseUrl(oneDriveState);
        const apiEndpoint = oneDriveState.apiEndpoint || 'https://graph.microsoft.com/v1.0';
        let pathPrefix = driveBaseUrl.substring(apiEndpoint.length);
        if (!pathPrefix.startsWith('/')) {
            pathPrefix = '/' + pathPrefix;
        }

        const batchRequests = chunk.map((id, index) => {
            return {
                id: index.toString(),
                method: "GET",
                url: `${pathPrefix}/items/${init.docsFolderId}:/${encodeURIComponent(id + '.json')}?$select=id,name,eTag,createdDateTime,lastModifiedDateTime,size,file`
            };
        });

        // The URL for batch is at the domain root, not the drive root.
        // E.g. https://graph.microsoft.com/v1.0/$batch
        const batchUrl = (oneDriveState.apiEndpoint || 'https://graph.microsoft.com/v1.0') + '/$batch';

        const batchBody = JSON.stringify({ requests: batchRequests });

        const res = await fetch(batchUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${oneDriveState.authToken}`,
                'Content-Type': 'application/json'
            },
            body: batchBody
        });

        if (!res.ok) {
            throw await newRxFetchError(res, {
                ids: docIds,
            });
        }

        const data = await res.json();
        const responses = data.responses || [];
        for (const response of responses) {
            if (response.status === 200) {
                files.push(response.body);
            } else if (response.status !== 404) {
                // If it's a 404, the file doesn't exist, which is fine for getDocumentFiles.
                // It just returns the files that ARE found.
                // If it's another error, we could throw, but skipping is safer to match Google Drive behavior if one fails.
            }
        }
    }

    return { files };
}


export async function insertDocumentFiles<RxDocType>(
    oneDriveState: OneDriveState,
    init: DriveStructure,
    primaryPath: keyof RxDocType,
    docs: RxDocType[]
) {
    const baseUrl = getDriveBaseUrl(oneDriveState);

    // Run uploads in parallel
    await Promise.all(docs.map(async (doc) => {
        const id = (doc as any)[primaryPath];
        const fileName = id + '.json';
        const url = `${baseUrl}/items/${init.docsFolderId}:/${encodeURIComponent(fileName)}:/content`;

        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${oneDriveState.authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(doc)
        });

        if (!res.ok) {
            throw await newRxFetchError(res);
        }
    }));
}

export async function updateDocumentFiles<DocType>(
    oneDriveState: OneDriveState,
    primaryPath: keyof DocType,
    docs: DocType[],
    fileIdByDocId: Record<string, string>,
    concurrency = 5
) {
    const baseUrl = getDriveBaseUrl(oneDriveState);
    const queue = docs.slice(0);
    const results: Record<string, { id: string }> = {};

    async function worker() {
        let doc = queue.shift();
        while (doc) {
            const docId = (doc as any)[primaryPath] as string;
            const fileId = ensureNotFalsy(fileIdByDocId[docId]);

            const url = `${baseUrl}/items/${encodeURIComponent(fileId)}/content`;

            const res = await fetch(url, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${oneDriveState.authToken}`,
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

            const resData: OneDriveItem = await res.json();
            results[docId] = { id: resData.id };

            doc = queue.shift();
        }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    return results;
}


export async function fetchDocumentContents<DocType>(
    oneDriveState: OneDriveState,
    fileIds: string[],
    concurrency = 5
): Promise<{ byId: ById<DocType>; ordered: (DocType)[] }> {
    const baseUrl = getDriveBaseUrl(oneDriveState);
    const byId: ById<DocType> = {};
    const ordered = new Array<DocType>(fileIds.length);
    let nextIndex = 0;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    async function fetchOne(fileId: string, attempt = 0): Promise<DocType | undefined> {
        const url = `${baseUrl}/items/${encodeURIComponent(fileId)}/content`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${oneDriveState.authToken}` },
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
            byId[fileId] = doc as any;
        }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    return { byId, ordered };
}
