/**
 * this test checks the integration with firestore
 * You need a running firebase backend
 */
import assert from 'assert';

import {
    randomToken,
    RxCollection,
    ensureNotFalsy,
    WithDeleted,
    createRxDatabase,
    addRxPlugin
} from '../plugins/core/index.mjs';

import {
    schemaObjects,
    humansCollection,
    ensureReplicationHasNoErrors,
    HumanDocumentType,
    ensureCollectionsHaveEqualState,
    HumanWithTimestampDocumentType,
    humanSchemaLiteral,
    SimpleHumanDocumentType
} from '../plugins/test-utils/index.mjs';

import { RxDBDevModePlugin } from '../plugins/dev-mode/index.mjs';


import {
    SyncOptionsAppwrite,
    RxAppwriteReplicationState,
    replicateAppwrite
} from '../plugins/replication-appwrite/index.mjs';
import config from './unit/config.ts';
import { wrappedValidateZSchemaStorage } from '../plugins/validate-z-schema/index.mjs';
import {
    Client,
    Databases,
    Query,
    Models
} from 'appwrite';
import { randomString, wait, waitUntil } from 'async-test-util';

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
        return client;
    }

    async function getServerState() {
        const client = getClient();
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

    async function cleanUpServer() {
        const result = await databases.listDocuments(
            databaseId,
            collectionId,
            [
                Query.orderAsc('$updatedAt'),
                Query.orderAsc('$id')
            ]
        );
        console.log('result:');
        console.dir(result);
        for (const doc of result.documents) {
            await databases.deleteDocument(
                databaseId,
                collectionId,
                doc.$id
            );
        }
    }


    describe('basics', () => {
        it('init client', async () => {
            const client = getClient();
            databases = new Databases(client);
        });
        it('ensure subscriptions work', async () => {
            // const channel = 'databases.' + databaseId + '.collections.' + collectionId + '.documents';
            const channel = 'databases.*';
            const emitted: any = [];
            const unsubscribe = getClient().subscribe(
                channel,
                response => {
                    console.log('############# GOT ONE EVENT!!!');
                    console.log('############# GOT ONE EVENT!!!');
                    console.log('############# GOT ONE EVENT!!!');
                    console.log('############# GOT ONE EVENT!!!');
                    console.log('############# GOT ONE EVENT!!!');
                    console.log('############# GOT ONE EVENT!!!');
                    console.log('############# GOT ONE EVENT!!!');
                    console.log(response);
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
            }, 2000, 100);
            unsubscribe();
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
    });

    describe('live replication', () => {
        it('push replication to client-server', async () => {
            const collection = await humansCollection.createPrimary(0, undefined, false);
            await collection.insert(schemaObjects.humanData('a-' + randomString(10, appwritePrimaryKeyCharset)));
            await collection.insert(schemaObjects.humanData('b-' + randomString(10, appwritePrimaryKeyCharset)));

            const replicationState = syncCollection(collection);
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();

            let docsOnServer = await getServerState();
            assert.strictEqual(docsOnServer.length, 2);

            // insert another one
            await collection.insert(schemaObjects.humanData('c-' + randomString(10, appwritePrimaryKeyCharset)));
            await replicationState.awaitInSync();

            docsOnServer = await getServerState();
            assert.strictEqual(docsOnServer.length, 3);

            // update one
            const doc = await collection.findOne().exec(true);
            await doc.incrementalPatch({ age: 100 });
            await replicationState.awaitInSync();
            docsOnServer = await getServerState();
            console.dir({ docsOnServer });
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
            await collectionA.insert(schemaObjects.humanData('1a-' + randomString(10, appwritePrimaryKeyCharset)));
            const collectionB = await humansCollection.createPrimary(0, undefined, false);
            await collectionB.insert(schemaObjects.humanData('1b-' + randomString(10, appwritePrimaryKeyCharset)));

            const serverState = await getServerState();
            console.log('------------- 0.0');
            const replicationStateA = syncCollection(collectionA);

            ensureReplicationHasNoErrors(replicationStateA);
            await replicationStateA.awaitInitialReplication();


            console.log('------------- 0.1');

            const replicationStateB = syncCollection(collectionB);
            ensureReplicationHasNoErrors(replicationStateB);
            await replicationStateB.awaitInitialReplication();

            console.log('------------- 1');
            await replicationStateA.awaitInSync();

            await wait(1000);

            console.log('------------- 1.5');
            await ensureCollectionsHaveEqualState(collectionA, collectionB);

            console.log('WORKS !!!');
            process.exit();

            console.log('------------- 2');
            // insert one
            await collectionA.insert(schemaObjects.humanData('insert-a'));
            await replicationStateA.awaitInSync();

            await replicationStateB.awaitInSync();
            await ensureCollectionsHaveEqualState(collectionA, collectionB);

            console.log('------------- 3');
            // delete one
            await collectionB.findOne().remove();
            await replicationStateB.awaitInSync();
            await replicationStateA.awaitInSync();
            await ensureCollectionsHaveEqualState(collectionA, collectionB);

            console.log('------------- 4');
            // insert many
            await collectionA.bulkInsert(
                new Array(10)
                    .fill(0)
                    .map(() => schemaObjects.humanData(undefined, undefined, 'bulk-insert-A'))
            );
            await replicationStateA.awaitInSync();
            console.log('------------- 5');

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
});
