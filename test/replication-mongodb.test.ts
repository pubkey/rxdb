import assert from 'assert';

import {
    randomToken,
    ensureNotFalsy,
    addRxPlugin,
    RxCollection
} from '../plugins/core/index.mjs';
import {
    lastOfArray
} from '../plugins/utils/index.mjs';

import {
    schemaObjects,
    humansCollection,
    ensureReplicationHasNoErrors,
    ensureCollectionsHaveEqualState,
    SimpleHumanDocumentType,
    getPullStream,
    getPullHandler,
    getPushHandler,
    runReplicationBaseTestSuite
} from '../plugins/test-utils/index.mjs';

import { RxDBDevModePlugin } from '../plugins/dev-mode/index.mjs';

import {
    Collection as MongoCollection,
    MongoClient,
    WithId
} from 'mongodb';

import {
    RxMongoDBReplicationState,
    getDocsSinceChangestreamCheckpoint,
    replicateMongoDB,
    startChangeStream,
    getCurrentResumeToken,
    getDocsSinceDocumentCheckpoint,
    iterateCheckpoint
} from '../plugins/replication-mongodb/index.mjs';
import config from './unit/config.ts';
import { randomString, wait, waitUntil } from 'async-test-util';
import { MONGO_OPTIONS_DRIVER_INFO } from '../plugins/storage-mongodb/index.mjs';
import { MongoDBCheckpointIterationState } from '../src/plugins/replication-mongodb/index.ts';
import { replicateRxCollection } from '../plugins/replication/index.mjs';

