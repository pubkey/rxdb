/**
 * pouchdb allows to easily replicate database across devices.
 * This behaviour is tested here
 * @link https://pouchdb.com/guides/replication.html
 */

import assert from 'assert';
import config, { ENV_VARIABLES } from './config';

import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import {
    addRxPlugin,
    randomCouchString,
    RxCollection
} from '../../';

import {
    mergeUrlQueryParams,
    RxCouchDBReplicationState,
    replicateCouchDB,
    getFetchWithCouchDBAuthorization
} from '../../plugins/replication-couchdb';

import { RxDBUpdatePlugin } from '../../plugins/update';
addRxPlugin(RxDBUpdatePlugin);

import { CouchAllDocsResponse } from '../../src/types';
import { filter, firstValueFrom } from 'rxjs';
import { waitUntil } from 'async-test-util';
import { ensureCollectionsHaveEqualState } from '../helper/test-util';

const fetchWithCouchDBAuth = ENV_VARIABLES.NATIVE_COUCHDB ? getFetchWithCouchDBAuthorization('root', 'root') : fetch;

describe('replication-couchdb.test.ts', () => {
    if (
        !config.platform.isNode() ||
        !config.storage.hasPersistence
    ) {
        return;
    }
    const SpawnServer = require('../helper/spawn-server');

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

    async function syncOnce(collection: RxCollection, server: any) {
        const replicationState = replicateCouchDB({
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
            c.database.destroy();
            server.close();
        });
        it('push one insert to server', async () => {
            const server = await SpawnServer.spawn();
            const c = await humansCollection.create(0);
            await c.insert(schemaObjects.human('foobar'));
            await syncOnce(c, server);

            const serverDocs = await getAllServerDocs(server.url);
            assert.strictEqual(serverDocs.length, 1);
            assert.strictEqual(serverDocs[0]._id, 'foobar');

            c.database.destroy();
            server.close();
        });
        it('push and pull inserted document', async () => {
            const server = await SpawnServer.spawn();
            const c = await humansCollection.create(0);
            const c2 = await humansCollection.create(0);

            // insert on both sides
            await c.insert(schemaObjects.human());
            await c2.insert(schemaObjects.human());

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

            c.database.destroy();
            c2.database.destroy();
            server.close();
        });
        it('update existing document', async () => {
            const server = await SpawnServer.spawn();
            const c = await humansCollection.create(0);

            const c2 = await humansCollection.create(0);
            await c2.insert(schemaObjects.human());
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

            c.database.destroy();
            c2.database.destroy();
            server.close();
        });
        it('delete documents', async () => {
            const server = await SpawnServer.spawn();
            const c = await humansCollection.create(0, 'col1', false);
            const c2 = await humansCollection.create(0, 'col2', false);

            const doc1 = await c.insert(schemaObjects.human('doc1'));
            const doc2 = await c2.insert(schemaObjects.human('doc2'));

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

            c.database.destroy();
            c2.database.destroy();
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
                await doc1.incrementalPatch({ firstName: 'c1' });
                await doc2.incrementalPatch({ firstName: 'c2' });

                await syncOnce(c2, server);

                // cause conflict
                await syncOnce(c1, server);

                /**
                 * Must have kept the master state c2
                 */
                assert.strictEqual(doc1.getLatest().firstName, 'c2');

                c1.database.destroy();
                c2.database.destroy();
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

            await syncLive(c1, server);
            await syncLive(c2, server);

            const foundPromise = firstValueFrom(
                c2.find().$.pipe(
                    filter(results => results.length === 1)
                )
            );

            await c1.insert(schemaObjects.human('foobar'));

            // wait until it is on the server
            await waitUntil(async () => {
                const serverDocs = await getAllServerDocs(server.url);
                return serverDocs.length === 1;
            });

            const endResult = await foundPromise;
            assert.strictEqual(endResult[0].passportId, 'foobar');

            c1.database.destroy();
            c2.database.destroy();
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

            replicationState.error$.subscribe((err) => {
                console.log('error');
                throw Error(err.message);
            });

            await replicationState.awaitInitialReplication();

            // Edit the item multiple times
            // In this test the replication usually fails on the first edit
            // But in production it is pretty random, I've added 3 edits just in case
            doc = await doc.update({
                $set: {
                    firstName: '1' + randomCouchString(10),
                },
            });

            doc = await doc.update({
                $set: {
                    firstName: '2' + randomCouchString(10),
                },
            });

            doc = await doc.update({
                $set: {
                    firstName: '3' + randomCouchString(10),
                },
            });
            assert.ok(doc);

            await replicationState.awaitInSync();
            await collection.database.destroy();
        });
    });
});
