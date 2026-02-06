import { newRxError } from '../../rx-error.ts';
import { ensureNotFalsy } from '../utils/index.ts';
import type { GoogleDriveOptionsWithDefaults, GoogleDriveFile } from './google-drive-types.ts';

export const DRIVE_API_VERSION = 'v3';
export const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

export async function createFolder(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    parentId: string = 'root',
    folderName: string
): Promise<string> {
    const url = googleDriveOptions.apiEndpoint + '/drive/v3/files?fields=id,name,mimeType,trashed';
    const body = {
        name: folderName,
        mimeType: FOLDER_MIME_TYPE,
        parents: [parentId]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + googleDriveOptions.authToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();

        if (response.status == 409) {
            // someone else created the same folder, return that one instead.
            const found = await findFolder(googleDriveOptions, parentId, folderName);
            return ensureNotFalsy(found);
        }

        throw newRxError('GDR6', {
            folderName,
            args: {
                call: 'createFolder',
                parentId,
                status: response.status,
                statusText: response.statusText,
                body: errorText
            }
        });
    }

    await response.json();

    /**
     * To make the function idempotent, we do not use the id from the creation-response.
     * Instead after creating the folder, we search for it again so that in case
     * some other instance created the same folder, we use the oldest one always.
     */

    const foundFolder = await findFolder(
        googleDriveOptions,
        parentId,
        folderName
    );

    return ensureNotFalsy(foundFolder);
}


export async function findFolder(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    parentId: string = 'root',
    folderName: string
): Promise<string | undefined> {
    const query = "name = '" + folderName + "' and '" + parentId + "' in parents and trashed = false and mimeType = '" + FOLDER_MIME_TYPE + "'";
    /**
     * We sort by createdTime ASC
     * so in case the same folder was created multiple times, we always pick the same
     * one which is the oldest one.
     */
    const searchUrl = googleDriveOptions.apiEndpoint + '/drive/v3/files?fields=files(id)&orderBy=createdTime asc&q=' + encodeURIComponent(query);
    const searchResponse = await fetch(searchUrl, {
        method: 'GET',
        headers: {
            Authorization: 'Bearer ' + googleDriveOptions.authToken
        }
    });
    const searchData = await searchResponse.json();

    if (searchData.files && searchData.files.length > 0) {
        const file = searchData.files[0];
        if (file.mimeType !== FOLDER_MIME_TYPE) {
            throw newRxError('GDR3', {
                folderName,
                args: file
            });
        }
        return file.id;
    } else {
        return undefined;
    }
}

export async function ensureFolderExists(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    folderPath: string
): Promise<string> {
    const parts = folderPath.split('/').filter(p => p.length > 0);
    let parentId = 'root';
    for (const part of parts) {
        const newParentId = await findFolder(googleDriveOptions, parentId, part);
        if (newParentId) {
            parentId = newParentId
        } else {
            parentId = await createFolder(googleDriveOptions, parentId, part);
        }
    }
    return parentId;
}


