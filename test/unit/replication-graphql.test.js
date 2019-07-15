import assert from 'assert';
import config from './config';

import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as util from '../../dist/lib/util';
import AsyncTestUtil, {
    clone
} from 'async-test-util';
import RxDB from '../../dist/lib/index';
import graphQlPlugin from '../../plugins/replication-graphql';
import * as schemas from '../helper/schemas';

RxDB.plugin(graphQlPlugin);

import graphQlClient from 'graphql-client';

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
        // console.dir(doc);
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
            const [c, server] = await Promise.all([
                humansCollection.createHumanWithTimestamp(0),
                SpawnServer.spawn(getTestData(batchSize))
            ]);
            const replicationState = c.syncGraphQl({
                url: server.url,
                pull: {
                    queryBuilder
                },
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
            const amount = batchSize * 4;
            const testData = getTestData(amount);
            const [c, server] = await Promise.all([
                humansCollection.createHumanWithTimestamp(0),
                SpawnServer.spawn(testData)
            ]);

            c.syncGraphQl({
                url: server.url,
                pull: {
                    queryBuilder
                },
                deletedFlag: 'deleted'
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
            const doc = schemaObjects.humanWithTimestamp();
            doc.deleted = true;
            const [c, server] = await Promise.all([
                humansCollection.createHumanWithTimestamp(0),
                SpawnServer.spawn([doc])
            ]);

            const replicationState = c.syncGraphQl({
                url: server.url,
                pull: {
                    queryBuilder
                },
                deletedFlag: 'deleted'
            });
            await replicationState.awaitInitialReplication();
            const docs = await c.find().exec();
            assert.equal(docs.length, 0);

            server.close();
            c.database.destroy();
        });
        it('should retry on errors', async () => {
            const amount = batchSize * 4;
            const testData = getTestData(amount);

            const [c, server] = await Promise.all([
                humansCollection.createHumanWithTimestamp(0),
                SpawnServer.spawn(testData)
            ]);

            const replicationState = c.syncGraphQl({
                url: ERROR_URL,
                pull: {
                    queryBuilder
                },
                deletedFlag: 'deleted'
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

            await replicationState.awaitInitialReplication();
            const docs = await c.find().exec();
            assert.equal(docs.length, amount);

            server.close();
            c.database.destroy();
        });
    });
    config.parallel('observables', () => {
        it('should emit the recieved documents when replicating', async () => {
            const testData = getTestData(batchSize);
            const [c, server] = await Promise.all([
                humansCollection.createHumanWithTimestamp(0),
                SpawnServer.spawn(testData)
            ]);

            const replicationState = c.syncGraphQl({
                url: server.url,
                pull: {
                    queryBuilder
                },
                deletedFlag: 'deleted'
            });

            const emitted = [];
            const sub = replicationState.recieved$.subscribe(doc => emitted.push(doc));

            await replicationState.awaitInitialReplication();
            assert.equal(emitted.length, batchSize);
            assert.deepEqual(testData, emitted);

            sub.unsubscribe();
            server.close();
            c.database.destroy();
        });
        it('should complete the replicationState afterwards', async () => {
            const [c, server] = await Promise.all([
                humansCollection.createHumanWithTimestamp(0),
                SpawnServer.spawn()
            ]);

            const replicationState = c.syncGraphQl({
                url: server.url,
                pull: {
                    queryBuilder
                },
                deletedFlag: 'deleted'
            });
            await replicationState.awaitInitialReplication();
            assert.equal(replicationState.isStopped(), true);

            server.close();
            c.database.destroy();
        });
        it('should emit the correct amount of active-changes', async () => {
            const amount = batchSize * 2;
            const testData = getTestData(amount);

            const [c, server] = await Promise.all([
                humansCollection.createHumanWithTimestamp(0),
                SpawnServer.spawn(testData)
            ]);

            const replicationState = c.syncGraphQl({
                url: server.url,
                pull: {
                    queryBuilder
                },
                deletedFlag: 'deleted'
            });

            const emitted = [];
            const sub = replicationState.active$.subscribe(d => emitted.push(d));

            await replicationState.awaitInitialReplication();
            console.dir(emitted);

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
                url: ERROR_URL,
                pull: {
                    queryBuilder
                },
                deletedFlag: 'deleted'
            });

            const error = await replicationState.error$.pipe(
                first()
            ).toPromise();

            assert.ok(error.toString().includes('foobar'));

            replicationState.cancel();
            c.database.destroy();
        });
        it('should not exit .run() before the batch is inserted and its events have been emitted', async () => {
            const c = await humansCollection.createHumanWithTimestamp(0);
            const server = await SpawnServer.spawn(getTestData(1));

            const replicationState = c.syncGraphQl({
                url: server.url,
                pull: {
                    queryBuilder
                },
                live: true,
                deletedFlag: 'deleted'
            });
            await replicationState.run();

            await AsyncTestUtil.waitUntil(async () => {
                const docsAfter = await c.find().exec();
                return docsAfter.length === 1;
            });

            const doc = schemaObjects.humanWithTimestamp();
            doc.deleted = false;
            await server.setDocument(doc);

            await replicationState.run();
            // directly after .run(), the doc must be available
            const docsAfter = await c.find().exec();
            assert.equal(docsAfter.length, 2);

            server.close();
            c.database.destroy();
        });
    });
    config.parallel('integrations', () => {
        it('should work with encryption', async () => {
            const db = await RxDB.create({
                name: util.randomCouchString(10),
                adapter: 'memory',
                multiInstance: true,
                queryChangeDetection: true,
                ignoreDuplicate: true,
                password: util.randomCouchString(10)
            });
            const schema = clone(schemas.humanWithTimestamp);
            schema.properties.name.encrypted = true;
            const collection = await db.collection({
                name: 'humans',
                schema
            });

            const testData = getTestData(1);
            testData[0].name = 'Alice';
            const server = await SpawnServer.spawn(testData);

            const replicationState = collection.syncGraphQl({
                url: server.url,
                pull: {
                    queryBuilder
                },
                deletedFlag: 'deleted'
            });
            await replicationState.awaitInitialReplication();

            const docs = await collection.find().exec();
            assert.equal(docs.length, 1);
            assert.equal(docs[0].name, 'Alice');

            const pouchDocs = await collection.pouch.find({
                selector: {
                    _id: {}
                }
            });
            assert.ok(pouchDocs.docs[0].name !== 'Alice');

            db.destroy();
        });
        it('should work with keyCompression', async () => {
            const db = await RxDB.create({
                name: util.randomCouchString(10),
                adapter: 'memory',
                multiInstance: true,
                queryChangeDetection: true,
                ignoreDuplicate: true,
                password: util.randomCouchString(10)
            });
            const schema = clone(schemas.humanWithTimestamp);
            schema.keyCompression = true;
            const collection = await db.collection({
                name: 'humans',
                schema
            });

            const testData = getTestData(1);
            testData[0].name = 'Alice';
            const server = await SpawnServer.spawn(testData);

            const replicationState = collection.syncGraphQl({
                url: server.url,
                pull: {
                    queryBuilder
                },
                deletedFlag: 'deleted'
            });
            await replicationState.awaitInitialReplication();

            const docs = await collection.find().exec();
            assert.equal(docs.length, 1);
            assert.equal(docs[0].name, 'Alice');

            const pouchDocs = await collection.pouch.find({
                selector: {
                    _id: {}
                }
            });

            // first key must be compressed
            assert.ok(Object.keys(pouchDocs.docs[0])[0].startsWith('|'));

            db.destroy();
        });
    });
    config.parallel('live:true pull only', () => {
        it('should also get documents that come in afterwards with active .run()', async () => {
            const [c, server] = await Promise.all([
                humansCollection.createHumanWithTimestamp(0),
                SpawnServer.spawn(getTestData(1))
            ]);
            const replicationState = c.syncGraphQl({
                url: server.url,
                pull: {
                    queryBuilder
                },
                live: true,
                deletedFlag: 'deleted'
            });


            // wait until first replication is done
            await replicationState.awaitInitialReplication();

            // add document & trigger pull
            const doc = getTestData(1).pop();
            await server.setDocument(doc);
            await replicationState.run();

            const docs = await c.find().exec();
            assert.equal(docs.length, 2);

            server.close();
            await c.database.destroy();

            // replication should be canceled when collection is destroyed
            assert.ok(replicationState.isStopped());
        });
        it('should also get documents that come in afterwards with interval .run()', async () => {
            const [c, server] = await Promise.all([
                humansCollection.createHumanWithTimestamp(0),
                SpawnServer.spawn(getTestData(1))
            ]);
            const replicationState = c.syncGraphQl({
                url: server.url,
                pull: {
                    queryBuilder
                },
                live: true,
                liveInterval: 50,
                deletedFlag: 'deleted'
            });

            await replicationState.awaitInitialReplication();

            // add document & trigger pull
            const doc = getTestData(1).pop();
            await server.setDocument(doc);

            await AsyncTestUtil.waitUntil(async () => {
                const docs = await c.find().exec();
                return docs.length === 2;
            });

            server.close();
            c.database.destroy();
        });
        it('should overwrite the local doc if the remote gets deleted', async () => {
            const testData = getTestData(batchSize);
            const [c, server] = await Promise.all([
                humansCollection.createHumanWithTimestamp(0),
                SpawnServer.spawn(testData)
            ]);
            const replicationState = c.syncGraphQl({
                url: server.url,
                pull: {
                    queryBuilder
                },
                live: true,
                deletedFlag: 'deleted'
            });

            await replicationState.awaitInitialReplication();

            const docs = await c.find().exec();
            assert.equal(docs.length, batchSize);

            const firstDoc = AsyncTestUtil.clone(testData[0]);
            firstDoc.deleted = true;

            await server.setDocument(firstDoc);
            await replicationState.run();

            const docs2 = await c.find().exec();
            assert.equal(docs2.length, batchSize - 1);

            server.close();
            c.database.destroy();
        });
        it('should overwrite the local doc if it was deleted locally', async () => {
            const c = await humansCollection.createHumanWithTimestamp(0);
            const localDoc = schemaObjects.humanWithTimestamp();
            const rxDoc = await c.insert(localDoc);
            await rxDoc.remove();

            const docs = await c.find().exec();
            assert.equal(docs.length, 0);

            const server = await SpawnServer.spawn();
            const replicationState = c.syncGraphQl({
                url: server.url,
                pull: {
                    queryBuilder
                },
                live: true,
                deletedFlag: 'deleted'
            });
            localDoc.deleted = false;
            await server.setDocument(localDoc);
            await replicationState.run();

            const docsAfter = await c.find().exec();
            assert.equal(docsAfter.length, 1);

            server.close();
            c.database.destroy();
        });
    });
});