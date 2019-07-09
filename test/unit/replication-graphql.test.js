import assert from 'assert';
import config from './config';

import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';
import RxDB from '../../dist/lib/index';
import graphQlPlugin from '../../plugins/replication-graphql';
RxDB.plugin(graphQlPlugin);

import graphQlClient from 'graphql-client';

import {
    fromEvent
} from 'rxjs';
import {
    map,
    filter,
    first
} from 'rxjs/operators';

let SpawnServer;
if (config.platform.isNode()) {
    SpawnServer = require('../helper/graphql-server');
    RxDB.PouchDB.plugin(require('pouchdb-adapter-http'));
}
describe('replication-graphql.test.js', () => {
    const ERROR_URL = 'http://localhost:15898/foobar';
    if (!config.platform.isNode()) return;
    const batchSize = 5;
    const getTestData = (amount) => {
        return new Array(amount).fill(0)
            .map(() => schemaObjects.humanWithTimestamp())
            .map(doc => {
                doc.deleted = false;
                return doc;
            });
    };
    const queryBuilder = doc => {
        console.dir(doc);
        if (doc === null) {
            doc = {
                id: '',
                updatedAt: 0
            };
        }
        return `{
            feedForRxDBReplication(lastId: "${doc.id}", minUpdatedAt: ${doc.updatedAt}, limit: ${batchSize}) {
                id
                name
                age
                updatedAt
                deleted
            }
        }`;
    };

    describe('graphql-server.js', () => {
        it('spawn, reach and close a server', async () => {
            const server = await SpawnServer.spawn();
            const res = await server.client.query(`{
                 info
            }`);
            assert.equal(res.data.info, 1);
            server.close();
        });
        it('server.setDocument()', async () => {
            const server = await SpawnServer.spawn();
            const doc = getTestData(1).pop();
            const res = await server.setDocument(doc);
            assert.equal(res.data.setHuman.id, doc.id);
            server.close();
        });
    });
    config.parallel('live:false pull only', () => {
        it('should pull all documents in one batch', async () => {
            const c = await humansCollection.createHumanWithTimestamp(0);
            const server = await SpawnServer.spawn(getTestData(batchSize));
            const replicationState = c.syncGraphQl({
                endpoint: server.url,
                direction: {
                    pull: true,
                    push: false
                },
                live: false,
                deletedFlag: 'deleted',
                queryBuilder
            });
            assert.equal(replicationState.isStopped(), false);

            await AsyncTestUtil.waitUntil(async () => {
                const docs = await c.find().exec();
                // console.dir(docs.map(d => d.toJSON()));
                return docs.length === batchSize;
            });

            server.close();
            c.database.destroy();
        });
        it('should pull all documents in multiple batches', async () => {
            const c = await humansCollection.createHumanWithTimestamp(0);
            const amount = batchSize * 4;
            const testData = getTestData(amount);
            const server = await SpawnServer.spawn(testData);

            c.syncGraphQl({
                endpoint: server.url,
                direction: {
                    pull: true,
                    push: false
                },
                live: false,
                deletedFlag: 'deleted',
                queryBuilder
            });


            await AsyncTestUtil.waitUntil(async () => {
                const docs = await c.find().exec();
                // console.dir(docs.map(d => d.toJSON()));
                return docs.length === amount;
            });

            // all of test-data should be in the database
            const docs = await c.find().exec();
            const ids = docs.map(d => d.primary);
            const notInDb = testData.find(doc => !ids.includes(doc.id));
            if (notInDb) throw new Error('not in db: ' + notInDb.id);

            server.close();
            c.database.destroy();
        });
        it('should handle deleted documents', async () => {
            const c = await humansCollection.createHumanWithTimestamp(0);
            const doc = schemaObjects.humanWithTimestamp();
            doc.deleted = true;
            const server = await SpawnServer.spawn([doc]);

            const replicationState = c.syncGraphQl({
                endpoint: server.url,
                direction: {
                    pull: true,
                    push: false
                },
                live: false,
                deletedFlag: 'deleted',
                queryBuilder
            });
            await replicationState.awaitCompletion();
            const docs = await c.find().exec();
            assert.equal(docs.length, 0);

            server.close();
            c.database.destroy();
        });
        it('should retry on errors', async () => {
            const c = await humansCollection.createHumanWithTimestamp(0);
            const amount = batchSize * 4;
            const testData = getTestData(amount);
            const server = await SpawnServer.spawn(testData);

            const replicationState = c.syncGraphQl({
                endpoint: ERROR_URL,
                direction: {
                    pull: true,
                    push: false
                },
                live: false,
                deletedFlag: 'deleted',
                queryBuilder
            });
            replicationState.retryTime = 100;


            // on the first error, we switch out the graphql-client
            await replicationState.error$.pipe(
                first()
            ).toPromise().then(() => {
                const client = graphQlClient({
                    url: server.url
                });
                replicationState.client = client;
            });

            await replicationState.awaitCompletion();
            const docs = await c.find().exec();
            assert.equal(docs.length, amount);

            server.close();
            c.database.destroy();
        });
    });
    config.parallel('observables', () => {
        it('should emit the recieved documents when replicating', async () => {
            const c = await humansCollection.createHumanWithTimestamp(0);
            const testData = getTestData(batchSize);
            const server = await SpawnServer.spawn(testData);

            const replicationState = c.syncGraphQl({
                endpoint: server.url,
                direction: {
                    pull: true,
                    push: false
                },
                live: false,
                deletedFlag: 'deleted',
                queryBuilder
            });

            const emitted = [];
            const sub = replicationState.recieved$.subscribe(doc => emitted.push(doc));

            await replicationState.awaitCompletion();
            assert.equal(emitted.length, batchSize);
            assert.deepEqual(testData, emitted);

            sub.unsubscribe();
            server.close();
            c.database.destroy();
        });
        it('should complete the replicationState afterwards', async () => {
            const c = await humansCollection.createHumanWithTimestamp(0);
            const server = await SpawnServer.spawn();

            const replicationState = c.syncGraphQl({
                endpoint: server.url,
                direction: {
                    pull: true,
                    push: false
                },
                live: false,
                deletedFlag: 'deleted',
                queryBuilder
            });
            await replicationState.awaitCompletion();
            assert.equal(replicationState.isStopped(), true);

            server.close();
            c.database.destroy();
        });
        it('should emit the correct amount of active-changes', async () => {
            const c = await humansCollection.createHumanWithTimestamp(0);
            const amount = batchSize * 2;
            const testData = getTestData(amount);
            const server = await SpawnServer.spawn(testData);

            const replicationState = c.syncGraphQl({
                endpoint: server.url,
                direction: {
                    pull: true,
                    push: false
                },
                live: false,
                deletedFlag: 'deleted',
                queryBuilder
            });

            const emitted = [];
            const sub = replicationState.active$.subscribe(d => emitted.push(d));

            await replicationState.awaitCompletion();

            assert.equal(emitted.length, 7);
            const last = emitted.pop();
            assert.equal(last, false);

            sub.unsubscribe();
            server.close();
            c.database.destroy();
        });
        it('should emit an error when the server is not reachable', async () => {
            const c = await humansCollection.createHumanWithTimestamp(0);
            const replicationState = c.syncGraphQl({
                endpoint: ERROR_URL,
                direction: {
                    pull: true,
                    push: false
                },
                live: false,
                deletedFlag: 'deleted',
                queryBuilder
            });

            const error = await replicationState.error$.pipe(
                first()
            ).toPromise();

            assert.ok(error.toString().includes('foobar'));

            replicationState.cancel();
            c.database.destroy();
        });
    });
    config.parallel('live:true pull only', () => {
        it('should also get documents that come in afterwards', async () => {
            const c = await humansCollection.createHumanWithTimestamp(0);
            const server = await SpawnServer.spawn(getTestData(1));
            const replicationState = c.syncGraphQl({
                endpoint: server.url,
                direction: {
                    pull: true,
                    push: false
                },
                live: false,
                deletedFlag: 'deleted',
                queryBuilder
            });


            // wait until first replication is done
            const activeChanges = [];
            const sub = replicationState.active$.subscribe(v => activeChanges.push(v));
            await AsyncTestUtil.waitUntil(() => activeChanges.length === 5);


            sub.unsubscribe();
            server.close();
            c.database.destroy();
        });
    });
});