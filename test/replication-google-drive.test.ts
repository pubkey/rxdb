
import assert from 'assert';
import {
    addRxPlugin,
    ensureNotFalsy,
    now,
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
    commitTransaction,
    startTransactionTryOnce,
    updateDocumentFiles,
    TRANSACTION_BLOCKED_FLAG,
    getDocumentFiles,
    insertDocumentFiles,
    isTransactionTimedOut,
    fetchDocumentContents,
    batchFetchDocumentContentsRaw,
    parseBatchResponse,
    fetchChanges,
    fetchConflicts,
    writeToWal,
    readWalContent,
    processWalFile
} from '../plugins/replication-google-drive/index.mjs';
import {
    schemaObjects,
    humansCollection,
    ensureReplicationHasNoErrors,
    ensureCollectionsHaveEqualState,
    SimpleHumanDocumentType,
    getPullStream,
    getPullHandler,
    getPushHandler,
    HumanDocumentType
} from '../plugins/test-utils/index.mjs';
import { RxDBDevModePlugin } from '../plugins/dev-mode/index.mjs';
import {
    startServer
} from 'google-drive-mock';
import getPort from 'get-port';
import { assertThrows, wait, waitUntil } from 'async-test-util';
import { BulkWriteRow, RxDocumentData } from '../src';

const PRIMARY_PATH = 'passportId';


