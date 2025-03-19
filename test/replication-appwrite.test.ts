/**
 * this test checks the integration with firestore
 * You need a running firebase backend
 */
import assert from 'assert';

import {
    randomToken,
    RxCollection,
    ensureNotFalsy,
    addRxPlugin
} from '../plugins/core/index.mjs';

import {
    schemaObjects,
    humansCollection,
    ensureReplicationHasNoErrors,
    ensureCollectionsHaveEqualState,
    SimpleHumanDocumentType
} from '../plugins/test-utils/index.mjs';

import { RxDBDevModePlugin } from '../plugins/dev-mode/index.mjs';


import {
    RxAppwriteReplicationState,
    replicateAppwrite
} from '../plugins/replication-appwrite/index.mjs';
import config from './unit/config.ts';
import {
    Client,
    Databases,
    Query
} from 'appwrite';
import { randomString, waitUntil } from 'async-test-util';

/**
 * The tests for the firestore replication plugin
 * do not run in the normal test suite
 * because it is too slow to setup the firestore backend emulators.
 */
describe('replication-appwrite.test.ts', function () {
    addRxPlugin(RxDBDevModePlugin);

    config.storage.init?.();
    type TestDocType = SimpleHumanDocumentType;

    this.timeout(1000 * 20);

    /**
     * Use a low batchSize in all tests
     * to make it easier to test boundaries.
     */
    const batchSize = 5;

    const projectId = 'rxdb-test-1';
    const databaseId = '67d2ecc6001ba124ca74';
    const collectionId = 'test-collection-1';
    const appwritePrimaryKeyCharset = 'abcdefghijklmnopqrstuvwxyz';

    let databases: Databases;

    function getClient() {
        const client = new Client();
        client.setProject(projectId);
        client.setEndpointRealtime('https://cloud.appwrite.io/v1');
        return client;
    }

    async function getServerState() {
        const result = await databases.listDocuments(
            databaseId,
            collectionId,
            []
        );
        return result.documents;
    }

    function syncCollection<RxDocType = TestDocType>(
        collection: RxCollection<RxDocType>,
    ): RxAppwriteReplicationState<RxDocType> {
        const replicationState = replicateAppwrite<RxDocType>({
            client: getClient(),
            collectionId,
            databaseId,
            deletedField: 'deleted',
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
    ) {
        const replicationState = replicateAppwrite<RxDocType>({
            client: getClient(),
            collectionId,
            databaseId,
            deletedField: 'deleted',
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
        await replicationState.awaitInitialReplication();
    }

    async function cleanUpServer() {
        const result = await databases.listDocuments(
            databaseId,
            collectionId,
            [
                Query.orderAsc('$updatedAt'),
                Query.orderAsc('$id')
            ]
        );
        for (const doc of result.documents) {
            await databases.deleteDocument(
                databaseId,
                collectionId,
                doc.$id
            );
        }
    }

    function getRandomAppwriteDocId() {
        return randomString(10, appwritePrimaryKeyCharset);
    }


    describe('basics', function () {
        this.timeout(100000);
        it('init client', () => {
            const client = getClient();
            databases = new Databases(client);
        });
        it('clean up database', async () => {
            await cleanUpServer();

            // should not have documents afterwards
            const resultAfter = await databases.listDocuments(
                databaseId,
                collectionId,
                [
                    Query.orderAsc('$updatedAt'),
                    Query.orderAsc('$id')
                ]
            );
            assert.strictEqual(resultAfter.documents.length, 0);
        });
        it('ensure subscriptions work', async () => {
            const channel = 'databases.' + databaseId + '.collections.' + collectionId + '.documents';
            const emitted: any = [];
            const unsubscribe = getClient().subscribe(
                [channel],
                response => {
                    emitted.push(response);
                }
            );
            await waitUntil(async () => {
                await databases.createDocument(
                    databaseId,
                    collectionId,
                    randomString(10, appwritePrimaryKeyCharset),
                    {
                        firstName: 'subtest',
                        lastName: 'subtest',
                        deleted: false,
                        age: 20
                    }
                );
                return emitted.length > 0;
            }, 1000, 100);
            unsubscribe();
            await cleanUpServer();
        });
    });

    describe('live replication', () => {
        it('push replication to client-server', async () => {
            const collection = await humansCollection.createPrimary(0, undefined, false);
            await collection.insert(schemaObjects.humanData('a-' + getRandomAppwriteDocId()));
            await collection.insert(schemaObjects.humanData('b-' + getRandomAppwriteDocId()));

            const replicationState = syncCollection(collection);
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();

            let docsOnServer = await getServerState();
            assert.strictEqual(docsOnServer.length, 2);

            // insert another one
            await collection.insert(schemaObjects.humanData('c-' + getRandomAppwriteDocId()));
            await replicationState.awaitInSync();

            docsOnServer = await getServerState();
            assert.strictEqual(docsOnServer.length, 3);

            // update one
            const doc = await collection.findOne().exec(true);
            await doc.incrementalPatch({ age: 100 });
            await replicationState.awaitInSync();
            docsOnServer = await getServerState();
            assert.strictEqual(docsOnServer.length, 3);
            const serverDoc = ensureNotFalsy(docsOnServer.find(d => d.$id === doc.primary), 'doc with id missing ' + doc.primary);
            assert.strictEqual(serverDoc.age, 100);

            // delete one
            await doc.getLatest().remove();
            await replicationState.awaitInSync();
            docsOnServer = await getServerState();
            // must still have 3 because there are no hard deletes
            assert.strictEqual(docsOnServer.length, 3);
            assert.ok(docsOnServer.find(d => (d as any).deleted));

            collection.database.close();
        });
        it('two collections', async () => {
            const collectionA = await humansCollection.createPrimary(0, undefined, false);
            await collectionA.insert(schemaObjects.humanData('1a-' + getRandomAppwriteDocId()));
            const collectionB = await humansCollection.createPrimary(0, undefined, false);
            await collectionB.insert(schemaObjects.humanData('1b-' + getRandomAppwriteDocId()));

            const replicationStateA = syncCollection(collectionA);

            ensureReplicationHasNoErrors(replicationStateA);
            await replicationStateA.awaitInitialReplication();

            const replicationStateB = syncCollection(collectionB);
            ensureReplicationHasNoErrors(replicationStateB);
            await replicationStateB.awaitInitialReplication();

            await replicationStateA.awaitInSync();

            await ensureCollectionsHaveEqualState(collectionA, collectionB);

            // insert one
            await collectionA.insert(schemaObjects.humanData('insert-a'));
            await replicationStateA.awaitInSync();

            await replicationStateB.awaitInSync();
            await ensureCollectionsHaveEqualState(collectionA, collectionB);

            // delete one
            await collectionB.findOne().remove();
            await replicationStateB.awaitInSync();
            await replicationStateA.awaitInSync();
            await ensureCollectionsHaveEqualState(collectionA, collectionB);

            // insert many
            await collectionA.bulkInsert(
                new Array(10)
                    .fill(0)
                    .map(() => schemaObjects.humanData(getRandomAppwriteDocId(), undefined, 'bulk-insert-A'))
            );
            await replicationStateA.awaitInSync();

            await replicationStateB.awaitInSync();
            await ensureCollectionsHaveEqualState(collectionA, collectionB);

            // insert at both collections at the same time
            await Promise.all([
                collectionA.insert(schemaObjects.humanData('insert-parallel-a')),
                collectionB.insert(schemaObjects.humanData('insert-parallel-b'))
            ]);
            await replicationStateA.awaitInSync();
            await replicationStateB.awaitInSync();
            await replicationStateA.awaitInSync();
            await replicationStateB.awaitInSync();
            await ensureCollectionsHaveEqualState(collectionA, collectionB);

            collectionA.database.close();
            collectionB.database.close();
        });
    });
    describe('conflict handling', () => {
        it('should keep the master state as default conflict handler', async () => {
            await cleanUpServer();
            const c1 = await humansCollection.create(0);
            await c1.insert(schemaObjects.humanData('1a-' + getRandomAppwriteDocId()));

            const c2 = await humansCollection.create(0);

            await syncCollectionOnce(c1);
            await syncCollectionOnce(c2);

            const doc1 = await c1.findOne().exec(true);
            const doc2 = await c2.findOne().exec(true);

            // make update on both sides
            await doc1.incrementalPatch({ firstName: 'c1' });
            await doc2.incrementalPatch({ firstName: 'c2' });

            await syncCollectionOnce(c2);

            // cause conflict
            await syncCollectionOnce(c1);

            /**
             * Must have kept the master state c2
             */
            assert.strictEqual(doc1.getLatest().firstName, 'c2');

            c1.database.close();
            c2.database.close();
        });
    });
});
