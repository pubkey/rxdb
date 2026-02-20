
import assert from 'assert';
import {
    addRxPlugin,
    ensureNotFalsy,
    randomToken,
    runXTimes,
    RxCollection
} from '../plugins/core/index.mjs';
import {
    createEmptyFile,
    ensureFolderExists,
    readFolder,
    initDriveStructure,
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
    fetchChanges,
    fetchConflicts,
    writeToWal,
    readWalContent,
    processWalFile,
    listFilesInFolder,
    handleUpstreamBatch,
    GoogleDriveCheckpointType,
    SyncOptionsGoogleDrive,
    GoogleDriveOptions,
    replicateGoogleDrive,
    SignalingState,
    cleanupOldSignalingMessages,
    SignalingOptions
} from '../src/plugins/replication-google-drive/index.ts';
import config from './unit/config.ts';
import {
    schemaObjects,
    HumanDocumentType,
    ensureReplicationHasNoErrors,
    humansCollection,
    awaitCollectionsHaveEqualState,
    isNode
} from '../plugins/test-utils/index.mjs';
import { RxDBDevModePlugin } from '../plugins/dev-mode/index.mjs';
import { RxDBLeaderElectionPlugin } from '../plugins/leader-election/index.mjs';

import {
    startServer
} from 'google-drive-mock';
import getPort from 'get-port';
import { assertThrows, wait, waitUntil } from 'async-test-util';
import {
    RxReplicationWriteToMasterRow,
    WithDeletedAndAttachments
} from '../src/index.ts';
import { SimplePeerWrtc } from '../src/plugins/replication-webrtc/index.ts';
import Peer from 'simple-peer';


const PRIMARY_PATH = 'passportId';


function toRxDocumentData<RxDocType>(doc: RxDocType): WithDeletedAndAttachments<RxDocType> {
    return Object.assign(
        {},
        doc,
        {
            _deleted: false,
            _attachments: {},
        }
    );
}
function toWriteRow<RxDocType>(doc: RxDocType, assumedMasterState?: RxDocType): RxReplicationWriteToMasterRow<RxDocType> {
    const ret: RxReplicationWriteToMasterRow<RxDocType> = {
        newDocumentState: toRxDocumentData(doc),
    };
    if (assumedMasterState) {
        ret.assumedMasterState = toRxDocumentData(assumedMasterState);
    }
    return ret;
}

let wrtc: SimplePeerWrtc = 'not loaded' as any;

/**
 * Whenever you change something in this file, run `npm run test:replication-google-drive` to verify that the changes are correct.
 */