function toRxDocumentData<RxDocType>(doc: RxDocType): RxDocumentData<RxDocType> {
    return Object.assign(
        {},
        doc,
        {
            _deleted: false,
            _attachments: {},
            _rev: '1-asdf',
            _meta: {
                lwt: now()
            }

        }
    );
}
function toWriteRow<RxDocType>(doc: RxDocType, previous?: RxDocType): BulkWriteRow<RxDocType> {
    const ret: BulkWriteRow<RxDocType> = {
        document: toRxDocumentData(doc),
    };
    if (previous) {
        ret.previous = toRxDocumentData(previous);
    }
    return ret;
}

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
        transactionTimeout: number;
    };
    beforeEach(() => {
        options = {
            oauthClientId: 'mock-client-id',
            authToken: 'valid-token',
            apiEndpoint: serverUrl,
            folderPath: 'rxdb-test-folder-' + randomToken(8),
            transactionTimeout: 500,
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
                assert.strictEqual(content.content.foo, 'bar');
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
        it('should throw if folderPath is missing or root', async () => {
            options.folderPath = '';
            await assertThrows(
                () => initDriveStructure(options),
                'RxError',
                'GDR1'
            );

            options.folderPath = '/';
            await assertThrows(
                () => initDriveStructure(options),
                'RxError',
                'GDR1'
            );

            options.folderPath = 'root';
            await assertThrows(
                () => initDriveStructure(options),
                'RxError',
                'GDR1'
            );

            (options as any).folderPath = undefined;
            await assertThrows(
                () => initDriveStructure(options),
                'RxError',
                'GDR1'
            );
        });
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
                transactionTimeout: 1000,
                initData: null as any
            };
            options.initData = await initDriveStructure(options);
        });
        it('must not throw to open and close a transaction', async () => {
            console.log('------------------------------');
            let txn = await startTransactionTryOnce(options, options.initData);
            console.log('START DONE 1!');
            await commitTransaction(options, options.initData, txn);
            console.log('START DONE 1.5!');
            txn = await startTransactionTryOnce(options, options.initData);
            console.dir({ txn });
            console.log('START DONE 2!');
            await commitTransaction(options, options.initData, txn);
        });
        it('should not start transaction if already running', async () => {
            console.log('.....................................');
            const txn1 = await startTransactionTryOnce(options, options.initData);
            assert.ok(!txn1.retry);

            console.log(':_________________________________');
            const txn2 = await startTransactionTryOnce(options, options.initData);
            assert.deepStrictEqual(txn2, TRANSACTION_BLOCKED_FLAG); // Should be locked

            await commitTransaction(options, options.initData, txn1);

            // Now it should work
            const txn3 = await startTransactionTryOnce(options, options.initData);
            assert.ok(txn3);
            await commitTransaction(options, options.initData, txn3);
        });
        it('isTransactionTimedOut() should be false on new transaction', async () => {
            const txn1 = await startTransactionTryOnce(options, options.initData);
            const result = await isTransactionTimedOut(
                options,
                options.initData
            );
            console.dir({ result });
            assert.strictEqual(result.expired, false, 'should not be expired');
            await commitTransaction(options, options.initData, txn1);
        });
        it('isTransactionTimedOut() should return true after some time', async () => {
            options.transactionTimeout = 100;
            await startTransactionTryOnce(options, options.initData);
            await waitUntil(async () => {
                console.log('------------------');
                const result = await isTransactionTimedOut(
                    options,
                    options.initData
                );
                return result.expired;
            }, 40000, 100);
        });
        it('should close expired transaction from other instance', async () => {
            options.transactionTimeout = 100;
            const txn1 = await startTransactionTryOnce(options, options.initData);
            /** here it should automatically wait->retry until the tx timed out */
            const txn2 = await startTransaction(options, options.initData);
            await commitTransaction(options, options.initData, txn2);
        });
        it('on parallel calls each at one point should have the tx lock', async () => {
            let parallelCount = 0;
            await Promise.all(
                new Array(3).fill(0).map(async (__, i) => {
                    console.log('(' + i + '): start');
                    const txn2 = await startTransaction(options, options.initData);
                    parallelCount = parallelCount + 1;
                    assert.strictEqual(parallelCount, 1, 'not more then one in parallel');
                    console.log('(' + i + '): have');
                    await commitTransaction(options, options.initData, txn2);
                    parallelCount = parallelCount - 1;
                    console.log('(' + i + '): close');
                })
            );
        });
        it('closing timed out in parallel should work', async () => {
            options.transactionTimeout = 100;
            await startTransaction(options, options.initData);
            await wait(options.transactionTimeout * 2);
            await Promise.all(
                new Array(3).fill(0).map(async (__, i) => {
                    console.log('b(' + i + '): start');
                    const txn2 = await startTransaction(options, options.initData);
                    console.log('b(' + i + '): have');
                    await commitTransaction(options, options.initData, txn2);
                    console.log('b(' + i + '): close');
                })
            );
        });
    });
    describe('document handling', () => {
        beforeEach(async () => {
            options = {
                oauthClientId: 'mock-client-id',
                authToken: 'valid-token',
                apiEndpoint: serverUrl,
                folderPath: 'test-folder-' + Math.random(),
                transactionTimeout: 1000,
                initData: null as any
            };
            options.initData = await initDriveStructure(options);
        });
        it('insertDocumentFiles()', async () => {
            const docs = new Array(10).fill(0).map(() => schemaObjects.humanData())
            await insertDocumentFiles(
                options,
                options.initData,
                PRIMARY_PATH,
                docs
            );
        });

        it('getDocumentFiles()', async () => {
            const docs = new Array(10).fill(0).map(() => schemaObjects.humanData())
            docs[0].passportId = 'foobar';
            await insertDocumentFiles(
                options,
                options.initData,
                PRIMARY_PATH,
                docs
            );
            const found = await getDocumentFiles(
                options,
                options.initData,
                docs.map(d => (d as any)[PRIMARY_PATH])
            );
            assert.strictEqual(found.files.length, 10);
        });
        it('fetchDocumentContents()', async () => {
            const docs = new Array(10).fill(0).map(() => schemaObjects.humanData());
            const ids = docs.map(d => (d as any)[PRIMARY_PATH]);
            await insertDocumentFiles(
                options,
                options.initData,
                PRIMARY_PATH,
                docs
            );
            const found = await getDocumentFiles(
                options,
                options.initData,
                ids
            );
            const fileIds: string[] = found.files.map((f: any) => ensureNotFalsy(f.id));
            const batchResult = await fetchDocumentContents(
                options,
                fileIds
            );
            fileIds.forEach(fileId => {
                assert.ok(batchResult[fileId].passportId);
            });
        });
        it('fetchDocumentContents() after updateDocumentFiles()', async () => {
            const docs = new Array(3).fill(0).map(() => schemaObjects.humanData());
            const ids = docs.map(d => (d as any)[PRIMARY_PATH]);
            await insertDocumentFiles(
                options,
                options.initData,
                PRIMARY_PATH,
                docs
            );
            docs.forEach(doc => doc.foo = 'bar');
            const found = await getDocumentFiles(
                options,
                options.initData,
                ids
            );
            const fileIdByDocId: any = {};
            found.files.forEach((file, i) => {
                const docId = docs[i][PRIMARY_PATH];
                fileIdByDocId[docId] = file.id;
            });
            await updateDocumentFiles(
                options,
                PRIMARY_PATH,
                docs,
                fileIdByDocId
            );
            const fileIds: string[] = found.files.map((f: any) => ensureNotFalsy(f.id));
            const batchResult = await fetchDocumentContents(
                options,
                fileIds
            );
            fileIds.forEach(fileId => {
                assert.ok(batchResult[fileId].passportId);
                assert.strictEqual(batchResult[fileId].foo, 'bar', 'must have the updated property');
            });
        });
    });
    describe('downstream', () => {
        beforeEach(async () => {
            options = {
                oauthClientId: 'mock-client-id',
                authToken: 'valid-token',
                apiEndpoint: serverUrl,
                folderPath: 'test-folder-' + Math.random(),
                transactionTimeout: 1000,
                initData: null as any
            };
            options.initData = await initDriveStructure(options);
        });
        it('fetchChanges() should get one document', async () => {
            const docs = new Array(1).fill(0).map(() => schemaObjects.humanData())
            await insertDocumentFiles(
                options,
                options.initData,
                PRIMARY_PATH,
                docs
            );
            const changes = await fetchChanges<HumanDocumentType>(
                options,
                options.initData,
                undefined,
                10
            );
            assert.strictEqual(changes.files.length, 1);
            assert.ok(changes.checkpoint);
            const first = ensureNotFalsy(changes.files[0]);
            assert.ok(first.passportId);
        });
        it('fetchChanges() should be able to iterate over the checkpoint', async () => {
            const docs = new Array(10).fill(0).map((_, i) => schemaObjects.humanData('doc-' + i))
            await insertDocumentFiles(
                options,
                options.initData,
                PRIMARY_PATH,
                docs
            );
            let lastCheckpoint;
            let totalFiles: HumanDocumentType[] = [];

            let done = false;
            let c = 0;
            while (!done) {
                c++;
                const changes = await fetchChanges<HumanDocumentType>(
                    options,
                    options.initData,
                    lastCheckpoint,
                    3
                );
                totalFiles = totalFiles.concat(changes.files);
                lastCheckpoint = changes.checkpoint;
                if (changes.files.length === 0) {
                    done = true;
                }

                if (c > 10) {
                    throw new Error('circuit breaker');
                }
            }

            assert.strictEqual(totalFiles.length, 10);
            const ids = totalFiles.map(f => f.passportId);
            docs.forEach(doc => assert.ok(ids.includes(doc.passportId), 'must have id ' + doc.passportId));

            // should not find stuff afterwards
            const changesAfter = await fetchChanges<HumanDocumentType>(
                options,
                options.initData,
                lastCheckpoint,
                3
            );
            assert.strictEqual(changesAfter.files.length, 0, 'no more changes afterwards');

            // should find changes again if added later
            await insertDocumentFiles(
                options,
                options.initData,
                PRIMARY_PATH,
                [schemaObjects.humanData('doc-after')]
            );
            const changesAfterWrite = await fetchChanges<HumanDocumentType>(
                options,
                options.initData,
                lastCheckpoint,
                3
            );
            lastCheckpoint = changesAfterWrite.checkpoint;
            assert.strictEqual(changesAfterWrite.files.length, 1, 'one more change after later insert');

            // should find the change after update
            const firstDoc = docs[0];
            firstDoc.firstName = 'updated';
            const docFiles = await getDocumentFiles(
                options,
                options.initData,
                [firstDoc.passportId]
            );
            await updateDocumentFiles(
                options,
                PRIMARY_PATH,
                [firstDoc],
                { [firstDoc.passportId]: docFiles.files[0].id }
            );

            const changesAfterUpdate = await fetchChanges<HumanDocumentType>(
                options,
                options.initData,
                lastCheckpoint,
                3
            );
            lastCheckpoint = changesAfterUpdate.checkpoint;
            assert.strictEqual(changesAfterUpdate.files.length, 1, 'one more change after update');
            console.log(JSON.stringify({ changesAfterUpdate }, null, 4));
        });
    });
    describe('upstream', () => {
        beforeEach(async () => {
            options = {
                oauthClientId: 'mock-client-id',
                authToken: 'valid-token',
                apiEndpoint: serverUrl,
                folderPath: 'test-folder-' + Math.random(),
                transactionTimeout: 1000,
                initData: null as any
            };
            options.initData = await initDriveStructure(options);
        });
        describe('fetchConflicts()', () => {
            it('should not have a conflict on inserts', async () => {
                const rows = new Array(10).fill(0).map((_, i) => toWriteRow(schemaObjects.humanData('doc-' + i)));
                const conflicts = await fetchConflicts(
                    options,
                    options.initData,
                    PRIMARY_PATH,
                    rows
                );
                assert.deepStrictEqual(conflicts, []);
            });
        });
        describe('WAL file', () => {
            it('should write to the wal file', async () => {
                const rows = new Array(10).fill(0).map((_, i) => toWriteRow(schemaObjects.humanData('doc-' + i)));
                await writeToWal(
                    options,
                    options.initData,
                    rows
                );
            });
            it('should throw on conflict', async () => {
                const rows = new Array(10).fill(0).map((_, i) => toWriteRow(schemaObjects.humanData('doc-' + i)));
                await writeToWal(
                    options,
                    options.initData,
                    rows
                );
                await assertThrows(
                    () => writeToWal(
                        options,
                        options.initData,
                        rows
                    ),
                    'RxError',
                    'GDR19'
                );
            });
            it('should read the wal content', async () => {
                const empty = await readWalContent(
                    options,
                    options.initData
                );
                assert.strictEqual(typeof empty.rows, 'undefined');
                const rows = new Array(10).fill(0).map((_, i) => toWriteRow(schemaObjects.humanData('doc-' + i)));
                await writeToWal(
                    options,
                    options.initData,
                    rows
                );
                const notEmpty = await readWalContent(
                    options,
                    options.initData
                );
                assert.deepStrictEqual(notEmpty.rows, rows);
            });
            it('should not crash processing empty wal file', async () => {
                await processWalFile(
                    options,
                    options.initData,
                    PRIMARY_PATH
                );
                await processWalFile(
                    options,
                    options.initData,
                    PRIMARY_PATH
                );
            });
            it('process a non-empty wal file with inserts', async () => {
                const rows = new Array(10).fill(0).map((_, i) => toWriteRow(schemaObjects.humanData('doc-' + i)));
                await writeToWal(
                    options,
                    options.initData,
                    rows
                );
                await processWalFile(
                    options,
                    options.initData,
                    PRIMARY_PATH
                );
                await processWalFile(
                    options,
                    options.initData,
                    PRIMARY_PATH
                );
                const rows2 = new Array(10).fill(0).map((_, i) => toWriteRow(schemaObjects.humanData('doc2-' + i)));
                await writeToWal(
                    options,
                    options.initData,
                    rows2
                );
                await processWalFile(
                    options,
                    options.initData,
                    PRIMARY_PATH
                );
            });
            it('process a non-empty wal file with updates', async () => {
                const rows = new Array(10).fill(0).map((_, i) => toWriteRow(schemaObjects.humanData('doc-' + i)));
                await writeToWal(
                    options,
                    options.initData,
                    rows
                );
                await processWalFile(
                    options,
                    options.initData,
                    PRIMARY_PATH
                );
                await processWalFile(
                    options,
                    options.initData,
                    PRIMARY_PATH
                );
                const rows2 = new Array(10).fill(0).map((_, i) => toWriteRow(schemaObjects.humanData('doc-' + i)));
                await writeToWal(
                    options,
                    options.initData,
                    rows2
                );
                await processWalFile(
                    options,
                    options.initData,
                    PRIMARY_PATH
                );
            });
        });
    });
});