const mongoConnectionString = 'mongodb://localhost:27017/?directConnection=true';
const mongoDatabaseName = 'replication-test-db';
const mongoCollectionName = 'sync-test-collection';

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


    async function getServerState(): Promise<WithId<TestDocType>[]> {
        const docs = await mongoCollection.find().toArray();
        return docs;
    }
    const primaryPath = 'passportId';

    function syncCollection<RxDocType = TestDocType>(
        collection: RxCollection<RxDocType>,
    ): RxMongoDBReplicationState<RxDocType> {
        const replicationState = replicateMongoDB<RxDocType>({
            mongodb: {
                collectionName: mongoCollectionName,
                connection: mongoConnectionString,
                databaseName: mongoDatabaseName
            },
            replicationIdentifier: randomToken(10),
            collection,
            pull: {
                batchSize
            },
            push: {
                batchSize
            }
        });
        ensureReplicationHasNoErrors(replicationState);
        return replicationState;
    }

    async function syncCollectionOnce<RxDocType = TestDocType>(
        collection: RxCollection<RxDocType>,
        push: boolean = true,
        pull: boolean = true
    ) {
        const replicationState = replicateMongoDB<RxDocType>({
            mongodb: {
                collectionName: mongoCollectionName,
                connection: mongoConnectionString,
                databaseName: mongoDatabaseName
            },
            replicationIdentifier: 'sync-once',
            collection,
            live: false,
            pull: pull ? {
                batchSize
            } : undefined,
            push: push ? {
                batchSize
            } : undefined
        });
        ensureReplicationHasNoErrors(replicationState);
        await replicationState.awaitInitialReplication();
        await replicationState.awaitInSync();
        await replicationState.cancel();
    }

    async function cleanUpServer() {
        await mongoCollection.deleteMany({});
    }
    function getRandomMongoDoc() {
        const ret = {
            passportId: randomString(10),
            firstName: randomString(10),
            lastName: randomString(10)
        };
        return ret;
    }
    function insertDocument(doc = getRandomMongoDoc()) {
        return mongoCollection.insertOne(doc);
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
            mongoCollection = await mongoDatabase.createCollection(mongoCollectionName, {
                changeStreamPreAndPostImages: { enabled: true }
            });
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
                events.push(ev);
            });
            await waitUntil(async () => {
                await insertDocument();
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
        it('.getDocsSinceChangestreamCheckpoint() fetch some docs', async () => {
            await cleanUpServer();
            const token = await getCurrentResumeToken(mongoCollection);
            await insertDocuments(3);

            const result = await getDocsSinceChangestreamCheckpoint<any>(primaryPath, mongoCollection, token, 10);

            assert.strictEqual(result.docs.length, 3);
            assert.strictEqual(result.docs[0]._deleted, false);

            const shouldBeEmpty = await getDocsSinceChangestreamCheckpoint<any>(primaryPath, mongoCollection, result.nextToken, 10);
            assert.deepStrictEqual(shouldBeEmpty.docs, []);
            assert.strictEqual(shouldBeEmpty.nextToken._data, result.nextToken._data, 'should have the same token because no docs');
        });
        it('.getDocsSinceChangestreamCheckpoint() get deleted docs', async () => {
            await cleanUpServer();
            const token = await getCurrentResumeToken(mongoCollection);
            const shouldBeEmpty = await getDocsSinceChangestreamCheckpoint(primaryPath, mongoCollection, token, 10);
            assert.strictEqual(shouldBeEmpty.docs.length, 0);

            await insertDocuments(1);
            let shouldNotBeEmpty = await getDocsSinceChangestreamCheckpoint<TestDocType>(primaryPath, mongoCollection, shouldBeEmpty.nextToken, 3);
            assert.strictEqual(shouldNotBeEmpty.docs.length, 1);

            await cleanUpServer();
            shouldNotBeEmpty = await getDocsSinceChangestreamCheckpoint<TestDocType>(primaryPath, mongoCollection, shouldNotBeEmpty.nextToken, 3);

            assert.strictEqual(shouldNotBeEmpty.docs.length, 1);
            assert.strictEqual(shouldNotBeEmpty.docs[0]._deleted, true);
        });
        it('.getDocsSinceDocumentCheckpoint()', async () => {
            await cleanUpServer();

            let shouldBeEmpty = await getDocsSinceDocumentCheckpoint(primaryPath, mongoCollection, 10);
            assert.strictEqual(shouldBeEmpty.length, 0);

            await insertDocuments(10);
            let shouldNotBeEmpty = await getDocsSinceDocumentCheckpoint<TestDocType>(primaryPath, mongoCollection, 3);
            assert.strictEqual(shouldNotBeEmpty.length, 3);

            const lastId = ensureNotFalsy(lastOfArray(shouldNotBeEmpty)).passportId;
            shouldNotBeEmpty = await getDocsSinceDocumentCheckpoint(
                primaryPath,
                mongoCollection,
                5,
                lastId
            );
            assert.strictEqual(shouldNotBeEmpty.length, 5);

            shouldNotBeEmpty = await getDocsSinceDocumentCheckpoint(
                primaryPath,
                mongoCollection,
                100,
                ensureNotFalsy(lastOfArray(shouldNotBeEmpty)).passportId
            );

            shouldBeEmpty = await getDocsSinceDocumentCheckpoint(
                primaryPath,
                mongoCollection,
                10,
                ensureNotFalsy(lastOfArray(shouldNotBeEmpty)).passportId
            );
            assert.strictEqual(shouldBeEmpty.length, 0);
        });
        it('.iterateCheckpoint()', async () => {
            await cleanUpServer();
            await insertDocuments(12);
            const limit = 10;
            let state: MongoDBCheckpointIterationState<any> | undefined;

            state = await iterateCheckpoint<TestDocType>(primaryPath, mongoCollection, limit);
            assert.strictEqual(state.docs.length, limit);
            assert.strictEqual(state.checkpoint.iterate, 'docs-by-id');

            state = await iterateCheckpoint(primaryPath, mongoCollection, limit, state.checkpoint);
            assert.strictEqual(state.docs.length, 2);
            assert.strictEqual(state.checkpoint.iterate, 'changestream');

            await insertDocuments(7);
            state = await iterateCheckpoint(primaryPath, mongoCollection, limit, state.checkpoint);
            assert.strictEqual(state.docs.length, 7);
            assert.strictEqual(state.checkpoint.iterate, 'changestream');
        });
    });
    describe('live:false push', () => {
        it('should push the inserted documents', async () => {
            await cleanUpServer();
            const collection = await humansCollection.createPrimary(10, undefined, false);


            // initial push
            await syncCollectionOnce(collection, true, false);
            let state = await getServerState();
            assert.strictEqual(state.length, 10, 'must have pushed all docs to the server');

            /**
             * RxDB-Mongo-Sync should not require to store
             * RxDB specific metadata in the mongodb database.
             * So there should not be a _deleted property be pushed.
             */
            state.forEach(doc => {
                assert.strictEqual(typeof (doc as any)._deleted, 'undefined');
            });

            // ongoing push
            await collection.bulkInsert(
                new Array(15).fill(0).map(() => schemaObjects.humanData())
            );
            await syncCollectionOnce(collection, true, false);
            state = await getServerState();
            assert.strictEqual(state.length, 25, 'must have pushed ongoing docs to the server');

            await collection.database.remove();
        });
        it('should pushed the updated documents', async () => {
            await cleanUpServer();
            const collection = await humansCollection.createPrimary(4, undefined, false);

            await syncCollectionOnce(collection);
            let state = await getServerState();
            assert.strictEqual(state.length, 4, 'must have pushed all docs to the server');

            const doc = await collection.findOne().exec(true);
            await doc.incrementalPatch({ firstName: 'foobar' });
            await syncCollectionOnce(collection);

            state = await getServerState();
            const serverDoc = state.find(d => d.passportId === doc.passportId);
            assert.strictEqual(
                ensureNotFalsy(serverDoc).firstName,
                'foobar'
            );

            await collection.database.remove();
        });
    });
    describe('live:false pull', () => {
        it('should pull the documents', async () => {
            await cleanUpServer();
            await insertDocuments(12);
            const collection = await humansCollection.createPrimary(0, undefined, false);

            // initial pull
            await syncCollectionOnce(collection);
            let docs = await collection.find().exec();
            assert.strictEqual(docs.length, 12);

            // ongoing pull
            await insertDocuments(8);
            await syncCollectionOnce(collection);
            docs = await collection.find().exec();
            assert.strictEqual(docs.length, 20, 'should have pulled the ongoing inserted docs');

            // pull updated doc
            const firstDoc = ensureNotFalsy(lastOfArray(docs));
            await mongoCollection.updateOne(
                { [primaryPath]: firstDoc.primary },
                {
                    $set: {
                        lastName: 'foobar'
                    }
                },
                {
                    upsert: true
                }
            );

            await syncCollectionOnce(collection);
            const docAfter = await collection.findOne(firstDoc.primary).exec(true);
            assert.strictEqual(docAfter.lastName, 'foobar');


            await collection.database.remove();
        });
    });
    describe('deletes', () => {
        it('should push the deletion', async () => {
            await cleanUpServer();
            const collection = await humansCollection.create(1);
            await syncCollectionOnce(collection, true, false);
            let state = await getServerState();
            assert.strictEqual(state.length, 1, 'must have pushed the doc to the server');

            const doc = await collection.findOne().exec(true);
            await doc.remove();

            await syncCollectionOnce(collection, true, false);

            state = await getServerState();
            assert.strictEqual(state.length, 0, 'must have deleted the doc on the server');

            await collection.database.remove();
        });
    });
    describe('conflict handling', () => {
        it('conflict on delete', async () => {
            await cleanUpServer();
            const c1 = await humansCollection.create(0);
            await c1.insert(schemaObjects.humanData('1-conflict'));

            const c2 = await humansCollection.create(0);
            await syncCollectionOnce(c1);
            await syncCollectionOnce(c2);

            const doc1 = await c1.findOne().exec(true);
            let doc2 = await c2.findOne().exec(true);

            await doc1.remove();
            await syncCollectionOnce(c1);
            const state = await getServerState();
            assert.strictEqual(state.length, 0);

            await doc2.patch({
                firstName: 'foobar'
            });

            await syncCollectionOnce(c2);
            doc2 = doc2.getLatest();
            assert.strictEqual(doc2.firstName, doc1.firstName, 'should have kept the firstName because of conflict');
            assert.strictEqual(doc2.deleted, true);

            await c1.database.close();
            await c2.database.close();
        });
        it('delete on cloud while update on client and server is offline', async () => {
            await cleanUpServer();

            const clientCollection = await humansCollection.create(0);
            await clientCollection.insert(schemaObjects.humanData('edit-me', 1));


            const serverCollection = await humansCollection.create(0);
            const clientServerReplication = replicateRxCollection({
                collection: clientCollection,
                replicationIdentifier: randomString(5),
                live: true,
                pull: {
                    handler: getPullHandler(serverCollection),
                    stream$: getPullStream(serverCollection)
                },
                push: {
                    handler: getPushHandler(serverCollection),
                }
            });
            const serverCloudReplication = await syncCollection(serverCollection);

            await clientServerReplication.awaitInSync();
            await clientServerReplication.pause();
            await serverCloudReplication.pause();



            // delete on cloud
            await cleanUpServer();

            // update on client
            const doc = await clientCollection.findOne().exec(true);
            await doc.patch({ age: 2 });

            // restart sync
            await clientServerReplication.start();
            await serverCloudReplication.start();
            await clientServerReplication.awaitInSync();
            await serverCloudReplication.awaitInSync();



            const serverState = await getServerState();
            assert.deepStrictEqual(serverState, []);

            await clientCollection.database.close();
            await serverCollection.database.close();
        });
    });

    /**
     * Run the base test suite that is shared
     * across all replication plugins.
     */
    runReplicationBaseTestSuite({
        startReplication(collection) {
            const replicationState = replicateMongoDB({
                mongodb: {
                    collectionName: mongoCollectionName,
                    connection: mongoConnectionString,
                    databaseName: mongoDatabaseName
                },
                replicationIdentifier: randomToken(10),
                collection,
                pull: {
                    batchSize
                },
                push: {
                    batchSize
                }
            });
            ensureReplicationHasNoErrors(replicationState);
            return replicationState;
        },
        async syncOnce(collection) {
            const replicationState = replicateMongoDB({
                mongodb: {
                    collectionName: mongoCollectionName,
                    connection: mongoConnectionString,
                    databaseName: mongoDatabaseName
                },
                replicationIdentifier: 'sync-once',
                collection,
                live: false,
                pull: {
                    batchSize
                },
                push: {
                    batchSize
                }
            });
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();
            await replicationState.awaitInSync();
            await replicationState.cancel();
        },
        async getAllServerDocs() {
            return getServerState();
        },
        async cleanUpServer() {
            await mongoCollection.deleteMany({});
        },
        softDeletes: false,
        getPrimaryOfServerDoc: (doc) => doc.passportId,
        waitTime: 300,
    });
});
