import { newRxError } from '../../rx-error.ts';
import { ensureNotFalsy } from '../utils/index.ts';
import { randomToken } from '../utils/utils-string.ts';
import type { GoogleDriveOptionsWithDefaults, GoogleDriveFile } from './google-drive-types.ts';

export const DRIVE_API_VERSION = 'v3';
export const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

export async function createFolder(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    parentId: string = 'root',
    folderName: string
): Promise<string> {
    console.log('createFolder() ' + folderName + ' parent: ' + parentId);
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
): Promise<{
    fileId: string;
    etag: string;
}> {
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
        '?fields=files(id,etag,createdTime)' +
        '&orderBy=createdTime asc' +
        '&q=' + encodeURIComponent(query);
    const res = await fetch(url2, {
        headers: {
            Authorization: 'Bearer ' + googleDriveOptions.authToken,
        },
    });
    const data = await res.json();
    console.log('aaaa');
    console.dir(data);
    return ensureNotFalsy(data.files[0].id);

}


export async function updateFile(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    fileId: string,
    jsonContent: any
): Promise<void> {
    const url = googleDriveOptions.apiEndpoint + '/upload/drive/v3/files/' + fileId + '?uploadType=media';
    const body = JSON.stringify(jsonContent);

    let response;
    try {
        response = await fetch(url, {
            method: 'PATCH',
            headers: {
                Authorization: 'Bearer ' + googleDriveOptions.authToken,
                'Content-Type': 'application/json'
            },
            body
        });
    } catch (err: any) {
        throw newRxError('GDR6', {
            folderName: fileId,
            args: { err }
        });
    }

    if (!response.ok) {
        throw newRxError('GDR6', {
            folderName: fileId,
            args: {
                status: response.status,
                statusText: response.statusText,
                body: await response.text()
            }
        });
    }
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
