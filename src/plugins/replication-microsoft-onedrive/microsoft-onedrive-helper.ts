import { newRxError, newRxFetchError } from '../../rx-error.ts';
import { ensureNotFalsy } from '../utils/index.ts';
import type {
    OneDriveState,
    OneDriveItem
} from './microsoft-onedrive-types.ts';

/**
 * Returns the base URL for Graph API calls up to the drive root.
 * Examples: 
 *   - "https://graph.microsoft.com/v1.0/me/drive" (personal / default)
 *   - "https://graph.microsoft.com/v1.0/drives/12345" 
 */
export function getDriveBaseUrl(oneDriveState: OneDriveState): string {
    const endpoint = oneDriveState.apiEndpoint || 'https://graph.microsoft.com/v1.0';
    const driveId = oneDriveState.driveId || 'me/drive';
    return `${endpoint}/${driveId}`;
}

export async function createFolder(
    oneDriveState: OneDriveState,
    parentId: string = 'root',
    folderName: string
): Promise<string> {
    const baseUrl = getDriveBaseUrl(oneDriveState);
    const url = `${baseUrl}/items/${parentId}/children`;
    const body = {
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail'
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + oneDriveState.authToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        if (response.status === 409) {
            // someone else created the same folder, return that one instead.
            const found = await findFolder(oneDriveState, parentId, folderName);
            return ensureNotFalsy(found);
        }

        throw await newRxFetchError(response, {
            folderName,
            parentId
        });
    }

    await response.json();

    const foundFolder = await findFolder(
        oneDriveState,
        parentId,
        folderName
    );

    return ensureNotFalsy(foundFolder);
}


export async function findFolder(
    oneDriveState: OneDriveState,
    parentId: string = 'root',
    folderName: string
): Promise<string | undefined> {
    const items = await listFilesInFolder(oneDriveState, parentId);
    const matchingItems = items.filter(i => i.name === folderName);

    if (matchingItems.length === 0) {
        return undefined;
    }

    // Sort by created time so older folders are picked first
    const item = matchingItems.sort((a, b) => {
        const timeA = a.createdDateTime ? new Date(a.createdDateTime).getTime() : 0;
        const timeB = b.createdDateTime ? new Date(b.createdDateTime).getTime() : 0;
        return timeA - timeB;
    })[0];

    if (!item.folder) {
        throw newRxError('ODR3', {
            folderName,
            args: {
                item
            }
        });
    }
    return item.id;
}

export async function ensureFolderExists(
    oneDriveState: OneDriveState,
    folderPath: string
): Promise<string> {
    const parts = folderPath.split('/').filter(p => p.length > 0);
    let parentId = 'root';
    for (const part of parts) {
        const newParentId = await findFolder(oneDriveState, parentId, part);
        if (newParentId) {
            parentId = newParentId
        } else {
            parentId = await createFolder(oneDriveState, parentId, part);
        }
    }
    return parentId;
}

export async function createEmptyFile(
    oneDriveState: OneDriveState,
    parentId: string,
    fileName: string
) {
    const baseUrl = getDriveBaseUrl(oneDriveState);
    const url = `${baseUrl}/items/${parentId}/children`;

    const body = {
        name: fileName,
        file: {},
        '@microsoft.graph.conflictBehavior': 'fail'
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + oneDriveState.authToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok && response.status !== 409) {
        throw await newRxFetchError(response, {
            folderName: fileName
        });
    }

    // To make idempotent, we always search for the file after creation
    // and take the oldest one in case there are duplicates.
    const items = await listFilesInFolder(oneDriveState, parentId);
    const matchingFiles = items.filter(i => i.name === fileName);
    const file = ensureNotFalsy(
        matchingFiles.sort((a, b) =>
            (a.createdDateTime ? new Date(a.createdDateTime).getTime() : 0) -
            (b.createdDateTime ? new Date(b.createdDateTime).getTime() : 0)
        )[0]
    );

    return {
        status: response.status,
        etag: ensureNotFalsy(file.eTag),
        createdTime: file.lastModifiedDateTime,
        fileId: ensureNotFalsy(file.id),
        size: file.size ? file.size : 0
    }
}


