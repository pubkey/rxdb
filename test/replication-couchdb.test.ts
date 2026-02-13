import assert from 'assert';
import config from './unit/config.ts';

import {
    schemaObjects,
    humansCollection,
    ENV_VARIABLES,
    ensureCollectionsHaveEqualState,
    isNode,
    getConfig,
    simpleHuman
} from '../plugins/test-utils/index.mjs';

import { RxDBDevModePlugin } from '../plugins/dev-mode/index.mjs';
addRxPlugin(RxDBDevModePlugin);

import {
    addRxPlugin,
    randomToken,
    RxCollection
} from './../plugins/core/index.mjs';

import {
    mergeUrlQueryParams,
    RxCouchDBReplicationState,
    replicateCouchDB,
    getFetchWithCouchDBAuthorization
} from './../plugins/replication-couchdb/index.mjs';

import { RxDBUpdatePlugin } from './../plugins/update/index.mjs';
addRxPlugin(RxDBUpdatePlugin);

import { CouchAllDocsResponse } from './../plugins/core/index.mjs';
import { filter, firstValueFrom } from 'rxjs';
import { waitUntil } from 'async-test-util';
const fetchWithCouchDBAuth = ENV_VARIABLES.NATIVE_COUCHDB ? getFetchWithCouchDBAuthorization('root', 'root') : fetch;
import * as SpawnServer from './helper/spawn-server.ts';
import { RxDBcrdtPlugin } from '../plugins/crdt/index.mjs';
import { wrappedValidateAjvStorage } from '../plugins/validate-ajv/index.mjs';

addRxPlugin(RxDBcrdtPlugin);


