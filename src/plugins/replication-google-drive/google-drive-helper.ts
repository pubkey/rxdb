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
): Promise<string> {
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
    if (response.status === 409) {
        const query = [
            `name = '${fileName}'`,
            `'${parentId}' in parents`,
            `trashed = false`,
        ].join(' and ');
        const url =
            googleDriveOptions.apiEndpoint + '/drive/v3/files' +
            '?fields=files(id,createdTime)' +
            '&orderBy=createdTime asc' +
            '&q=' + encodeURIComponent(query);
        const res = await fetch(url, {
            headers: {
                Authorization: 'Bearer ' + googleDriveOptions.authToken,
            },
        });
        const data = await res.json();
        return ensureNotFalsy(data.files[0].id);
    }

    if (!response.ok) {
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

    const data = await response.json();
    return data.id;
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

export async function getOrCreateRxDBJson(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    folderId: string
): Promise<string> {
    console.log('DEBUG: getOrCreateRxDBJson', folderId);
    const replicationIdentifier = randomToken(10);
    try {
        await createFileWithJSONContent(
            googleDriveOptions,
            folderId,
            'rxdb.json',
            { replicationIdentifier }
        );
        return replicationIdentifier;
    } catch (err: any) {
        const is409 = err.code === 'GDR6' &&
            err.parameters &&
            err.parameters.args &&
            err.parameters.args.status === 409;

        if (is409) {
            // Already exists -> return existing replicationIdentifier
            // We search directly in the folderId to avoid path traversal issues
            const query = "name = 'rxdb.json' and '" + folderId + "' in parents and trashed = false";
            const searchUrl = googleDriveOptions.apiEndpoint + '/drive/v3/files?fields=files(id)&q=' + encodeURIComponent(query);

            // Retry loop for eventual consistency
            for (let i = 0; i < 5; i++) {
                const searchResponse = await fetch(searchUrl, {
                    headers: {
                        Authorization: 'Bearer ' + googleDriveOptions.authToken
                    }
                });
                const searchData = await searchResponse.json();

                if (searchData.files && searchData.files.length > 0) {
                    const existingFileId = searchData.files[0].id;
                    // Download content
                    const downloadUrl = googleDriveOptions.apiEndpoint + '/drive/v3/files/' + existingFileId + '?alt=media';
                    const downRes = await fetch(downloadUrl, {
                        headers: { Authorization: 'Bearer ' + googleDriveOptions.authToken }
                    });
                    if (downRes.ok) {
                        const content = await downRes.json();
                        return content.replicationIdentifier || (content.content && content.content.replicationIdentifier);
                    }
                } else {
                    // Fallback for mocks/delayed indexing: search by name globally and filter
                    const globalQuery = "name = 'rxdb.json' and trashed = false";
                    const globalSearchUrl = googleDriveOptions.apiEndpoint + '/drive/v3/files?fields=files(id,parents)&q=' + encodeURIComponent(globalQuery);
                    const globalRes = await fetch(globalSearchUrl, {
                        headers: { Authorization: 'Bearer ' + googleDriveOptions.authToken }
                    });
                    const globalData = await globalRes.json();
                    const match = globalData.files ? globalData.files.find((f: any) => f.parents && f.parents.includes(folderId)) : null;

                    if (match) {
                        const downloadUrl = googleDriveOptions.apiEndpoint + '/drive/v3/files/' + match.id + '?alt=media';
                        const downRes = await fetch(downloadUrl, {
                            headers: { Authorization: 'Bearer ' + googleDriveOptions.authToken }
                        });
                        if (downRes.ok) {
                            const content = await downRes.json();
                            return content.replicationIdentifier || (content.content && content.content.replicationIdentifier);
                        }
                    }
                }
                // Wait before retry
                await new Promise(res => setTimeout(res, 200));
            }
        }
        throw err;
    }
}
