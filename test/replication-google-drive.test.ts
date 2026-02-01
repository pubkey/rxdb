
import assert from 'assert';
import {
    ensureNotFalsy
} from '../plugins/core/index.mjs';
import {
    RxGoogleDriveReplicationState,
    startTransaction,
    commitTransaction,
    initDriveStructure,
    ensureFolderExists
} from '../plugins/replication-google-drive/index.mjs';
import {
    startServer
} from 'google-drive-mock';
import getPort from 'get-port';

/**
 * Whenever you change something in this file, run `npm run test:replication-google-drive` to verify that the changes are correct.
 */

describe('replication-google-drive.test.ts', function () {
    this.timeout(200 * 1000);
    let server: any;
    let serverUrl: string;
    let port: number;

    before(async () => {
        port = await getPort();
        server = startServer(port);
        serverUrl = 'http://localhost:' + port;
    });

    after(async () => {
        server.close();
    });

    describe('transaction', () => {
        let options: any;
        beforeEach(() => {
            options = {
                oauthClientId: 'mock-client-id',
                authToken: 'valid-token',
                apiEndpoint: serverUrl,
                folderPath: 'test-folder-' + Math.random() // Ensure unique folder for each test if mock persists (though here we restart server or use fresh options)
            };
        });

        it('should start and commit a transaction', async () => {
            const txn = await startTransaction(options);
            assert.ok(txn);
            assert.ok(txn.fileId);
            assert.ok(txn.etag);

            await commitTransaction(options, txn);

            // Should be able to start another one
            const txn2 = await startTransaction(options);
            assert.ok(txn2);
            await commitTransaction(options, txn2);
        });

        it('should not start transaction if already running', async () => {
            const txn1 = await startTransaction(options);
            assert.ok(txn1);

            const txn2 = await startTransaction(options);
            assert.strictEqual(txn2, null); // Should be locked

            await commitTransaction(options, txn1);

            // Now it should work
            const txn3 = await startTransaction(options);
            assert.ok(txn3);
            await commitTransaction(options, txn3);
        });

        it('should throw if folderPath is missing or root', async () => {
            const invalidOptions1 = { ...options };
            delete invalidOptions1.folderPath;

            await assert.rejects(async () => {
                await startTransaction(invalidOptions1);
            }, /GDR8/);

            const invalidOptions2 = { ...options, folderPath: '/' };
            await assert.rejects(async () => {
                await startTransaction(invalidOptions2);
            }, /GDR1/);

            const invalidOptions3 = { ...options, folderPath: 'root' };
            await assert.rejects(async () => {
                await startTransaction(invalidOptions3);
            }, /GDR1/);
        });
    });
    describe('init', () => {
        let options: any;
        beforeEach(() => {
            options = {
                oauthClientId: 'mock-client-id',
                authToken: 'valid-token',
                apiEndpoint: serverUrl,
                folderPath: 'init-test-' + Math.random()
            };
        });

        it('should init structure on empty folder', async () => {
            const result = await initDriveStructure(options);
            assert.ok(result.mainFolderId, 'folderId missing');
            assert.ok(result.docsFolderId, 'docsId missing');
            assert.notStrictEqual(result.mainFolderId, result.docsFolderId);
        });

        it('should be idempotent', async () => {
            const result1 = await initDriveStructure(options);
            const result2 = await initDriveStructure(options);
            assert.strictEqual(result1.mainFolderId, result2.mainFolderId);
            assert.strictEqual(result1.docsFolderId, result2.docsFolderId);
        });

        it('should fail if folder is not empty and no rxdb.json', async () => {
            // 1. Init a folder to get ID
            const setupId = await initDriveStructure(options);

            // 2. Create a "foreign" file in a NEW folder path (simulate user picking existing folder)
            const foreignOptions = { ...options, folderPath: 'foreign-folder-' + Math.random() };
            // Manually create folder and file
            const driveBaseUrl = serverUrl + '/drive/v3';
            const headers = { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' };

            // Create folder
            const createRes = await fetch(driveBaseUrl + '/files', {
                method: 'POST',
                headers,
                body: JSON.stringify({ name: foreignOptions.folderPath.split('/')[0], mimeType: 'application/vnd.google-apps.folder', parents: ['root'] })
            });
            const folder = await createRes.json();

            // Create random file
            await fetch(driveBaseUrl + '/files', {
                method: 'POST',
                headers,
                body: JSON.stringify({ name: 'random.txt', parents: [folder.id] })
            });

            // 3. Try to init on this foreign folder
            // We need to pass the same logic (ensureFolderExists will find the existing one)
            // But our test helper uses paths.

            await assert.rejects(async () => {
                await initDriveStructure(foreignOptions);
            }, /Google Drive folder is not empty/);
        });

        it('should not crash when running in parallel', async () => {

            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(initDriveStructure(options));
            }
            await Promise.all(promises);
            // Check result
            const result = await initDriveStructure(options);
            assert.ok(result.mainFolderId);
            assert.ok(result.docsFolderId);
        });

        it('should ensureFolderExists find existing folder and NOT delete existing files', async () => {
            const folderName = 'existing-folder-' + Math.random();
            const driveBaseUrl = serverUrl + '/drive/v3';
            const headers = { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' };

            // 1. Create folder
            const createRes = await fetch(driveBaseUrl + '/files', {
                method: 'POST',
                headers,
                body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: ['root'] })
            });
            const folder = await createRes.json();
            const folderId = folder.id;

            // 2. Create file in that folder
            const fileName = 'my-file.txt';
            await fetch(driveBaseUrl + '/files', {
                method: 'POST',
                headers,
                body: JSON.stringify({ name: fileName, parents: [folderId] })
            });

            // 3. Call ensureFolderExists
            const ensuredId = await ensureFolderExists({
                oauthClientId: 'mock-client-id',
                authToken: 'valid-token',
                apiEndpoint: serverUrl,
                folderPath: folderName
            }, folderName);

            assert.strictEqual(ensuredId, folderId);

            // 4. Check if file still exists
            const searchUrl = new URL(driveBaseUrl + '/files');
            const q = `'${folderId}' in parents and name = '${fileName}' and trashed = false`;
            searchUrl.searchParams.append('q', q);

            const searchRes = await fetch(searchUrl.toString(), {
                method: 'GET',
                headers
            });
            const searchData = await searchRes.json();
            const files = (searchData.files || []).filter((f: any) => f.parents && f.parents.includes(folderId));
            assert.strictEqual(files.length, 1);
            assert.strictEqual(files[0].name, fileName);
        });
    });

});
