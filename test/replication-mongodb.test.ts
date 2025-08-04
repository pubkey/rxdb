/**
 * this test checks the integration with firestore
 * You need a running firebase backend
 */
import assert from 'assert';

import {
    randomToken,
    ensureNotFalsy,
    addRxPlugin
} from '../plugins/core/index.mjs';
import {
    lastOfArray
} from '../plugins/utils/index.mjs';

import {
    schemaObjects,
    humansCollection,
    ensureReplicationHasNoErrors,
    ensureCollectionsHaveEqualState,
    SimpleHumanDocumentType
} from '../plugins/test-utils/index.mjs';

import { RxDBDevModePlugin } from '../plugins/dev-mode/index.mjs';

import {
    Db as MongoDatabase,
    Collection as MongoCollection,
    MongoClient,
    ObjectId,
    ClientSession,
    Timestamp
} from 'mongodb';

import {
    RxMongoDBReplicationState,
    getDocsSinceChangestreamCheckpoint,
    replicateMongoDB,
    startChangeStream,
    getCurrentResumeToken,
    getDocsSinceDocumentCheckpoint,
    MongoDbCheckpointType,
    iterateCheckpoint
} from '../plugins/replication-mongodb/index.mjs';
import config from './unit/config.ts';
import { randomString, wait, waitUntil } from 'async-test-util';
import { MONGO_OPTIONS_DRIVER_INFO } from '../plugins/storage-mongodb/index.mjs';
import { MongoDBCheckpointIterationState } from '../src/plugins/replication-mongodb/index.ts';

const mongoConnectionString = 'mongodb://localhost:27017/?directConnection=true';
const mongoDatabaseName = 'replication-test-db';
const mongoCollectionName = 'replication-test-collection';

/**
 * The tests for the MongoDB replication plugin
 * do not run in the normal test suite
 * because it is too slow to setup the mongodb database.
 */