export async function fillFileIfEtagMatches<T = any>(
    oneDriveState: OneDriveState,
    fileId: string,
    etag: string,
    jsonContent?: any
): Promise<{
    status: number;
    etag: string;
    content: T | undefined;
}> {
    const baseUrl = getDriveBaseUrl(oneDriveState);
    const url = `${baseUrl}/items/${encodeURIComponent(fileId)}/content`;

    const writeContent = typeof jsonContent !== 'undefined' ? JSON.stringify(jsonContent) : '';

    const res = await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${oneDriveState.authToken}`,
            "Content-Type": "application/json; charset=utf-8",
            "If-Match": etag,
        },
        body: writeContent,
    });

    if (res.status === 412) {
        return readJsonFileContent<T>(
            oneDriveState,
            fileId
        ).then(r => {
            return {
                content: r.content,
                etag: r.etag,
                status: res.status
            };
        });
    }

    if (res.status !== 200 && res.status !== 201) {
        throw await newRxFetchError(res);
    }

    const data = await res.json();
    return {
        content: jsonContent,
        etag: ensureNotFalsy(data.eTag),
        status: res.status
    };
}

export async function deleteIfEtagMatches(
    oneDriveState: OneDriveState,
    fileId: string,
    etag: string
): Promise<void> {
    const baseUrl = getDriveBaseUrl(oneDriveState);
    const url = `${baseUrl}/items/${encodeURIComponent(fileId)}`;

    const res = await fetch(url, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${oneDriveState.authToken}`,
            // Not all item deletions in Microsoft Graph honor If-Match, but we send it.
            // As per KI, we might have to relax it for folders, but this is used for files.
            "If-Match": etag,
        },
    });

    if (!res.ok) {
        throw await newRxFetchError(res, {
            args: {
                etag,
                fileId
            }
        });
    }
}

export async function deleteFile(
    oneDriveState: OneDriveState,
    fileId: string
): Promise<void> {
    const baseUrl = getDriveBaseUrl(oneDriveState);
    const url = `${baseUrl}/items/${encodeURIComponent(fileId)}`;

    const res = await fetch(url, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${oneDriveState.authToken}`,
        },
    });

    if (!res.ok) {
        throw await newRxFetchError(res, {
            args: {
                fileId
            }
        });
    }
}

export async function readJsonFileContent<T>(
    oneDriveState: OneDriveState,
    fileId: string
): Promise<{
    etag: string;
    content: T | undefined;
}> {
    const baseUrl = getDriveBaseUrl(oneDriveState);

    // Fetch metadata FIRST to reliably get the ETag, preventing race conditions
    // where old content is fetched via /content and arbitrarily paired with a newer ETag fallback.
    const metaResponse = await fetch(
        `${baseUrl}/items/${encodeURIComponent(fileId)}?$select=id,eTag,@microsoft.graph.downloadUrl`,
        {
            headers: {
                Authorization: `Bearer ${oneDriveState.authToken}`,
            }
        }
    );

    if (!metaResponse.ok) {
        if (metaResponse.status === 404) {
            return {
                etag: '',
                content: undefined
            };
        }
        throw await newRxFetchError(metaResponse, {
            args: { fileId }
        });
    }

    const meta = await metaResponse.json();
    const etag = ensureNotFalsy(meta.eTag, 'eTag missing from metadata');
    let contentText = '';

    // Some mock servers or endpoints may omit the downloadUrl. Fallback to /content if necessary.
    const downloadUrl = meta['@microsoft.graph.downloadUrl'] || `${baseUrl}/items/${encodeURIComponent(fileId)}/content`;

    const contentRes = await fetch(downloadUrl, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${oneDriveState.authToken}`,
        }
    });

    if (contentRes.status === 200 || contentRes.status === 201) {
        contentText = await contentRes.text();
    } else if (contentRes.status !== 404) {
        throw await newRxFetchError(contentRes, {
            args: { fileId, downloadUrl }
        });
    }

    const content = contentText.length > 0 ? JSON.parse(contentText) : undefined;

    return {
        etag,
        content: content as T
    };
}

export async function listFilesInFolder(
    oneDriveState: OneDriveState,
    folderId: string
): Promise<OneDriveItem[]> {
    const baseUrl = getDriveBaseUrl(oneDriveState);
    let url: string | undefined = `${baseUrl}/items/${folderId}/children?$select=id,name,eTag,createdDateTime,lastModifiedDateTime,size,file,folder`;
    const items: OneDriveItem[] = [];

    while (url) {
        const res: Response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${oneDriveState.authToken}`,
            },
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`files.list failed: ${res.status} ${text}`);
        }

        const data: any = await res.json();
        const batch: OneDriveItem[] = data.value || [];
        items.push(...batch);

        url = data['@odata.nextLink'];
    }

    return items;
}
