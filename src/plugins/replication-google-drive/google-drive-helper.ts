import type { GoogleDriveOptions } from './google-drive-types.ts';

export async function ensureFolderExists(
    googleDriveOptions: GoogleDriveOptions
): Promise<string> {
    if (!googleDriveOptions.folderPath) {
        throw new Error('folderPath required');
    }
    const safePath = googleDriveOptions.folderPath.split('/').filter(f => f.trim().length > 0);
    if (safePath.length === 0 || (safePath.length === 1 && safePath[0] === 'root')) {
        throw new Error('folderPath must not be the root folder');
    }

    const driveBaseUrl = (googleDriveOptions.apiEndpoint || 'https://www.googleapis.com') + '/drive/v3';
    const headers = {
        Authorization: 'Bearer ' + googleDriveOptions.authToken,
        'Content-Type': 'application/json'
    };

    let parentId = 'root';

    for (const folderName of safePath) {
        // Search for folder in current parent
        const q = `name = '${folderName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const searchUrl = new URL(driveBaseUrl + '/files');
        searchUrl.searchParams.append('q', q);

        const searchRes = await fetch(searchUrl.toString(), {
            method: 'GET',
            headers
        });
        const searchData = await searchRes.json();

        const matchingFolder = (searchData.files || []).find((f: any) => {
            return f.name === folderName &&
                f.mimeType === 'application/vnd.google-apps.folder' &&
                f.parents && f.parents.includes(parentId) &&
                !f.trashed;
        });

        if (matchingFolder) {
            parentId = matchingFolder.id;
        } else {
            // Create folder
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
            parentId = fileData.id;
        }
    }
    return parentId;
}