describe('replication-mongodb.test.ts', function () {
    addRxPlugin(RxDBDevModePlugin);
    config.storage.init?.();
    type TestDocType = SimpleHumanDocumentType;

    this.timeout(1000 * 20);

    /**
     * Use a low batchSize in all tests
     * to make it easier to test boundaries.
     */
    const batchSize = 5;


    async function getServerState() {
        const docs = await mongoCollection.find({}).toArray();
        return docs;
    }

    // function syncCollection<RxDocType = TestDocType>(
    //     collection: RxCollection<RxDocType>,
    // ): RxAppwriteReplicationState<RxDocType> {
    //     const replicationState = replicateMongoDB<RxDocType>({
    //         client: getClient(),
    //         collectionId,
    //         databaseId,
    //         deletedField: 'deleted',
    //         replicationIdentifier: randomToken(10),
    //         collection,
    //         pull: {
    //             batchSize
    //         },
    //         push: {
    //             batchSize
    //         }
    //     });
    //     ensureReplicationHasNoErrors(replicationState);
    //     return replicationState;
    // }

    // async function syncCollectionOnce<RxDocType = TestDocType>(
    //     collection: RxCollection<RxDocType>,
    // ) {
    //     const replicationState = replicateMongoDB<RxDocType>({
    //         client: getClient(),
    //         collectionId,
    //         databaseId,
    //         deletedField: 'deleted',
    //         replicationIdentifier: 'sync-once',
    //         collection,
    //         live: false,
    //         pull: {
    //             batchSize
    //         },
    //         push: {
    //             batchSize
    //         }
    //     });
    //     ensureReplicationHasNoErrors(replicationState);
    //     await replicationState.awaitInitialReplication();
    //     await replicationState.awaitInSync();
    //     await replicationState.cancel();
    // }

    async function cleanUpServer() {
        const result = await mongoCollection.deleteMany({});
        console.log(`Deleted ${result.deletedCount} documents`);
    }
    function getRandomMongoDoc() {
        return {
            passportId: randomString(10),
            firstName: randomString(10),
            lastName: randomString(10)
        };
    }
    async function insertDocument(doc = getRandomMongoDoc()) {
        const result = await mongoCollection.insertOne(doc);
    }
    async function insertDocuments(amount = 1) {
        await Promise.all(
            new Array(amount).fill(0).map(() => insertDocument())
        );
    }
    async function getChangeStream() {
        const changestream = await startChangeStream(
            mongoCollection
        );
        return changestream;
    }

    let mongoCollection: MongoCollection<any>;
    describe('basics', function () {
        this.timeout(100000);
        it('init client and wait until database and collection exists', async () => {


            const mongoClient = new MongoClient(mongoConnectionString, MONGO_OPTIONS_DRIVER_INFO);
            const mongoDatabase = mongoClient.db(mongoDatabaseName);
            mongoCollection = await mongoDatabase.createCollection(mongoCollectionName);

            console.log('mongodb collection created');
        });
        it('clean up database', async () => {
            await cleanUpServer();
            const count = await mongoCollection.countDocuments({});
            assert.strictEqual(count, 0, 'must not have documents after cleanup');
        });
        it('insert documents', async () => {
            await insertDocument();
            await insertDocument();
            await insertDocument();

            const state = await getServerState();
            assert.strictEqual(state.length, 3);
            await cleanUpServer();
        });
    });
    describe('helpers', () => {
        it('should be able to listen to the changestream', async () => {
            await cleanUpServer();
            const changestream = await getChangeStream();
            await insertDocument();
            await insertDocument();
            const events = [];
            changestream.on('change', (ev) => {
                console.log('got change!!');
                console.dir(ev);
                events.push(ev);
            });
            await waitUntil(async () => {
                await insertDocument();
                console.log('events amount: ' + events.length);
                return events.length > 0;
            });
            await changestream.close();
        });
        it('.getCurrentResumeToken()', async () => {
            await cleanUpServer();
            await insertDocuments(1);
            const token = await getCurrentResumeToken(mongoCollection);
            assert.ok(token);
            assert.ok(token._data);
        });
        it('.getDocsSinceChangestreamCheckpoint()', async () => {
            await cleanUpServer();

            const token = await getCurrentResumeToken(mongoCollection);
            await insertDocuments(3);

            const result = await getDocsSinceChangestreamCheckpoint<any>(mongoCollection, token, 10);

            assert.strictEqual(result.docs.length, 3);
            assert.ok(result.docs[0]._id);
        });
        it('.getDocsSinceDocumentCheckpoint()', async () => {
            await cleanUpServer();

            let shouldBeEmpty = await getDocsSinceDocumentCheckpoint(mongoCollection, 10);
            assert.strictEqual(shouldBeEmpty.length, 0);

            await insertDocuments(3);
            let shouldNotBeEmpty = await getDocsSinceDocumentCheckpoint(mongoCollection, 10);
            assert.strictEqual(shouldNotBeEmpty.length, 3);

            shouldBeEmpty = await getDocsSinceDocumentCheckpoint(mongoCollection, 10, ensureNotFalsy(lastOfArray(shouldNotBeEmpty))._id.toString());
            assert.strictEqual(shouldBeEmpty.length, 0);

            await insertDocuments(5);
            shouldNotBeEmpty = await getDocsSinceDocumentCheckpoint(mongoCollection, 10, ensureNotFalsy(lastOfArray(shouldNotBeEmpty))._id.toString());
            assert.strictEqual(shouldNotBeEmpty.length, 5);
        });
        it('.getDocsSinceDocumentCheckpoint()', async () => {
            await cleanUpServer();
            await insertDocuments(12);
            const limit = 10;
            let state: MongoDBCheckpointIterationState<any> | undefined = undefined;

            state = await iterateCheckpoint(mongoCollection, limit);
            assert.strictEqual(state.docs.length, limit);
            assert.strictEqual(state.checkpoint.iterate, 'docs-by-id');

            state = await iterateCheckpoint(mongoCollection, limit, state.checkpoint);
            assert.strictEqual(state.docs.length, 2);
            assert.strictEqual(state.checkpoint.iterate, 'changestream');

            await insertDocuments(7);
            state = await iterateCheckpoint(mongoCollection, limit, state.checkpoint);
            assert.strictEqual(state.docs.length, 7);
            assert.strictEqual(state.checkpoint.iterate, 'changestream');
        });
    });

    // describe('live replication', () => {
    //     it('push replication to client-server', async () => {
    //         const collection = await humansCollection.createPrimary(0, undefined, false);
    //         await collection.insert(schemaObjects.humanData('a-' + getRandomAppwriteDocId()));
    //         await collection.insert(schemaObjects.humanData('b-' + getRandomAppwriteDocId()));

    //         const replicationState = syncCollection(collection);
    //         ensureReplicationHasNoErrors(replicationState);
    //         await replicationState.awaitInitialReplication();

    //         let docsOnServer = await getServerState();
    //         assert.strictEqual(docsOnServer.length, 2);

    //         // insert another one
    //         await collection.insert(schemaObjects.humanData('c-' + getRandomAppwriteDocId()));
    //         await replicationState.awaitInSync();

    //         docsOnServer = await getServerState();
    //         assert.strictEqual(docsOnServer.length, 3);

    //         // update one
    //         const doc = await collection.findOne().exec(true);
    //         await doc.incrementalPatch({ age: 100 });
    //         await replicationState.awaitInSync();
    //         docsOnServer = await getServerState();
    //         assert.strictEqual(docsOnServer.length, 3);
    //         const serverDoc = ensureNotFalsy(docsOnServer.find(d => d.$id === doc.primary), 'doc with id missing ' + doc.primary);
    //         assert.strictEqual(serverDoc.age, 100);

    //         // delete one
    //         await doc.getLatest().remove();
    //         await replicationState.awaitInSync();
    //         docsOnServer = await getServerState();

    //         // must still have 3 because there are no hard deletes
    //         assert.strictEqual(docsOnServer.length, 3);
    //         assert.ok(docsOnServer.find(d => (d as any).deleted));

    //         collection.database.close();
    //     });
    //     it('two collections', async () => {
    //         await cleanUpServer();
    //         const collectionA = await humansCollection.createPrimary(0, undefined, false);
    //         await collectionA.insert(schemaObjects.humanData('1a-' + getRandomAppwriteDocId()));
    //         const collectionB = await humansCollection.createPrimary(0, undefined, false);
    //         await collectionB.insert(schemaObjects.humanData('1b-' + getRandomAppwriteDocId()));

    //         const replicationStateA = syncCollection(collectionA);

    //         ensureReplicationHasNoErrors(replicationStateA);
    //         await replicationStateA.awaitInitialReplication();

    //         const replicationStateB = syncCollection(collectionB);
    //         ensureReplicationHasNoErrors(replicationStateB);
    //         await replicationStateB.awaitInitialReplication();

    //         await wait(300);
    //         await replicationStateA.awaitInSync();

    //         await ensureCollectionsHaveEqualState(collectionA, collectionB, 'init sync');

    //         // insert one
    //         await collectionA.insert(schemaObjects.humanData('insert-a'));
    //         await replicationStateA.awaitInSync();

    //         await replicationStateB.awaitInSync();
    //         await wait(300);
    //         await ensureCollectionsHaveEqualState(collectionA, collectionB, 'after insert');

    //         // delete one
    //         await collectionB.findOne().remove();
    //         await replicationStateB.awaitInSync();
    //         await replicationStateA.awaitInSync();
    //         await wait(300);
    //         await ensureCollectionsHaveEqualState(collectionA, collectionB, 'after deletion');

    //         // insert many
    //         await collectionA.bulkInsert(
    //             new Array(10)
    //                 .fill(0)
    //                 .map(() => schemaObjects.humanData(getRandomAppwriteDocId(), undefined, 'bulk-insert-A'))
    //         );
    //         await replicationStateA.awaitInSync();

    //         await replicationStateB.awaitInSync();
    //         await wait(100);
    //         await ensureCollectionsHaveEqualState(collectionA, collectionB, 'after insert many');

    //         // insert at both collections at the same time
    //         await Promise.all([
    //             collectionA.insert(schemaObjects.humanData('insert-parallel-a')),
    //             collectionB.insert(schemaObjects.humanData('insert-parallel-b'))
    //         ]);
    //         await replicationStateA.awaitInSync();
    //         await replicationStateB.awaitInSync();
    //         await replicationStateA.awaitInSync();
    //         await replicationStateB.awaitInSync();
    //         await wait(300);
    //         await ensureCollectionsHaveEqualState(collectionA, collectionB, 'after insert both at same time');

    //         collectionA.database.close();
    //         collectionB.database.close();
    //     });
    // });
    // describe('conflict handling', () => {
    //     it('INSERT: should keep the master state as default conflict handler', async () => {
    //         await cleanUpServer();

    //         // insert and sync
    //         const c1 = await humansCollection.create(0);
    //         const conflictDocId = '1-insert-conflict-' + getRandomAppwriteDocId();
    //         await c1.insert(schemaObjects.humanData(conflictDocId, undefined, 'insert-first'));
    //         await syncCollectionOnce(c1);


    //         // insert same doc-id on other side
    //         const c2 = await humansCollection.create(0);
    //         await c2.insert(schemaObjects.humanData(conflictDocId, undefined, 'insert-conflict'));
    //         await syncCollectionOnce(c2);

    //         /**
    //          * Must have kept the first-insert state
    //          */
    //         const serverState = await getServerState();
    //         const doc1 = await c1.findOne().exec(true);
    //         const doc2 = await c2.findOne().exec(true);
    //         assert.strictEqual(serverState[0].firstName, 'insert-first');
    //         assert.strictEqual(doc2.getLatest().firstName, 'insert-first');
    //         assert.strictEqual(doc1.getLatest().firstName, 'insert-first');

    //         c1.database.close();
    //         c2.database.close();
    //     });
    //     it('UPDATE: should keep the master state as default conflict handler', async () => {
    //         await cleanUpServer();
    //         const c1 = await humansCollection.create(0);
    //         await c1.insert(schemaObjects.humanData('1-conflict-' + getRandomAppwriteDocId()));

    //         const c2 = await humansCollection.create(0);

    //         await syncCollectionOnce(c1);
    //         await syncCollectionOnce(c2);

    //         const doc1 = await c1.findOne().exec(true);
    //         const doc2 = await c2.findOne().exec(true);
    //         assert.strictEqual(doc1.firstName, doc2.firstName, 'equal names');

    //         // make update on both sides
    //         await doc2.incrementalPatch({ firstName: 'c2' });
    //         await syncCollectionOnce(c2);

    //         // cause conflict
    //         await doc1.incrementalPatch({ firstName: 'c1' });
    //         await syncCollectionOnce(c1);

    //         /**
    //          * Must have kept the master state c2
    //          */
    //         assert.strictEqual(doc2.getLatest().firstName, 'c2', 'doc2 firstName');
    //         assert.strictEqual(doc1.getLatest().firstName, 'c2', 'doc1 firstName');

    //         c1.database.close();
    //         c2.database.close();
    //     });
    // });
});
