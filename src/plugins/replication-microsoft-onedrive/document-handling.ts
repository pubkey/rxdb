import { newRxError, newRxFetchError } from '../../rx-error.ts';
import { ById } from '../../types/util';
import { ensureNotFalsy } from '../utils/index.ts';
import type {
    OneDriveState,
    OneDriveItem
} from './microsoft-onedrive-types.ts';
import { DriveStructure } from './init.ts';
import { getDriveBaseUrl, listFilesInFolder } from './microsoft-onedrive-helper.ts';

const MAX_DRIVE_PAGE_SIZE = 999;

export async function getDocumentFiles(
    oneDriveState: OneDriveState,
    init: DriveStructure,
    docIds: string[]
): Promise<{ files: OneDriveItem[] }> {

    if (docIds.length >= MAX_DRIVE_PAGE_SIZE) {
        throw newRxError('SNH');
    }

    // List all files in the docs folder and filter by name.
    // The Microsoft Graph $batch path-based lookup is not universally supported,
    // so we fetch the full folder listing and filter client-side.
    const fileNames = new Set(docIds.map(id => id + '.json'));
    const allItems = await listFilesInFolder(oneDriveState, init.docsFolderId);
    const files = allItems.filter(item => fileNames.has(item.name));

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
