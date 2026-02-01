import type { GoogleDriveOptionsWithDefaults } from './google-drive-types.ts';
import { ensureFolderExists, ensureRootFolderExists } from './google-drive-helper.ts';

export type DriveStructure = {
    mainFolderId: string;
    docsFolderId: string;
};

export async function initDriveStructure(
    googleDriveOptions: GoogleDriveOptionsWithDefaults
): Promise<DriveStructure> {
    const driveBaseUrl = googleDriveOptions.apiEndpoint + '/drive/v3';
    const headers = {
        Authorization: 'Bearer ' + googleDriveOptions.authToken,
        'Content-Type': 'application/json'
    };

    const mainFolderId = await ensureRootFolderExists(googleDriveOptions);
    const docsFolderId = await ensureFolderExists(
        googleDriveOptions,
        googleDriveOptions.folderPath + '/rxdb-data'
    );

    // 1. Check for rxdb.json
    const qRxdb = `name = 'rxdb.json' and '${mainFolderId}' in parents and trashed = false`;
    const searchRxdbUrl = new URL(driveBaseUrl + '/files');
    searchRxdbUrl.searchParams.append('q', qRxdb);

    const searchRxdbRes = await fetch(searchRxdbUrl.toString(), {
        method: 'GET',
        headers
    });
    const searchRxdbData = await searchRxdbRes.json();

    // Client-side filtering check (needed for mock, redundant for real API but safe)
    const existingRxdbFile = (searchRxdbData.files || []).find((f: any) =>
        f.name === 'rxdb.json' &&
        f.parents && f.parents.includes(mainFolderId) &&
        !f.trashed
    );

    if (!existingRxdbFile) {
        // 2. Check if folder is empty
        const qFiles = `'${mainFolderId}' in parents and trashed = false`;
        const searchFilesUrl = new URL(driveBaseUrl + '/files');
        searchFilesUrl.searchParams.append('q', qFiles);

        const searchFilesRes = await fetch(searchFilesUrl.toString(), {
            method: 'GET',
            headers
        });
        const searchFilesData = await searchFilesRes.json();
        const filesInFolder = (searchFilesData.files || []).filter((f: any) =>
            f.parents && f.parents.includes(mainFolderId) && !f.trashed &&
            f.id !== docsFolderId // Exclude the docs folder we just created
        );

        if (filesInFolder.length > 0) {
            throw new Error('Google Drive folder is not empty and does not contain an rxdb.json file. Please pick an empty folder or a folder created by rxdb.');
        }

        // 3. Create rxdb.json
        const rxdbJsonContent = {
            title: 'RxDB Cloud Replication Folder',
            description: 'This folder allows to replicate RxDB state to Google Drive. Do not use this folder for other files.',
            link: 'https://rxdb.info/'
        };
        const metadata = {
            name: 'rxdb.json',
            parents: [mainFolderId],
            mimeType: 'application/json'
        };

        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(rxdbJsonContent) +
            close_delim;

        const createRxdbUrl = new URL(driveBaseUrl + '/files?uploadType=multipart');
        await fetch(createRxdbUrl.toString(), {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + googleDriveOptions.authToken,
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            body: multipartRequestBody
        });
    }


    return {
        mainFolderId,
        docsFolderId
    };
}
