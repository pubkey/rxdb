/**
 * this test checks the integration with firestore
 * You need a running firebase backend
 */
import assert from 'assert';

import {
    randomToken,
    addRxPlugin
} from '../plugins/core/index.mjs';

import {
    ensureReplicationHasNoErrors,
    runReplicationBaseTestSuite
} from '../plugins/test-utils/index.mjs';

import { RxDBDevModePlugin } from '../plugins/dev-mode/index.mjs';


import {
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
    this.timeout(1000 * 20);

    /**
     * Use a low batchSize in all tests
     * to make it easier to test boundaries.
     */
    const batchSize = 5;

    const projectId = 'rxdb-test-1';
    let databaseId: string; // set via karma config
    const collectionId = 'test-collection-1';
    const appwritePrimaryKeyCharset = 'abcdefghijklmnopqrstuvwxyz';

    let databases: Databases;

    function getClient() {
        const client = new Client();
        client.setProject(projectId);
        client.setEndpoint('http://localhost/v1');
        client.setEndpointRealtime('http://localhost/v1');
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


    describe('basics', function () {
        this.timeout(100000);
        it('check config', () => {
            databaseId = (window as any).__karma__.config.args[0];
            assert.ok(databaseId);
            console.log('databaseId: ' + databaseId);
        });
        it('init client and wait until database exists', async () => {
            await waitUntil(async () => {
                const client = getClient();
                databases = new Databases(client);
                try {
                    const docs = await databases.listDocuments(
                        databaseId,
                        collectionId,
                        []
                    );
                    console.log('docs: ' + docs.total);
                    return true;
                } catch (err) {
                    console.log('collection not exists ' + databaseId + ' ' + collectionId + ' ERROR:');
                    console.dir(err);
                    return false;
                }
            }, undefined, 1000);
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

    /**
     * Run the base test suite that is shared
     * across all replication plugins.
     */
    runReplicationBaseTestSuite({
        startReplication(collection) {
            const replicationState = replicateAppwrite({
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
        },
        async syncOnce(collection) {
            const replicationState = replicateAppwrite({
                client: getClient(),
                collectionId,
                databaseId,
                deletedField: 'deleted',
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
        getAllServerDocs() {
            return getServerState();
        },
        async cleanUpServer() {
            await cleanUpServer();
        },
        softDeletes: true,
        isDeleted: (doc) => !!(doc as any).deleted,
        getPrimaryOfServerDoc: (doc) => doc.$id,
        waitTime: 300,
    });
});