export async function createEmptyFile(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    parentId: string,
    fileName: string
) {
    const url = googleDriveOptions.apiEndpoint + '/drive/v3/files?fields=id';
    const body = {
        name: fileName,
        parents: [parentId],
        mimeType: 'application/json'
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + googleDriveOptions.authToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    /**
     * Do not throw on duplicates,
     * if the file is there already, find its id
     * and return that one.
     */
    if (!response.ok && response.status !== 409) {
        throw newRxError('GDR6', {
            folderName: fileName,
            args: {
                asdf: 'asdf',
                status: response.status,
                statusText: response.statusText,
                body: await response.text()
            }
        });
    }

    /**
     * For idempotent runs, fetch the file again
     * after creating it.
     */
    const query = [
        `name = '${fileName}'`,
        `'${parentId}' in parents`,
        `trashed = false`,
    ].join(' and ');
    const url2 =
        googleDriveOptions.apiEndpoint + '/drive/v3/files' +
        '?fields=files(id,etag,size,createdTime)' +
        '&orderBy=createdTime asc' +
        '&q=' + encodeURIComponent(query);
    const res = await fetch(url2, {
        headers: {
            Authorization: 'Bearer ' + googleDriveOptions.authToken,
        },
    });
    const data = await res.json();
    const file = ensureNotFalsy(data.files[0]);

    console.log('filed:');
    console.dir(file);
    return {
        etag: ensureNotFalsy(file.etag),
        fileId: ensureNotFalsy(file.id),
        size: parseInt(file.size, 10)
    }
}


export async function fillFileIfEtagMatches<T = any>(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    fileId: string,
    etag: string,
    jsonContent: any
): Promise<T> {

    const url =
        `${googleDriveOptions.apiEndpoint}` +
        `/upload/drive/v2/files/${encodeURIComponent(fileId)}` +
        `?uploadType=media`;

    const res = await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${googleDriveOptions.authToken}`,
            "Content-Type": "application/json; charset=utf-8",
            "If-Match": etag,
        },
        body: JSON.stringify(jsonContent),
    });
    console.log('write etag status ' + res.status + ' ' + fileId + ' ' + etag);

    if (res.status !== 412 && res.status !== 200) {
        const errorText = await res.text();
        throw new Error('fillFileIfEtagMatches() could not write: ' + errorText);
    }

    return readJsonFileContent<T>(
        googleDriveOptions,
        fileId
    );
}

export async function readJsonFileContent<T>(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    fileId: string
): Promise<T> {
    const url =
        `${googleDriveOptions.apiEndpoint}` +
        `/drive/v2/files/${encodeURIComponent(fileId)}?alt=media`;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${googleDriveOptions.authToken}`,
            Accept: "application/json",
        },
    });

    if (!res.ok) {
        let details: any;
        const text = await res.text().catch(() => "");
        try {
            details = text ? JSON.parse(text) : undefined;
        } catch {
            details = text || undefined;
        }

        const err = new Error(
            `Google Drive v2 read failed (${res.status}${res.statusText ? ` ${res.statusText}` : ""
            })`
        );
        (err as any).status = res.status;
        (err as any).details = details;
        throw err;
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        const err = new Error("NOT_A_JSON_FILE but " + contentType);
        (err as any).code = "NOT_A_JSON_FILE";
        (err as any).contentType = contentType;
        throw err;
    }

    const content = await res.json();
    return content as T;
}

export async function readFolder(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    folderPath: string
): Promise<GoogleDriveFile[]> {
    let parentId = 'root';
    const parts = folderPath.split('/').filter(p => p.length > 0);

    // Resolve folder path
    for (const part of parts) {
        const query = "name = '" + part + "' and '" + parentId + "' in parents and trashed = false and mimeType = '" + FOLDER_MIME_TYPE + "'";
        const searchUrl = googleDriveOptions.apiEndpoint + '/drive/v3/files?fields=files(id)&q=' + encodeURIComponent(query);
        const searchResponse = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                Authorization: 'Bearer ' + googleDriveOptions.authToken
            }
        });
        const searchData = await searchResponse.json();
        if (searchData.files && searchData.files.length > 0) {
            parentId = searchData.files[0].id;
        } else {
            throw newRxError('GDR8', { folderPath });
        }
    }

    // List children
    const query = "'" + parentId + "' in parents and trashed = false";
    const listUrl = googleDriveOptions.apiEndpoint + '/drive/v3/files?fields=files(id,name,mimeType,trashed,parents)&q=' + encodeURIComponent(query);
    const listResponse = await fetch(listUrl, {
        method: 'GET',
        headers: {
            Authorization: 'Bearer ' + googleDriveOptions.authToken
        }
    });

    if (!listResponse.ok) {
        throw newRxError('GDR6', {
            folderName: folderPath,
            args: {
                status: listResponse.status,
                statusText: listResponse.statusText
            }
        });
    }

    const listData = await listResponse.json();
    return listData.files || [];
}
