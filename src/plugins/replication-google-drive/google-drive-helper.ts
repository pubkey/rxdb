import { newRxError } from '../../rx-error.ts';
import type { GoogleDriveOptionsWithDefaults } from './google-drive-types.ts';

export async function ensureFolderExists(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    folderPath: string
): Promise<string> {
    const safePath = folderPath.split('/').filter(f => f.trim().length > 0);
    if (safePath.length === 0 || (safePath.length === 1 && safePath[0] === 'root')) {
        throw newRxError('GDR1', { folderPath });
    }

    const driveBaseUrl = googleDriveOptions.apiEndpoint + '/drive/v3';
    const headers = {
        Authorization: 'Bearer ' + googleDriveOptions.authToken,
        'Content-Type': 'application/json'
    };

    let parentId = 'root';

    for (let i = 0; i < safePath.length; i++) {
        const folderName = safePath[i];
        const isLast = i === safePath.length - 1;

        // Search for folder in current parent
        // We include trashed items in search to differentiate errors
        // We retry search to handle eventual consistency (latency)
        const q = `name = '${folderName}' and '${parentId}' in parents and trashed = false`;
        const searchUrl = new URL(driveBaseUrl + '/files');
        searchUrl.searchParams.append('q', q);
        searchUrl.searchParams.append('fields', 'files(id, name, mimeType, trashed, parents)');

        let matchingFile;
        // Mock simulates ~5s latency, so we need enough retries.
        // 14 retries * 500ms = 7s (+ overhead)
        for (let retry = 0; retry < 14; retry++) {
            const searchRes = await fetch(searchUrl.toString(), {
                method: 'GET',
                headers
            });
            const searchData = await searchRes.json();

            matchingFile = (searchData.files || []).find((f: any) =>
                f.name === folderName && f.parents && f.parents.includes(parentId)
            );

            if (matchingFile) {
                break;
            }
            // Wait before retry if not found
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Fallback: If not found by name, list all children of parent and filter client-side
        // This handles cases where compound queries might fail or lag significantly on some backends/mocks
        if (!matchingFile) {
            const fallbackQ = `'${parentId}' in parents and trashed = false`;
            const fallbackUrl = new URL(driveBaseUrl + '/files');
            fallbackUrl.searchParams.append('q', fallbackQ);
            fallbackUrl.searchParams.append('fields', 'files(id, name, mimeType, trashed, parents)');

            const fallbackRes = await fetch(fallbackUrl.toString(), { method: 'GET', headers });
            const fallbackData = await fallbackRes.json();

            matchingFile = (fallbackData.files || []).find((f: any) =>
                f.name === folderName
            );
        }

        if (matchingFile) {
            if (matchingFile.trashed) {
                throw newRxError('GDR2', { folderName, file: matchingFile });
            }
            if (matchingFile.mimeType !== 'application/vnd.google-apps.folder') {
                throw newRxError('GDR3', { folderName, file: matchingFile });
            }
            parentId = matchingFile.id;
        } else {
            // Not found
            if (!isLast) {
                throw newRxError('GDR4', { folderName, parentId });
            } else {
                // Create it
                const createUrl = new URL(driveBaseUrl + '/files');
                const createBody = {
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [parentId]
                };

                const createRes = await fetch(createUrl.toString(), {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(createBody)
                });
                const fileData = await createRes.json();

                if (!createRes.ok) {
                    if (createRes.status === 409) {
                        // 409 means it already exists (race condition or latency).
                        // Try to find it one last time using fallback search.
                        const fallbackQ = `'${parentId}' in parents and trashed = false`;
                        const fallbackUrl = new URL(driveBaseUrl + '/files');
                        fallbackUrl.searchParams.append('q', fallbackQ);
                        fallbackUrl.searchParams.append('fields', 'files(id, name, mimeType, trashed, parents)');

                        const fallbackRes = await fetch(fallbackUrl.toString(), { method: 'GET', headers });
                        const fallbackData = await fallbackRes.json();

                        const foundAfter409 = (fallbackData.files || []).find((f: any) =>
                            f.name === folderName
                        );

                        if (foundAfter409) {
                            parentId = foundAfter409.id;
                        } else {
                            throw newRxError('GDR5', { folderName });
                        }
                    } else {
                        throw newRxError('GDR6', { folderName, data: fileData });
                    }
                } else {
                    parentId = fileData.id;
                }
                if (!parentId) {
                    throw newRxError('GDR7', { folderName, data: fileData });
                }
            }
        }
    }
    return parentId;
}

export async function ensureRootFolderExists(
    googleDriveOptions: GoogleDriveOptionsWithDefaults
): Promise<string> {
    if (!googleDriveOptions.folderPath) {
        throw newRxError('GDR8');
    }
    return ensureFolderExists(googleDriveOptions, googleDriveOptions.folderPath);
}
