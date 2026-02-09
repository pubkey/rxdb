
import assert from 'assert';
import {
    addRxPlugin,
    ensureNotFalsy,
    randomToken
} from '../plugins/core/index.mjs';
import {
    createEmptyFile,
    ensureFolderExists,
    readFolder,
    FOLDER_MIME_TYPE,
    initDriveStructure,
    updateFile,
    fillFileIfEtagMatches,
    DriveStructure,
    startTransaction,
    commitTransaction
} from '../plugins/replication-google-drive/index.mjs';
import { RxDBDevModePlugin } from '../plugins/dev-mode/index.mjs';
import {
    startServer
} from 'google-drive-mock';
import getPort from 'get-port';
import { } from 'async-test-util';

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
        if (server) server.close();
    });

    let options: {
        oauthClientId: string;
        authToken: string;
        apiEndpoint: string;
        folderPath: string;
        initData: DriveStructure;
    };
    beforeEach(() => {
        options = {
            oauthClientId: 'mock-client-id',
            authToken: 'valid-token',
            apiEndpoint: serverUrl,
            folderPath: 'rxdb-test-folder-' + randomToken(8),
            initData: null as any
        };
    });

    describe('helpers', () => {
        describe('ensureFolderExists()', () => {
            it('should create the folder', async () => {
                const folderId = await ensureFolderExists(options, options.folderPath + '/test1/lol');
                assert.ok(folderId);
                assert.ok(folderId.length > 4);
            });
            it('create the same folder on two different parents', async () => {
                console.log('---- 0');
                const folderId = await ensureFolderExists(options, options.folderPath + '/sub1/itsme');
                console.log('---- 1');
                const folderId2 = await ensureFolderExists(options, options.folderPath + '/sub2/itsme');
                console.log('---- 2');
                assert.ok(folderId !== folderId2);
            });
            it('should use the existing folder when called twice', async () => {
                const folderId = await ensureFolderExists(options, options.folderPath + '/foo/bar/lol');
                const folderId2 = await ensureFolderExists(options, options.folderPath + '/foo/bar/lol');
                assert.deepStrictEqual(folderId, folderId2);
            });
            it('when called in parallel, it should still use the same folder', async () => {
                const results = await Promise.all(
                    new Array(10).fill(0).map(() => ensureFolderExists(options, options.folderPath + '/foo/bar/lol'))
                );
                const set = new Set(results);
                assert.strictEqual(set.size, 1);
            });
        });
        describe('createEmptyFile()', () => {
            it('should create the file', async () => {
                const parentId = await ensureFolderExists(options, options.folderPath + '/foo/bar/lol');
                const file = await createEmptyFile(
                    options,
                    parentId,
                    'empty.txt'
                );
                assert.ok(file.fileId);
                assert.ok(file.fileId.length > 4);
                assert.ok(file.etag.length > 0);
            });
            it('creating the same file twice should not create two files (series)', async () => {
                const parentId = await ensureFolderExists(options, options.folderPath + '/foo/bar/lol');
                const file = await createEmptyFile(
                    options,
                    parentId,
                    'empty.txt'
                );
                const file2 = await createEmptyFile(
                    options,
                    parentId,
                    'empty.txt'
                );
                assert.strictEqual(file.fileId, file2.fileId);
            });
            it('creating the same file twice should not create two files (parallel)', async () => {
                const parentId = await ensureFolderExists(options, options.folderPath + '/foo/bar/lol');
                const files = await Promise.all(
                    new Array(10).fill(0).map(() => createEmptyFile(
                        options,
                        parentId,
                        'empty.txt'
                    ))
                );
                const fileId = ensureNotFalsy(files[0]).fileId;
                files.forEach(file => assert.strictEqual(fileId, file.fileId));
            });
        });
        describe('fillFileIfEtagMatches()', () => {
            it('should write data into the file', async () => {
                const parentId = await ensureFolderExists(options, options.folderPath + '/foo/bar/lol');
                const file = await createEmptyFile(
                    options,
                    parentId,
                    'empty.txt'
                );
                const content = await fillFileIfEtagMatches(
                    options,
                    file.fileId,
                    file.etag,
                    {
                        foo: 'bar'
                    }
                );
                assert.strictEqual(content.foo, 'bar');
            });
        });
        describe('readFolder()', () => {
            it('should find the subfolders', async () => {
                const parentId = await ensureFolderExists(options, options.folderPath + '/foo/bar/lol');
                const fileId = await createEmptyFile(
                    options,
                    parentId,
                    'empty.txt'
                );
                const content = await readFolder(options, options.folderPath + '/foo/bar/lol');
                assert.strictEqual(content.length, 1);
                assert.strictEqual(content[0].name, 'empty.txt');
            });
        });
    });
    describe('init', () => {
        it('must not throw', async () => {
            const initData = await initDriveStructure(options);
            assert.ok(initData.replicationIdentifier);
        });
        it('calling twice must result in same identifier', async () => {
            console.log('........................... 0');
            const initData = await initDriveStructure(options);
            console.log('........................... 1');
            const initData2 = await initDriveStructure(options);
            console.log('........................... 2');
            assert.strictEqual(initData.replicationIdentifier, initData2.replicationIdentifier);
        });
        it('calling in parallel must result in same identifier', async () => {
            const result = await Promise.all(
                new Array(10).fill(0).map(() => initDriveStructure(options))
            );
            const first = result[0].replicationIdentifier;
            const firstFolderId = result[0].docsFolderId;
            result.forEach(r => assert.strictEqual(r.replicationIdentifier, first));
            result.forEach(r => assert.strictEqual(r.docsFolderId, firstFolderId));
        });
    });
    describe('transaction', () => {
        beforeEach(async () => {
            options = {
                oauthClientId: 'mock-client-id',
                authToken: 'valid-token',
                apiEndpoint: serverUrl,
                folderPath: 'test-folder-' + Math.random(),
                initData: null as any
            };
            options.initData = await initDriveStructure(options);
        });
        it('must not throw to open and close a transaction', async () => {
            console.log('------------------------------');
            const txn = await startTransaction(options, options.initData);
            console.log('START DONE!');
            await commitTransaction(options, txn);
        });
    });
    // describe('transaction', () => {
    //     let options: any;
    //     beforeEach(() => {
    //         options = {
    //             oauthClientId: 'mock-client-id',
    //             authToken: 'valid-token',
    //             apiEndpoint: serverUrl,
    //             folderPath: 'test-folder-' + Math.random() // Ensure unique folder for each test if mock persists (though here we restart server or use fresh options)
    //         };
    //     });

    //     it('should start and commit a transaction', async () => {
    //         const txn = await startTransaction(options);
    //         assert.ok(txn);
    //         assert.ok(txn.fileId);
    //         assert.ok(txn.etag);

    //         await commitTransaction(options, txn);

    //         // Should be able to start another one
    //         const txn2 = await startTransaction(options);
    //         assert.ok(txn2);
    //         await commitTransaction(options, txn2);
    //     });

    //     it('should not start transaction if already running', async () => {
    //         const txn1 = await startTransaction(options);
    //         assert.ok(txn1);

    //         const txn2 = await startTransaction(options);
    //         assert.strictEqual(txn2, null); // Should be locked

    //         await commitTransaction(options, txn1);

    //         // Now it should work
    //         const txn3 = await startTransaction(options);
    //         assert.ok(txn3);
    //         await commitTransaction(options, txn3);
    //     });

    //     it('should throw if folderPath is missing or root', async () => {
    //         const invalidOptions1 = { ...options };
    //         delete invalidOptions1.folderPath;

    //         await assert.rejects(async () => {
    //             await startTransaction(invalidOptions1);
    //         }, /GDR8/);

    //         const invalidOptions2 = { ...options, folderPath: '/' };
    //         await assert.rejects(async () => {
    //             await startTransaction(invalidOptions2);
    //         }, /GDR1/);

    //         const invalidOptions3 = { ...options, folderPath: 'root' };
    //         await assert.rejects(async () => {
    //             await startTransaction(invalidOptions3);
    //         }, /GDR1/);
    //     });
    // });



});
