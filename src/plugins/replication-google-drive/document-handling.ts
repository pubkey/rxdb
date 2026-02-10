import { newRxError } from '../../rx-error.ts';
import { ensureNotFalsy } from '../utils/index.ts';
import type { GoogleDriveOptionsWithDefaults } from './google-drive-types.ts';
import { DriveStructure } from './init.ts';

const MAX_DRIVE_PAGE_SIZE = 1000;

export async function getDocumentFiles(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
    docIds: string[]
) {
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


export async function insertDocumentFiles<RxDocType>(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
    primaryPath: string,
    docs: RxDocType[]
) {
    const boundary = "batch_" + Math.random().toString(16).slice(2);

    const parts = docs.map((doc, i) => {
        const id = (doc as any)[primaryPath];
        const body = JSON.stringify({
            name: id + '.json',
            mimeType: 'application/json',
            parents: [init.docsFolderId],
        });

        return (
            `--${boundary}\r\n` +
            `Content-Type: application/http\r\n` +
            `Content-ID: <item-${i}>\r\n\r\n` +
            `POST /drive/v3/files HTTP/1.1\r\n` +
            `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
            `${body}\r\n`
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
        throw newRxError('GDR13', {
            ids: docs.map(d => (d as any)[primaryPath]),
            status: res.status,
            errorText: text
        });
    }
    return await res.text();
}

export async function updateDocumentFiles<RxDocType>(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
    primaryPath: string,
    docs: RxDocType[],
    /**
     * Must provide the corresponding Drive fileId for each doc.
     * If you only have names (like `${id}.json`), you need a lookup step first.
     */
    fileIdByDocId: Record<string, string>
) {
    const boundary = "batch_" + Math.random().toString(16).slice(2);

    const parts = docs.map((doc, i) => {
        const id = (doc as any)[primaryPath] as string;
        const fileId = ensureNotFalsy(fileIdByDocId[id]);
        const body = JSON.stringify({
            name: id + ".json",
            mimeType: "application/json",
            parents: [init.docsFolderId],
        });
        return (
            `--${boundary}\r\n` +
            `Content-Type: application/http\r\n` +
            `Content-ID: <item-${i}>\r\n\r\n` +
            `PATCH /drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true&fields=id,name,mimeType,parents HTTP/1.1\r\n` +
            `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
            `${body}\r\n`
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
        throw newRxError("GDR14", {
            ids: docs.map((d) => (d as any)[primaryPath]),
            status: res.status,
            errorText: text,
        });
    }

    return await res.text();
}
