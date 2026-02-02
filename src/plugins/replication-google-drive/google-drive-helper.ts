import { newRxError } from '../../rx-error.ts';
import type { GoogleDriveOptionsWithDefaults } from './google-drive-types.ts';

const DRIVE_API_VERSION = 'v3';
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

export async function createFolder(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    getParentId: string | undefined,
    folderName: string
): Promise<string> {
    const parentId = getParentId ? getParentId : 'root';
    const url = googleDriveOptions.apiEndpoint + '/drive/v3/files?fields=id,name,mimeType,trashed';
    const body = {
        name: folderName,
        mimeType: FOLDER_MIME_TYPE,
        parents: [parentId]
    };

    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + googleDriveOptions.authToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
    } catch (err: any) {
        throw newRxError('GDR6', {
            folderName,
            args: { err }
        });
    }

    // Handle 409 Conflict (Concurrency)
    if (response.status === 409) {
        const query = "name = '" + folderName + "' and '" + parentId + "' in parents and trashed = false and mimeType = '" + FOLDER_MIME_TYPE + "'";
        const searchUrl = googleDriveOptions.apiEndpoint + '/drive/v3/files?fields=files(id)&q=' + encodeURIComponent(query);
        const searchResponse = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                Authorization: 'Bearer ' + googleDriveOptions.authToken
            }
        });
        const searchData = await searchResponse.json();
        if (searchData.files && searchData.files.length > 0) {
            return searchData.files[0].id;
        }
        throw newRxError('GDR5', {
            folderName,
            folderPath: folderName, // Best effort
            args: {
                status: response.status,
                statusText: response.statusText
            }
        });
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw newRxError('GDR6', {
            folderName,
            args: {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            }
        });
    }

    const data = await response.json();
    const folderId = data.id;

    if (!folderId) {
        throw newRxError('GDR7', {
            folderName,
            args: { data }
        });
    }

    /**
     * Verification:
     * Fetch the folder again to ensure it exists and has correct mime type.
     * This catches eventual consistency issues or weird API behaviors.
     */
    const verifyUrl = googleDriveOptions.apiEndpoint + '/drive/v3/files/' + folderId + '?fields=id,name,mimeType,trashed';
    let verifyResponse;
    try {
        verifyResponse = await fetch(verifyUrl, {
            method: 'GET',
            headers: {
                Authorization: 'Bearer ' + googleDriveOptions.authToken
            }
        });
    } catch (err) {
        throw newRxError('GDR6', {
            folderName,
            args: {
                step: 'verification',
                err
            }
        });
    }

    if (!verifyResponse.ok) {
        throw newRxError('GDR6', {
            folderName,
            args: {
                step: 'verification',
                status: verifyResponse.status
            }
        });
    }

    const verifyData = await verifyResponse.json();

    if (verifyData.trashed) {
        throw newRxError('GDR2', {
            folderName,
            folderPath: folderName // Best effort
        });
    }

    if (verifyData.mimeType !== FOLDER_MIME_TYPE) {
        throw newRxError('GDR3', {
            folderName,
            args: verifyData
        });
    }

    return folderId;
}

export async function ensureFolderExists(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    folderPath: string
): Promise<string> {
    if (folderPath === 'root' || folderPath === '/') {
        throw newRxError('GDR1', { folderPath });
    }
    const parts = folderPath.split('/').filter(p => p.length > 0);
    let parentId = 'root';
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
            parentId = await createFolder(googleDriveOptions, parentId, part);
        }
    }
    return parentId;
}

export async function ensureRootFolderExists(
    googleDriveOptions: GoogleDriveOptionsWithDefaults
): Promise<string> {
    if (!googleDriveOptions.folderPath) {
        throw newRxError('GDR8', {
            folderPath: ''
        });
    }
    return ensureFolderExists(googleDriveOptions, googleDriveOptions.folderPath);
}