describe('replication-couchdb.test.ts', () => {
    if (
        !isNode ||
        !config.storage.hasPersistence
    ) {
        return;
    }
    console.log('SPAWN COUCH SERVER');

    async function getAllServerDocs(serverUrl: string): Promise<any[]> {
        const url = serverUrl + '_all_docs?' + mergeUrlQueryParams({ include_docs: true });
        const response = await fetchWithCouchDBAuth(url);
        const result: CouchAllDocsResponse = await response.json();
        return result.rows.map(row => row.doc);
    }

    function ensureReplicationHasNoErrors(replicationState: RxCouchDBReplicationState<any>) {
        /**
         * We do not have to unsubscribe because the observable will cancel anyway.
         */
        replicationState.error$.subscribe(err => {
            console.error('ensureReplicationHasNoErrors() has error:');
            console.log(err);
            if (err?.parameters?.errors) {
                throw err.parameters.errors[0];
            }
            throw err;
        });
    }

    async function syncOnce(collection: RxCollection, server: {
        dbName: string;
        url: string;
        close: () => Promise<void>;
    }) {
        const replicationState = replicateCouchDB({
            replicationIdentifier: 'sync-once' + server.url,
            collection,
            url: server.url,
            fetch: fetchWithCouchDBAuth,
            live: false,
            pull: {},
            push: {}
        });
        ensureReplicationHasNoErrors(replicationState);
        await replicationState.awaitInitialReplication();
    }
    async function syncAll<RxDocType>(
        c1: RxCollection<RxDocType>,
        c2: RxCollection<RxDocType>,
        server: any
    ) {
        await syncOnce(c1, server);
        await syncOnce(c2, server);
        await syncOnce(c1, server);
    }

    describe('init', () => {
        it('import server module', async () => {
        });
        it('wait until CouchDB server is reachable', async function () {
            this.timeout(500 * 1000);
            if (!ENV_VARIABLES.NATIVE_COUCHDB) {
                return;
            }
            await waitUntil(async () => {
                try {
                    await SpawnServer.spawn();
                    console.log('# could reach CouchDB server!');
                    return true;
                } catch (err) {
                    console.log('# could NOT reach CouchDB server, will retry.');
                    return false;
                }
            }, undefined, 500);
        });
    });

    describe('live:false', () => {
        it('finish sync once without data', async () => {
            const server = await SpawnServer.spawn();
            const c = await humansCollection.create(0);
            await syncOnce(c, server);
            c.database.close();
            server.close();
        });
        it('push one insert to server', async () => {
            const server = await SpawnServer.spawn();
            const c = await humansCollection.create(0);
            await c.insert(schemaObjects.humanData('foobar'));
            await syncOnce(c, server);

            const serverDocs = await getAllServerDocs(server.url);
            assert.strictEqual(serverDocs.length, 1);
            assert.strictEqual(serverDocs[0]._id, 'foobar');

            c.database.close();
            server.close();
        });
        it('push and pull inserted document', async () => {
            const server = await SpawnServer.spawn();
            const c = await humansCollection.create(0);
            const c2 = await humansCollection.create(0);

            // insert on both sides
            await c.insert(schemaObjects.humanData());
            await c2.insert(schemaObjects.humanData());

            await syncOnce(c, server);
            await syncOnce(c2, server);
            await syncOnce(c, server);

            const serverDocs = await getAllServerDocs(server.url);
            assert.strictEqual(serverDocs.length, 2);

            assert.strictEqual((await c.find().exec()).length, 2);
            await ensureCollectionsHaveEqualState(c, c2);

            // pulling again should not crash
            await syncOnce(c2, server);
            await ensureCollectionsHaveEqualState(c, c2);

            c.database.close();
            c2.database.close();
            server.close();
        });
        it('update existing document', async () => {
            const server = await SpawnServer.spawn();
            const c = await humansCollection.create(0);

            const c2 = await humansCollection.create(0);
            await c2.insert(schemaObjects.humanData());
            await syncOnce(c2, server);

            let serverDocs = await getAllServerDocs(server.url);
            assert.strictEqual(serverDocs.length, 1);

            await syncOnce(c, server);

            const doc = await c.findOne().exec(true);
            await doc.incrementalPatch({ firstName: 'foobar' });
            await syncOnce(c, server);

            serverDocs = await getAllServerDocs(server.url);
            assert.strictEqual(serverDocs[0].firstName, 'foobar');

            // pulling again should not crash
            await syncOnce(c2, server);
            await ensureCollectionsHaveEqualState(c, c2);

            c.database.close();
            c2.database.close();
            server.close();
        });
        it('delete documents', async () => {
            const server = await SpawnServer.spawn();
            const c = await humansCollection.create(0, 'col1', false);
            const c2 = await humansCollection.create(0, 'col2', false);

            const doc1 = await c.insert(schemaObjects.humanData('doc1'));
            const doc2 = await c2.insert(schemaObjects.humanData('doc2'));

            await syncAll(c, c2, server);
            await ensureCollectionsHaveEqualState(c, c2);
            let serverDocs = await getAllServerDocs(server.url);
            assert.strictEqual(serverDocs.length, 2);

            await doc1.getLatest().remove();
            await syncAll(c, c2, server);
            serverDocs = await getAllServerDocs(server.url);
            assert.strictEqual(serverDocs.length, 1);

            await ensureCollectionsHaveEqualState(c, c2);

            await doc2.getLatest().remove();
            await syncAll(c, c2, server);
            serverDocs = await getAllServerDocs(server.url);
            assert.strictEqual(serverDocs.length, 0);
            await ensureCollectionsHaveEqualState(c, c2);

            c.database.close();
            c2.database.close();
            server.close();
        });
        describe('conflict handling', () => {
            it('should keep the master state as default conflict handler', async () => {
                const server = await SpawnServer.spawn();
                const c1 = await humansCollection.create(1);
                const c2 = await humansCollection.create(0);

                await syncAll(c1, c2, server);

                const doc1 = await c1.findOne().exec(true);
                const doc2 = await c2.findOne().exec(true);

                // make update on both sides
                await Promise.all([
                    doc1.incrementalPatch({ firstName: 'c1' }),
                    doc2.incrementalPatch({ firstName: 'c2' })
                ]);

                await syncOnce(c2, server);

                // cause conflict
                await syncOnce(c1, server);

                /**
                 * Must have kept the master state c2
                 */
                assert.strictEqual(doc1.getLatest().firstName, 'c2');

                c1.database.close();
                c2.database.close();
                server.close();
            });
            it('should correctly handle a conflict where the same doc is inserted on two sides', async () => {


                const server = await SpawnServer.spawn();
                const c1 = await humansCollection.create(0);
                const c2 = await humansCollection.create(0);

                await syncAll(c1, c2, server);

                await c1.insert({
                    passportId: 'foobar',
                    firstName: 'c1',
                    lastName: 'Kelso',
                    age: 1
                });
                await c2.insert({
                    passportId: 'foobar',
                    firstName: 'c2',
                    lastName: 'Kelso',
                    age: 2
                });

                await syncOnce(c1, server);

                // cause conflict
                await syncOnce(c2, server);

                /**
                 * Must have kept the master state c1
                 * because it was synced first
                 */
                const doc1 = await c1.findOne().exec(true);
                assert.strictEqual(doc1.getLatest().firstName, 'c1');

                c1.database.close();
                c2.database.close();
                server.close();
            });
        });
    });
    describe('live:true', () => {
        async function syncLive<RxDocType>(
            collection: RxCollection<RxDocType>,
            server: any
        ): Promise<RxCouchDBReplicationState<RxDocType>> {
            const replicationState = replicateCouchDB<RxDocType>({
                replicationIdentifier: randomToken(10),
                collection,
                url: server.url,
                fetch: fetchWithCouchDBAuth,
                live: true,
                pull: {},
                push: {}
            });
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();
            return replicationState;
        }

        it('should stream changes over the replication to a query', async () => {
            const server = await SpawnServer.spawn();
            const c1 = await humansCollection.create(0);
            const c2 = await humansCollection.create(0);

            const replicationState1 = await syncLive(c1, server);
            ensureReplicationHasNoErrors(replicationState1);
            const replicationState2 = await syncLive(c2, server);
            ensureReplicationHasNoErrors(replicationState2);

            const awaitInSync = () => Promise.all([
                replicationState1.awaitInSync(),
                replicationState2.awaitInSync()
            ]).then(() => Promise.all([
                replicationState1.awaitInSync(),
                replicationState2.awaitInSync()
            ]));

            const foundPromise = firstValueFrom(
                c2.find().$.pipe(
                    filter(results => results.length === 1)
                )
            );

            await c1.insert(schemaObjects.humanData('foobar'));
            await awaitInSync();

            // wait until it is on the server
            await waitUntil(async () => {
                const serverDocsInner = await getAllServerDocs(server.url);
                return serverDocsInner.length === 1;
            });

            const endResult = await foundPromise;
            assert.strictEqual(endResult[0].passportId, 'foobar');

            const doc1 = await c1.findOne().exec(true);
            const doc2 = await c2.findOne().exec(true);

            // edit on one side
            await doc1.incrementalPatch({ age: 20 });
            await awaitInSync();
            await waitUntil(() => doc2.getLatest().age === 20);

            // edit on one side again
            await doc1.incrementalPatch({ age: 21 });
            await awaitInSync();
            await waitUntil(() => doc2.getLatest().age === 21);

            // edit on other side
            await doc2.incrementalPatch({ age: 22 });
            await awaitInSync();
            await waitUntil(() => doc1.getLatest().age === 22);

            c1.database.close();
            c2.database.close();
            server.close();
        });
    });
    describe('ISSUES', () => {
        it('#4299 CouchDB push is throwing error because of missing revision', async () => {
            const server = await SpawnServer.spawn();

            // create a collection
            const collection = await humansCollection.create(0);

            // insert a document
            let doc = await collection.insert({
                passportId: 'foobar',
                firstName: 'Bob',
                lastName: 'Kelso',
                age: 56,
            });

            const replicationState = replicateCouchDB({
                replicationIdentifier: randomToken(10),
                url: server.url,
                collection,
                fetch: fetchWithCouchDBAuth,
                live: true,
                pull: {
                    batchSize: 60,
                    heartbeat: 60000,
                },
                push: {
                    batchSize: 60,
                },
            });
            ensureReplicationHasNoErrors(replicationState);

            await replicationState.awaitInitialReplication();

            // Edit the item multiple times
            // In this test the replication usually fails on the first edit
            // But in production it is pretty random, I've added 3 edits just in case
            doc = await doc.update({
                $set: {
                    firstName: '1' + randomToken(10),
                },
            });

            doc = await doc.update({
                $set: {
                    firstName: '2' + randomToken(10),
                },
            });

            doc = await doc.update({
                $set: {
                    firstName: '3' + randomToken(10),
                },
            });
            assert.ok(doc);

            await replicationState.awaitInSync();
            await collection.database.close();
        });
        it('#4319 CouchDB Replication fails on deleted documents', async () => {
            const server = await SpawnServer.spawn();
            const collection = await humansCollection.create(0);
            const replicationState = replicateCouchDB({
                replicationIdentifier: randomToken(10),
                url: server.url,
                collection,
                fetch: fetchWithCouchDBAuth,
                live: true,
                pull: {},
                push: {},
            });
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();


            // insert 3
            await collection.bulkInsert([
                schemaObjects.humanData('1'),
                schemaObjects.humanData('2'),
                schemaObjects.humanData('3')
            ]);

            // delete 2
            await collection.findOne('1').remove();
            await collection.findOne('2').remove();
            await replicationState.awaitInSync();

            // check server
            const serverDocs = await getAllServerDocs(server.url);
            assert.strictEqual(serverDocs.length, 1);
            assert.strictEqual(serverDocs[0]._id, '3');

            await collection.database.close();
        });
        it('#7444 CouchDB replication pull handlers fails on deleted document when schema validation is enabled', async () => {
            const server = await SpawnServer.spawn();

            // create a doc in couch
            const response = await fetchWithCouchDBAuth(server.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    passportId: 'doc1',
                    age: '25',
                    oneOptional: 'some value'
                })
            });
            assert.strictEqual(response.status, 201);
            const result = await response.json();
            const docId = result.id;
            const docRev = result.rev;

            const storage = wrappedValidateAjvStorage({storage: getConfig().storage.getStorage()});

            // the simpleHuman schema has age as a required field.
            const collection = await humansCollection.createBySchema(simpleHuman, undefined, storage);
            const replicationState = replicateCouchDB({
                replicationIdentifier: randomToken(10),
                url: server.url,
                collection,
                fetch: fetchWithCouchDBAuth,
                live: true,
                pull: {},
                push: {},
            });
            await replicationState.awaitInitialReplication();

            replicationState.error$.subscribe(err => {
                assert.strictEqual(err, null, err.toString());
            });

            // delete the doc from couch
            const deleteResponse = await fetchWithCouchDBAuth(server.url + docId + '?rev=' + docRev, {
                method: 'DELETE'
            });
            assert.strictEqual(deleteResponse.status, 200);
            await replicationState.awaitInSync();

            await collection.database.close();
            server.close();
        });
    });
});
