/**
 * pouchdb allows to easily replicate database across devices.
 * This behaviour is tested here
 * @link https://pouchdb.com/guides/replication.html
 */

import assert from 'assert';
import config from './config';

import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import {
    addRxPlugin,
    RxCollection
} from '../../';

import {
    mergeUrlQueryParams,
    RxCouchDBNewReplicationState,
    RxDBReplicationCouchDBNewPlugin
} from '../../plugins/replication-couchdb-new';

import { PouchAllDocsResponse } from '../../src/types';
import { filter, firstValueFrom } from 'rxjs';
import { waitUntil } from 'async-test-util';
import { ensureCollectionsHaveEqualState } from '../helper/test-util';

describe('replication-couchdb-new.test.ts', () => {
    if (
        !config.platform.isNode() ||
        !config.storage.hasPersistence
    ) {
        return;
    }
    const SpawnServer = require('../helper/spawn-server');
    addRxPlugin(RxDBReplicationCouchDBNewPlugin);

    async function getAllServerDocs(serverUrl: string) {
        const url = serverUrl + '_all_docs?' + mergeUrlQueryParams({ include_docs: true });
        const response = await fetch(url);
        const result: PouchAllDocsResponse = await response.json();
        return result.rows.map(row => row.doc);
    }

    function ensureReplicationHasNoErrors(replicationState: RxCouchDBNewReplicationState<any>) {
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
        const replicationState = collection.syncCouchDBNew({
            url: server.url,
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
            await doc.atomicPatch({ firstName: 'foobar' });
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

            await doc1.remove();
            await syncAll(c, c2, server);
            serverDocs = await getAllServerDocs(server.url);
            assert.strictEqual(serverDocs.length, 1);

            await ensureCollectionsHaveEqualState(c, c2);

            await doc2.remove();
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
                await doc1.atomicPatch({ firstName: 'c1' });
                await doc2.atomicPatch({ firstName: 'c2' });

                await syncOnce(c2, server);

                // cause conflict
                await syncOnce(c1, server);

                /**
                 * Must have kept the master state c2
                 */
                assert.strictEqual(doc1.firstName, 'c2');

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
        ): Promise<RxCouchDBNewReplicationState<RxDocType>> {
            const replicationState = collection.syncCouchDBNew({
                url: server.url,
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
    describe('ISSUES', () => { });
});
