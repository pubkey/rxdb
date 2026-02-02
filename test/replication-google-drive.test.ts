
import assert from 'assert';
import {
    ensureNotFalsy,
    addRxPlugin
} from '../plugins/core/index.mjs';
import {
    RxGoogleDriveReplicationState,
    startTransaction,
    commitTransaction,
    createFolder
} from '../plugins/replication-google-drive/index.mjs';
import { RxDBDevModePlugin } from '../plugins/dev-mode/index.mjs';
import {
    startServer
} from 'google-drive-mock';
import getPort from 'get-port';

/**
 * Whenever you change something in this file, run `npm run test:replication-google-drive` to verify that the changes are correct.
 */

describe('replication-google-drive.test.ts', function () {
    addRxPlugin(RxDBDevModePlugin);
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


    describe('createFolder', () => {
        let originalFetch: any;

        beforeEach(() => {
            originalFetch = global.fetch;
        });

        afterEach(() => {
            global.fetch = originalFetch;
        });

        it('should default to root if parentId is undefined', async () => {
            let capturedUrl: string = '';
            let capturedBody: any;

            global.fetch = async (url: any, options: any) => {
                const urlStr = url.toString();
                if (urlStr.includes('/drive/v3/files') && options.method === 'POST') {
                    capturedUrl = urlStr;
                    capturedBody = JSON.parse(options.body as string);
                    return {
                        ok: true,
                        status: 200,
                        json: async () => ({ id: 'new-folder-id', name: capturedBody.name, mimeType: 'application/vnd.google-apps.folder' })
                    } as any;
                }
                // Mock verification GET
                if (urlStr.includes('/drive/v3/files/new-folder-id') && options.method === 'GET') {
                    return {
                        ok: true,
                        status: 200,
                        json: async () => ({ id: 'new-folder-id', name: capturedBody.name, mimeType: 'application/vnd.google-apps.folder', trashed: false })
                    } as any;
                }
                return originalFetch(url, options);
            };

            const options: any = {
                oauthClientId: 'mock-client-id',
                authToken: 'valid-token',
                apiEndpoint: serverUrl,
                folderPath: 'root'
            };

            const folderId = await createFolder(options, undefined, 'test-folder');
            assert.strictEqual(folderId, 'new-folder-id');
            assert.ok(capturedBody.parents.includes('root'), 'Should have "root" in parents');
        });

        it('should handle 409 conflict by searching and returning existing ID', async () => {
            const folderName = 'conflict-folder';
            const existingId = 'existing-folder-id';
            let searchCalled = false;

            global.fetch = async (url: any, options: any) => {
                const urlStr = url.toString();
                // 1. Create -> 409
                if (urlStr.includes('/drive/v3/files') && options.method === 'POST') {
                    return {
                        ok: false,
                        status: 409,
                        statusText: 'Conflict',
                        text: async () => 'Conflict'
                    } as any;
                }
                // 2. Search -> Found
                if (urlStr.includes('q=name')) {
                    searchCalled = true;
                    // Verify query contains default parent 'root' since we pass undefined
                    assert.ok(urlStr.includes('root'), 'Query should check for parent');
                    return {
                        ok: true,
                        status: 200,
                        json: async () => ({ files: [{ id: existingId }] })
                    } as any;
                }
                return originalFetch(url, options);
            };

            const options: any = {
                oauthClientId: 'mock-client-id',
                authToken: 'valid-token',
                apiEndpoint: serverUrl,
                folderPath: 'root'
            };

            const folderId = await createFolder(options, undefined, folderName);
            assert.strictEqual(folderId, existingId);
            assert.ok(searchCalled, 'Should have called search');
        });

        it('should throw GDR5 if 409 conflict and not found after search', async () => {
            const folderName = 'ghost-folder';

            global.fetch = async (url: any, options: any) => {
                const urlStr = url.toString();
                // 1. Create -> 409
                if (urlStr.includes('/drive/v3/files') && options.method === 'POST') {
                    return {
                        ok: false,
                        status: 409,
                        statusText: 'Conflict',
                        text: async () => 'Conflict'
                    } as any;
                }
                // 2. Search -> Empty
                if (urlStr.includes('q=name')) {
                    return {
                        ok: true,
                        status: 200,
                        json: async () => ({ files: [] })
                    } as any;
                }
                return originalFetch(url, options);
            };

            const options: any = {
                oauthClientId: 'mock-client-id',
                authToken: 'valid-token',
                apiEndpoint: serverUrl,
                folderPath: 'root'
            };

            try {
                await createFolder(options, undefined, folderName);
                assert.fail('Should have thrown GDR5');
            } catch (err: any) {
                assert.strictEqual(err.code, 'GDR5');
            }
        });
    });
});