describe('replication-google-drive.test.ts', function () {
    addRxPlugin(RxDBDevModePlugin);
    addRxPlugin(RxDBLeaderElectionPlugin);
    this.timeout(200 * 1000);
    let server: any;
    let serverUrl: string;
    let port: number;

    config.storage.init?.();

    async function syncOnce(
        collection: RxCollection<any, any, any, any>,
        googleDrive: GoogleDriveOptions,
        syncOptions?: Pick<SyncOptionsGoogleDrive<any>, 'pull' | 'push'>
    ) {
        const replicationState = await replicateGoogleDrive({
            replicationIdentifier: 'foobar',
            collection,
            googleDrive,
            live: false,
            pull: syncOptions?.pull ?? {},
            push: syncOptions?.push ?? {},
        });
        ensureReplicationHasNoErrors(replicationState as any);
        await replicationState.awaitInitialReplication();
    }

    async function sync(
        collection: RxCollection<any, any, any, any>,
        googleDrive: GoogleDriveOptions,
        signalingOptions: SignalingOptions
    ) {
        const replicationState = await replicateGoogleDrive<any>({
            replicationIdentifier: 'foobar',
            collection,
            googleDrive,
            signalingOptions,
            live: true,
            pull: {},
            push: {},
        });
        ensureReplicationHasNoErrors(replicationState as any);
        await replicationState.awaitInitialReplication();
        return replicationState;
    }

    before(async () => {
        port = await getPort();
        server = startServer(port);
        serverUrl = 'http://localhost:' + port;
    });

    after(() => {
        if (server) server.close();
    });

    let options: {
        oauthClientId: string;
        authToken: string;
        apiEndpoint: string;
        folderPath: string;
        initData: DriveStructure;
        transactionTimeout: number;
        signalingOptions: SignalingOptions;
    };
    beforeEach(() => {
        options = {
            oauthClientId: 'mock-client-id',
            authToken: 'valid-token',
            apiEndpoint: serverUrl,
            folderPath: 'rxdb-test-folder-' + randomToken(8),
            transactionTimeout: 500,
            initData: null as any,
            signalingOptions: { wrtc }
        };
    });

    describe('init', () => {
        it('import WebRTC polyfills on Node.js', () => {
            if (isNode) {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                wrtc = require('wrtc');
                // // @ts-ignore
                // const wrtcModule = await import('node-datachannel/polyfill');
                // wrtc = wrtcModule.default as any;
                // const wsModule = await import('ws');
                // webSocketConstructor = wsModule.WebSocket as unknown as SimplePeerWebSocketConstructor;
            }
        });
    });

    describe('helpers', () => {
        describe('ensureFolderExists()', () => {
            it('should create the folder', async () => {
                const folderId = await ensureFolderExists(options, options.folderPath + '/test1/lol');
                assert.ok(folderId);
                assert.ok(folderId.length > 2);
            });
            it('create the same folder on two different parents', async () => {
                const folderId = await ensureFolderExists(options, options.folderPath + '/sub1/itsme');
                const folderId2 = await ensureFolderExists(options, options.folderPath + '/sub2/itsme');
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
                await createEmptyFile(
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
            const initData = await initDriveStructure(options);
            const initData2 = await initDriveStructure(options);
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
                initData: null as any,
                signalingOptions: { wrtc }
            };
            options.initData = await initDriveStructure(options);
        });
        it('must not throw to open and close a transaction', async () => {
            let txn = await startTransactionTryOnce(options, options.initData);
            await commitTransaction(options, options.initData, txn);
            txn = await startTransactionTryOnce(options, options.initData);
            await commitTransaction(options, options.initData, txn);
        });
        it('should not start transaction if already running', async () => {
            const txn1 = await startTransactionTryOnce(options, options.initData);
            assert.strictEqual(typeof (txn1 as any).retry, 'undefined');

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

            assert.strictEqual(result.expired, false, 'should not be expired');
            await commitTransaction(options, options.initData, txn1);
        });
        it('isTransactionTimedOut() should return true after some time', async () => {
            options.transactionTimeout = 100;
            await startTransactionTryOnce(options, options.initData);
            await waitUntil(async () => {
                const result = await isTransactionTimedOut(
                    options,
                    options.initData
                );
                return result.expired;
            }, 40000, 100);
        });
        it('should close expired transaction from other instance', async () => {
            options.transactionTimeout = 100;
            await startTransactionTryOnce(options, options.initData);
            /** here it should automatically wait->retry until the tx timed out */
            const txn2 = await startTransaction(options, options.initData);
            await commitTransaction(options, options.initData, txn2);
        });
        it('on parallel calls each at one point should have the tx lock', async () => {
            let parallelCount = 0;
            await Promise.all(
                new Array(3).fill(0).map(async () => {
                    const txn2 = await startTransaction(options, options.initData);
                    parallelCount = parallelCount + 1;
                    assert.strictEqual(parallelCount, 1, 'not more then one in parallel');
                    await commitTransaction(options, options.initData, txn2);
                    parallelCount = parallelCount - 1;
                })
            );
        });
        it('closing timed out in parallel should work', async () => {
            options.transactionTimeout = 100;
            await startTransaction(options, options.initData);
            await wait(options.transactionTimeout * 2);
            await Promise.all(
                new Array(3).fill(0).map(async () => {
                    const txn2 = await startTransaction(options, options.initData);
                    await commitTransaction(options, options.initData, txn2);
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
                initData: null as any,
                signalingOptions: { wrtc }
            };
            options.initData = await initDriveStructure(options);
        });
        it('insertDocumentFiles()', async () => {
            const docs = new Array(10).fill(0).map(() => schemaObjects.humanData());
            await insertDocumentFiles(
                options,
                options.initData,
                PRIMARY_PATH,
                docs
            );
        });

        it('getDocumentFiles()', async () => {
            const docs = new Array(10).fill(0).map(() => schemaObjects.humanData());
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
            const batchResult = await fetchDocumentContents<HumanDocumentType>(
                options,
                fileIds
            );
            fileIds.forEach(fileId => {
                assert.ok(batchResult.byId[fileId].passportId);
            });
        });
        it('fetchDocumentContents() after updateDocumentFiles()', async () => {
            const docs = new Array(3).fill(0).map(() => schemaObjects.humanData());
            const ids = docs.map(d => (d as any)[PRIMARY_PATH]);
            await insertDocumentFiles<any>(
                options,
                options.initData,
                PRIMARY_PATH,
                docs
            );
            docs.forEach(doc => (doc as any).foo = 'bar');
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
            const batchResult = await fetchDocumentContents<any>(
                options,
                fileIds
            );
            fileIds.forEach(fileId => {
                assert.ok(batchResult.byId[fileId].passportId);
                assert.strictEqual(batchResult.byId[fileId].foo, 'bar', 'must have the updated property');
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
                initData: null as any,
                signalingOptions: { wrtc }
            };
            options.initData = await initDriveStructure(options);
        });
        it('fetchChanges() should get one document', async () => {
            const docs = new Array(1).fill(0).map(() => schemaObjects.humanData());
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
            assert.strictEqual(changes.documents.length, 1);
            assert.ok(changes.checkpoint);
            const first = ensureNotFalsy(changes.documents[0]);
            assert.ok(first.passportId);
        });
        runXTimes(1, () => {
            it('fetchChanges() should be able to iterate over the checkpoint', async () => {
                const insertAmount = 10;
                const docs = new Array(insertAmount).fill(0).map((_, i) => schemaObjects.humanData('doc-' + i));
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
                    if (totalFiles.length > insertAmount) {
                        throw new Error('too many docs already ' + totalFiles.length);
                    }
                    c++;
                    const changesResult: {
                        checkpoint: GoogleDriveCheckpointType | undefined;
                        documents: HumanDocumentType[];
                    } = await fetchChanges<HumanDocumentType>(
                        options,
                        options.initData,
                        lastCheckpoint,
                        3
                    );
                    totalFiles = totalFiles.concat(changesResult.documents);
                    lastCheckpoint = changesResult.checkpoint;
                    if (changesResult.documents.length === 0) {
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
                assert.strictEqual(changesAfter.documents.length, 0, 'no more changes afterwards');

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
                assert.strictEqual(changesAfterWrite.documents.length, 1, 'one more change after later insert');

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
                // lastCheckpoint = changesAfterUpdate.checkpoint;
                assert.strictEqual(changesAfterUpdate.documents.length, 1, 'one more change after update');
            });
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
                initData: null as any,
                signalingOptions: { wrtc }
            };
            options.initData = await initDriveStructure(options);
        });
        describe('fetchConflicts()', () => {
            it('should not have a conflict on inserts', async () => {
                const rows = new Array(10).fill(0).map((_, i) => toWriteRow(schemaObjects.humanData('doc-' + i)));
                const conflictResult = await fetchConflicts(
                    options,
                    options.initData,
                    PRIMARY_PATH,
                    rows
                );
                assert.deepStrictEqual(conflictResult.conflicts, []);
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
                let docsFiles = await listFilesInFolder(
                    options,
                    options.initData.docsFolderId
                );
                assert.strictEqual(docsFiles.length, 10);
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
                docsFiles = await listFilesInFolder(
                    options,
                    options.initData.docsFolderId
                );
                assert.strictEqual(docsFiles.length, 20);
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
                let docsFiles = await listFilesInFolder(
                    options,
                    options.initData.docsFolderId
                );
                assert.strictEqual(docsFiles.length, 10);

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
                docsFiles = await listFilesInFolder(
                    options,
                    options.initData.docsFolderId
                );
                assert.strictEqual(docsFiles.length, 10);
            });
        });
        describe('full push batch', () => {
            it('should process a full batch with conflict handling', async () => {
                const docs = new Array(3).fill(0).map((_, i) => schemaObjects.humanData('doc-' + i, 1));
                const rows = docs.map(d => toWriteRow(d));
                await handleUpstreamBatch(
                    options,
                    options.initData,
                    PRIMARY_PATH,
                    rows
                );
                await processWalFile(
                    options,
                    options.initData,
                    PRIMARY_PATH
                );

                const docs2 = new Array(3).fill(0).map((_, i) => schemaObjects.humanData('doc-' + i, 2));
                const rows2 = docs2.map(d => toWriteRow(d));
                const nonConflict = new Array(4).fill(0).map((_, i) => toWriteRow(schemaObjects.humanData('no-conflict-' + i)));

                const conflicts = await handleUpstreamBatch(
                    options,
                    options.initData,
                    PRIMARY_PATH,
                    rows2.concat(nonConflict)
                );
                assert.strictEqual(conflicts.length, 3, 'must have 3 conflicts');
                await processWalFile(
                    options,
                    options.initData,
                    PRIMARY_PATH
                );

                let docsFiles = await listFilesInFolder(
                    options,
                    options.initData.docsFolderId
                );
                assert.strictEqual(docsFiles.length, 7);

                // non-conflict updates
                const docs3 = new Array(3).fill(0).map((_, i) => schemaObjects.humanData('doc-' + i, 42));
                const rows3 = docs.map((d, i) => toWriteRow(docs3[i], d));

                const conflicts2 = await handleUpstreamBatch(
                    options,
                    options.initData,
                    PRIMARY_PATH,
                    rows3
                );
                assert.deepStrictEqual(conflicts2, [], 'not update conflicts');
                await processWalFile(
                    options,
                    options.initData,
                    PRIMARY_PATH
                );

                docsFiles = await listFilesInFolder(
                    options,
                    options.initData.docsFolderId
                );
                const contentsByFileId = await fetchDocumentContents<WithDeletedAndAttachments<HumanDocumentType>>(
                    options,
                    docsFiles.map(d => d.id)
                );
                contentsByFileId.ordered.forEach(file => {
                    if (file.passportId.startsWith('doc-')) {
                        assert.strictEqual(file.age, 42, 'must have updated the age on ' + file.passportId);
                    }
                });
            });
        });
    });
    describe('non-live replication', () => {
        it('should keep the master state as default conflict handler', async () => {
            const c1 = await humansCollection.create(1);
            const c2 = await humansCollection.create(0);

            await syncOnce(c1, options);
            await syncOnce(c2, options);

            const doc1 = await c1.findOne().exec(true);
            const doc2 = await c2.findOne().exec(true);

            // make update on both sides
            await doc1.incrementalPatch({ firstName: 'c1' });
            await doc2.incrementalPatch({ firstName: 'c2' });

            await syncOnce(c2, options);

            // cause conflict
            await syncOnce(c1, options);

            /**
             * Must have kept the master state c2
             */
            assert.strictEqual(doc1.getLatest().firstName, 'c2');

            c1.database.close();
            c2.database.close();
        });
    });
    describe('WebRTC signaling', () => {
        beforeEach(async () => {
            options = {
                oauthClientId: 'mock-client-id',
                authToken: 'valid-token',
                apiEndpoint: serverUrl,
                folderPath: 'test-folder-' + Math.random(),
                transactionTimeout: 1000,
                initData: null as any,
                signalingOptions: { wrtc }
            };
            options.initData = await initDriveStructure(options);
        });
        it('should emit signaling data', async () => {
            const emitted: any[] = [];
            const peer = new Peer({
                initiator: true,
                trickle: true,
                wrtc
            });
            peer.on('error', (e: any) => console.error('peer error:', e));
            peer.on('signal', (signalData: any) => {
                emitted.push(signalData);
            });

            await waitUntil(() => emitted.length > 0);


            peer.destroy();
        });
        it('should not throw', async () => {
            const state = new SignalingState(
                options,
                options.initData,
                { wrtc }
            );
            await state.processNewMessages();
            await state.sendMessage('foobar');
            await cleanupOldSignalingMessages(
                options,
                options.initData.signalingFolderId
            );
            await state.close();
        });
        it('two clients should now about each other', async () => {
            const state1 = new SignalingState(
                options,
                options.initData,
                { wrtc }
            );
            await state1.processNewMessages();
            const state2 = new SignalingState(
                options,
                options.initData,
                { wrtc }
            );

            await waitUntil(() => {
                return state1.peerBySenderId.size === 1;
            });
            await waitUntil(() => {
                return state2.peerBySenderId.size === 1;
            });


            // ping each other
            let pinged = false;
            state1.resync$.subscribe(() => pinged = true);
            state2.pingPeers('RESYNC');
            await waitUntil(() => {
                return !!pinged;
            });



            await state1.close();
            await state2.close();
        });
    });
    describe('live replication', () => {
        beforeEach(async () => {
            options = {
                oauthClientId: 'mock-client-id',
                authToken: 'valid-token',
                apiEndpoint: serverUrl,
                folderPath: 'test-folder-' + Math.random(),
                transactionTimeout: 1000,
                initData: null as any,
                signalingOptions: { wrtc, config: { iceServers: [] } }

            };
            options.initData = await initDriveStructure(options);
        });
        it('should realtime sync on both sides', async () => {
            const collectionA = await humansCollection.createHumanWithTimestamp(0, 'aa' + randomToken(10), false);
            const collectionB = await humansCollection.createHumanWithTimestamp(0, 'bb' + randomToken(10), false);
            await collectionA.insert(schemaObjects.humanWithTimestampData({ id: 'a-init', name: 'colA init' }));
            await collectionB.insert(schemaObjects.humanWithTimestampData({ id: 'b-init', name: 'colB init' }));


            const replicationStateA = await sync(collectionA, options, options.signalingOptions);
            await replicationStateA.awaitInitialReplication();

            const replicationStateB = await sync(collectionB, options, options.signalingOptions);
            await replicationStateB.awaitInitialReplication();

            await awaitCollectionsHaveEqualState(collectionA, collectionB, undefined, 1000);


            // insert one
            await collectionA.insert(schemaObjects.humanWithTimestampData({ id: 'insert', name: 'InsertName' }));
            await awaitCollectionsHaveEqualState(collectionA, collectionB);

            // delete one
            await collectionB.findOne().remove();
            await awaitCollectionsHaveEqualState(collectionA, collectionB);

            // insert many
            await collectionA.bulkInsert(
                new Array(10)
                    .fill(0)
                    .map(() => schemaObjects.humanWithTimestampData({ name: 'insert-many' }))
            );
            await awaitCollectionsHaveEqualState(collectionA, collectionB);

            // insert at both collections at the same time
            await Promise.all([
                collectionA.insert(schemaObjects.humanWithTimestampData({ name: 'insert-parallel-A' })),
                collectionB.insert(schemaObjects.humanWithTimestampData({ name: 'insert-parallel-B' }))
            ]);
            await awaitCollectionsHaveEqualState(collectionA, collectionB);

            collectionA.database.close();
            collectionB.database.close();
        });
    });
});
