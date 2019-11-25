import assert from 'assert';
import AsyncTestUtil, {
    clone
} from 'async-test-util';

import config from './config';
import * as schemaObjects from '../helper/schema-objects';
import {
    HumanWithTimestampDocumentType
} from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as util from '../../dist/lib/util';
import {
    PouchDB
} from '../../dist/lib/pouch-db';
import RxDB from '../../';
import GraphQLPlugin from '../../plugins/replication-graphql';
import * as schemas from '../helper/schemas';
import {
    GRAPHQL_PATH,
    GRAPHQL_SUBSCRIPTION_PATH,
    getDocsOnServer
} from '../helper/graphql-config';

import {
    GraphqlServer,
    GraphQLServerModule
} from '../helper/graphql-server';

RxDB.plugin(GraphQLPlugin);

import GraphQLClient from 'graphql-client';

import {
    getLastPushSequence,
    setLastPushSequence,
    getChangesSinceLastPushSequence,
    getLastPullDocument,
    setLastPullDocument
} from '../../dist/lib/plugins/replication-graphql/crawling-checkpoint';

import {
    createRevisionForPulledDocument,
    wasRevisionfromPullReplication,
    getDocsWithRevisionsFromPouch
} from '../../dist/lib/plugins/replication-graphql/helper';

import {
    first
} from 'rxjs/operators';

declare type WithDeleted<T> = T & { deleted: boolean };

describe('replication-graphql.test.js', () => {
    // for port see karma.config.js
    const browserServerUrl = 'http://localhost:18000' + GRAPHQL_PATH;


    const batchSize = 5;
    const queryBuilder = (doc: any) => {
        if (!doc) {
            doc = {
                id: '',
                updatedAt: 0
            };
        }
        const query = `{
            feedForRxDBReplication(lastId: "${doc.id}", minUpdatedAt: ${doc.updatedAt}, limit: ${batchSize}) {
                id
                name
                age
                updatedAt
                deleted
            }
        }`;
        const variables = {};
        return {
            query,
            variables
        };
    };
    const pushQueryBuilder = (doc: any) => {
        const query = `
        mutation CreateHuman($human: HumanInput) {
            setHuman(human: $human) {
                id,
                updatedAt
            }
        }
        `;
        const variables = {
            human: doc
        };

        return {
            query,
            variables
        };
    };

    describe('node', () => {
        if (!config.platform.isNode()) return;
        const REQUIRE_FUN = require;
        RxDB.plugin(REQUIRE_FUN('pouchdb-adapter-http'));
        const SpawnServer: GraphQLServerModule = REQUIRE_FUN('../helper/graphql-server');
        const ws = REQUIRE_FUN('ws');
        const { SubscriptionClient } = REQUIRE_FUN('subscriptions-transport-ws');
        const ERROR_URL = 'http://localhost:15898/foobar';
        const getEndpointHash = () => util.hash(AsyncTestUtil.randomString(10));
        const getTimestamp = () => Math.round(new Date().getTime() / 1000);
        const endpointHash = getEndpointHash(); // used when we not care about it's value
        const getTestData = (amount: any) => {
            return new Array(amount).fill(0)
                .map(() => schemaObjects.humanWithTimestamp())
                .map((doc: any) => {
                    doc['deleted'] = false;
                    return doc;
                });
        };
        config.parallel('graphql-server.js', () => {
            it('spawn, reach and close a server', async () => {
                const server = await SpawnServer.spawn();
                const res = await server.client.query(`{
                 info
            }`);
                assert.strictEqual(res.data.info, 1);
                server.close();
            });
            it('server.setDocument()', async () => {
                const server = await SpawnServer.spawn();
                const doc = getTestData(1).pop();
                const res = await server.setDocument(doc);
                assert.strictEqual(res.data.setHuman.id, doc.id);
                server.close();
            });
            it('should be able to use the ws-subscriptions', async () => {
                const server = await SpawnServer.spawn();

                const endpointUrl = 'ws://localhost:' + server.wsPort + '/subscriptions';
                const client = new SubscriptionClient(
                    endpointUrl,
                    {
                        reconnect: true,
                    },
                    ws
                );

                const query = `subscription onHumanChanged {
                    humanChanged {
                        id
                    }
                }`;

                const ret = client.request({ query });
                const emitted: any[] = [];
                const emittedError = [];
                ret.subscribe({
                    next(data: any) {
                        emitted.push(data);
                    },
                    error(error: any) {
                        emittedError.push(error);
                    }
                });

                // we have to wait here until the connection is established
                await AsyncTestUtil.wait(300);

                const doc = getTestData(1).pop();
                await server.setDocument(doc);

                await AsyncTestUtil.waitUntil(() => emitted.length === 1);
                assert.ok(emitted[0].data.humanChanged.id);
                assert.strictEqual(emittedError.length, 0);

                server.close();
            });
        });
        /**
         * we assume some behavior of pouchdb
         * which is ensured with these tests
         */
        config.parallel('assumptions', () => {
            it('should be possible to retrieve deleted documents in pouchdb', async () => {
                const c = await humansCollection.createHumanWithTimestamp(2);
                const pouch = c.pouch;
                const doc = await c.findOne().exec();
                await doc.remove();

                // get deleted and undeleted from pouch
                const deletedDocs = await pouch.allDocs({
                    include_docs: true,
                    deleted: 'ok'
                });
                assert.strictEqual(deletedDocs.rows.length, 2);
                const deletedDoc = deletedDocs.rows.find((d: any) => d.value.deleted);
                const notDeletedDoc = deletedDocs.rows.find((d: any) => !d.value.deleted);
                assert.ok(deletedDoc);
                assert.ok(notDeletedDoc);

                c.database.destroy();
            });
            it('should be possible to set a custom _rev', async () => {
                const c = await humansCollection.createHumanWithTimestamp(1);
                const pouch = c.pouch;
                const doc = await c.findOne().exec();
                const docData = doc.toJSON();
                const customRev = '2-fadae8ee3847d0748381f13988e95502-rxdb-from-graphql';
                docData._id = docData.id;
                docData._rev = customRev;
                docData.name = 'Alice';

                await pouch.bulkDocs(
                    {
                        docs: [docData]
                    },
                    {
                        new_edits: false
                    }
                );


                const pouchDocs = await pouch.find({
                    selector: {
                        _id: {}
                    }
                });
                assert.strictEqual(pouchDocs.docs.length, 1);
                assert.strictEqual(pouchDocs.docs[0]._rev, customRev);
                assert.strictEqual(pouchDocs.docs[0].name, 'Alice');

                c.database.destroy();
            });
            it('should be possible to delete documents via PouchDB().bulkDocs() with new_edits: false and a custom _rev', async () => {
                const pouch = new PouchDB(
                    'pouchdb-test-delete-document-via-bulk-docs',
                    {
                        adapter: 'memory'
                    }
                );

                const putResult = await pouch.put({
                    _id: 'Alice',
                    age: 42
                });
                // update once to increase revs
                await pouch.put({
                    _id: 'Alice',
                    age: 43,
                    _rev: putResult.rev
                });

                const allDocs = await pouch.allDocs({});
                const bulkGetDocs = await pouch.bulkGet({
                    docs: [
                        {
                            id: 'Alice',
                            rev: allDocs.rows[0].value.rev
                        }
                    ],
                    revs: true,
                    latest: true
                });

                const overwriteDoc = bulkGetDocs.results[0].docs[0].ok;

                const addRev = 'ZZZ-rxdb-from-graphql';
                overwriteDoc._revisions.ids.unshift(addRev);
                overwriteDoc._revisions.start = 3;
                overwriteDoc._deleted = true;
                overwriteDoc._rev = '3-' + addRev;

                await pouch.bulkDocs(
                    {
                        docs: [
                            overwriteDoc
                        ],
                        new_edits: false
                    },
                    {
                    }
                );

                const docsAfter = await pouch.allDocs({
                    include_docs: true
                });
                assert.strictEqual(docsAfter.rows.length, 0);


                const docsAfterWithDeleted = await pouch.allDocs({
                    include_docs: true,
                    deleted: 'ok'
                });
                assert.strictEqual(docsAfterWithDeleted.rows.length, 1);

                pouch.destroy();
            });
            it('should be possible to get all revisions from a document', async () => {
                const pouch = new PouchDB(
                    'pouchdb-test-get-all-revs-from-a-doc',
                    {
                        adapter: 'memory'
                    }
                );
                await pouch.put({
                    _id: 'AliceOne',
                    age: 42
                });


                const putResult = await pouch.put({
                    _id: 'Alice',
                    age: 42
                });
                // update once to increase revs
                const putResult2 = await pouch.put({
                    _id: 'Alice',
                    age: 43,
                    _rev: putResult.rev
                });

                // delete
                await pouch.put({
                    _id: 'Alice',
                    age: 43,
                    _rev: putResult2.rev,
                    _deleted: true
                });

                const allDocs = await pouch.allDocs({
                    key: 'Alice',
                    revs: true,
                    deleted: 'ok'
                });
                assert.strictEqual(allDocs.rows.length, 1);
                assert.strictEqual(allDocs.rows[0].id, 'Alice');


                const firstFromAll = allDocs.rows[0];
                const bulkGetDocs = await pouch.bulkGet({
                    docs: [
                        {
                            id: 'Alice',
                            rev: firstFromAll.value.rev
                        }
                    ],
                    revs: true,
                    latest: true
                });
                assert.strictEqual(bulkGetDocs.results.length, 1);
                assert.strictEqual(bulkGetDocs.results[0].docs[0].ok._revisions.ids.length, 3);

                pouch.destroy();
            });
        });
        config.parallel('helper', () => {
            describe('.createRevisionForPulledDocument()', () => {
                it('should create a revision', () => {
                    const rev = createRevisionForPulledDocument(
                        endpointHash,
                        {}
                    );

                    assert.ok(rev.length > 10);
                });
            });
            describe('.wasRevisionfromPullReplication()', () => {
                it('should be true on equal endpointHash', () => {
                    const rev = createRevisionForPulledDocument(
                        endpointHash,
                        {}
                    );
                    const ok = wasRevisionfromPullReplication(
                        endpointHash,
                        rev
                    );

                    assert.ok(ok);
                });
                it('should be false on non-equal endpointHash', () => {
                    const rev = createRevisionForPulledDocument(
                        getEndpointHash(),
                        {}
                    );
                    const ok = wasRevisionfromPullReplication(
                        getEndpointHash(),
                        rev
                    );

                    assert.strictEqual(ok, false);
                });
            });
            describe('.getDocsWithRevisionsFromPouch()', () => {
                it('should get all old revisions', async () => {
                    const c = await humansCollection.createHumanWithTimestamp(3);

                    const docs = await c.find().exec();
                    const docIds = docs.map(d => d.primary);

                    // edit and remove one
                    const doc1 = docs[0];
                    await doc1.atomicSet('age', 99);
                    await doc1.remove();

                    // edit one twice
                    const doc2 = docs[1];
                    await doc2.atomicSet('age', 66);
                    await doc2.atomicSet('age', 67);

                    //  not edited
                    const doc3 = docs[2];


                    const result = await getDocsWithRevisionsFromPouch(
                        c,
                        docIds
                    );

                    assert.strictEqual(Object.keys(result).length, 3);

                    const notEdited = result[doc3.primary];
                    assert.strictEqual(notEdited.revisions.start, 1);
                    assert.strictEqual(notEdited.revisions.ids.length, 1);

                    const editedAndRemoved = result[doc1.primary];
                    assert.strictEqual(editedAndRemoved.revisions.start, 3);
                    assert.strictEqual(editedAndRemoved.revisions.ids.length, 3);
                    assert.strictEqual(editedAndRemoved.deleted, true);

                    const editedTwice = result[doc2.primary];
                    assert.strictEqual(editedTwice.revisions.start, 3);
                    assert.strictEqual(editedTwice.revisions.ids.length, 3);
                    assert.strictEqual(editedTwice.deleted, false);

                    c.database.destroy();
                });
                it('should be able to find data for documents that have been set via bulkDocs', async () => {
                    const c = await humansCollection.createHumanWithTimestamp(0);

                    const id = 'foobarid';
                    const docData: any = {
                        _id: id,
                        name: 'Jermain',
                        age: 67,
                        updatedAt: 1563897269,
                    };
                    // 1-b6986d59-46373946-rxdb-replication-graphql
                    const rev = '1-' + createRevisionForPulledDocument(
                        endpointHash,
                        docData
                    );
                    docData['_rev'] = rev;

                    await c.pouch.bulkDocs(
                        [
                            docData
                        ], {
                        new_edits: false
                    }
                    );

                    const result = await getDocsWithRevisionsFromPouch(
                        c,
                        [id]
                    );
                    assert.ok(result[id].doc);
                    c.database.destroy();
                });
            });
        });
        config.parallel('crawling-checkpoint', () => {
            describe('.setLastPushSequence()', () => {
                it('should set the last push sequence', async () => {
                    const c = await humansCollection.createHumanWithTimestamp(0);
                    const ret = await setLastPushSequence(
                        c,
                        getEndpointHash(),
                        1
                    );
                    assert.ok(ret.id.startsWith(util.LOCAL_PREFIX));
                    c.database.destroy();
                });
                it('should be able to run multiple times', async () => {
                    const useEndpointHash = getEndpointHash();
                    const c = await humansCollection.createHumanWithTimestamp(0);
                    await setLastPushSequence(
                        c,
                        useEndpointHash,
                        1
                    );
                    await setLastPushSequence(
                        c,
                        useEndpointHash,
                        2
                    );
                    c.database.destroy();
                });
            });
            describe('.getLastPushSequence()', () => {
                it('should get null if not set before', async () => {
                    const useEndpointHash = getEndpointHash();
                    const c = await humansCollection.createHumanWithTimestamp(0);
                    const ret = await getLastPushSequence(
                        c,
                        useEndpointHash
                    );
                    assert.strictEqual(ret, 0);
                    c.database.destroy();
                });
                it('should get the value if set before', async () => {
                    const useEndpointHash = getEndpointHash();
                    const c = await humansCollection.createHumanWithTimestamp(0);
                    await setLastPushSequence(
                        c,
                        useEndpointHash,
                        5
                    );
                    const ret = await getLastPushSequence(
                        c,
                        useEndpointHash
                    );
                    assert.strictEqual(ret, 5);
                    c.database.destroy();
                });
                it('should get the value if set multiple times', async () => {
                    const useEndpointHash = getEndpointHash();
                    const c = await humansCollection.createHumanWithTimestamp(0);
                    await setLastPushSequence(
                        c,
                        useEndpointHash,
                        5
                    );
                    const ret = await getLastPushSequence(
                        c,
                        useEndpointHash
                    );
                    assert.strictEqual(ret, 5);

                    await setLastPushSequence(
                        c,
                        useEndpointHash,
                        10
                    );
                    const ret2 = await getLastPushSequence(
                        c,
                        useEndpointHash
                    );
                    assert.strictEqual(ret2, 10);
                    c.database.destroy();
                });
            });
            describe('.getChangesSinceLastPushSequence()', () => {
                it('should get all changes', async () => {
                    const amount = 5;
                    const c = await humansCollection.createHumanWithTimestamp(amount);
                    const changes = await getChangesSinceLastPushSequence(
                        c,
                        endpointHash,
                        10
                    );
                    assert.strictEqual(changes.results.length, amount);
                    assert.ok(changes.results[0].doc.name);
                    c.database.destroy();
                });
                it('should get only the newest update to documents', async () => {
                    const amount = 5;
                    const c = await humansCollection.createHumanWithTimestamp(amount);
                    const oneDoc = await c.findOne().exec();
                    await oneDoc.atomicSet('age', 1);
                    const changes = await getChangesSinceLastPushSequence(
                        c,
                        endpointHash,
                        10
                    );
                    assert.strictEqual(changes.results.length, amount);
                    c.database.destroy();
                });
                it('should not get more changes then the limit', async () => {
                    const amount = 30;
                    const c = await humansCollection.createHumanWithTimestamp(amount);
                    const changes = await getChangesSinceLastPushSequence(
                        c,
                        endpointHash,
                        10
                    );
                    assert.strictEqual(changes.results.length, 10);
                    c.database.destroy();
                });
                it('should get deletions', async () => {
                    const amount = 5;
                    const c = await humansCollection.createHumanWithTimestamp(amount);
                    const oneDoc = await c.findOne().exec();
                    await oneDoc.remove();
                    const changes = await getChangesSinceLastPushSequence(
                        c,
                        endpointHash,
                        10
                    );
                    assert.strictEqual(changes.results.length, amount);
                    const deleted = changes.results.find((change: any) => change.doc._deleted === true);
                    assert.ok(deleted);
                    c.database.destroy();
                });
                it('should have resolved the primary', async () => {
                    const amount = 5;
                    const c = await humansCollection.createHumanWithTimestamp(amount);
                    const changes = await getChangesSinceLastPushSequence(
                        c,
                        endpointHash,
                        10
                    );
                    const firstDoc = changes.results[0];
                    assert.ok(firstDoc.doc.id);
                    c.database.destroy();
                });
                it('should have filtered out replicated docs from the endpoint', async () => {
                    const amount = 5;
                    const c = await humansCollection.createHumanWithTimestamp(amount);
                    const toPouch: any = schemaObjects.humanWithTimestamp();
                    toPouch['_rev'] = '1-' + createRevisionForPulledDocument(
                        endpointHash,
                        toPouch
                    );

                    await c.pouch.bulkDocs([c._handleToPouch(toPouch)], {
                        new_edits: false
                    });

                    const allDocs = await c.find().exec();
                    assert.strictEqual(allDocs.length, amount + 1);

                    const changes = await getChangesSinceLastPushSequence(
                        c,
                        endpointHash,
                        10
                    );

                    assert.strictEqual(changes.results.length, amount);
                    const shouldNotBeFound = changes.results.find((change: any) => change.id === toPouch.id);
                    assert.ok(!shouldNotBeFound);
                    assert.strictEqual(changes.last_seq, amount + 1);
                    c.database.destroy();
                });
            });
            describe('.setLastPullDocument()', () => {
                it('should set the document', async () => {
                    const c = await humansCollection.createHumanWithTimestamp(1);
                    const doc = await c.findOne().exec();
                    const docData = doc.toJSON(true);
                    const ret = await setLastPullDocument(
                        c,
                        endpointHash,
                        docData
                    );
                    assert.ok(ret.id.startsWith(util.LOCAL_PREFIX));
                    c.database.destroy();
                });
                it('should be able to run multiple times', async () => {
                    const c = await humansCollection.createHumanWithTimestamp(1);
                    const doc = await c.findOne().exec();
                    const docData = doc.toJSON(true);
                    await setLastPullDocument(
                        c,
                        endpointHash,
                        docData
                    );
                    const ret = await setLastPullDocument(
                        c,
                        endpointHash,
                        docData
                    );
                    assert.ok(ret.id.startsWith(util.LOCAL_PREFIX));
                    c.database.destroy();
                });
            });
            describe('.getLastPullDocument()', () => {
                it('should return null if no doc set', async () => {
                    const c = await humansCollection.createHumanWithTimestamp(0);
                    const ret = await getLastPullDocument(
                        c,
                        endpointHash
                    );
                    assert.strictEqual(ret, null);
                    c.database.destroy();
                });
                it('should return the doc if it was set', async () => {
                    const c = await humansCollection.createHumanWithTimestamp(1);
                    const doc = await c.findOne().exec();
                    const docData = doc.toJSON(true);
                    docData.name = 'foobar';
                    await setLastPullDocument(
                        c,
                        endpointHash,
                        docData
                    );
                    const ret = await getLastPullDocument(
                        c,
                        endpointHash
                    );
                    assert.strictEqual(ret.name, 'foobar');
                    c.database.destroy();
                });
            });
        });
        config.parallel('live:false pull only', () => {
            it('should pull all documents in one batch', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(getTestData(batchSize))
                ]);
                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder
                    },
                    deletedFlag: 'deleted'
                });
                assert.strictEqual(replicationState.isStopped(), false);

                await AsyncTestUtil.waitUntil(async () => {
                    const docs = await c.find().exec();
                    return docs.length === batchSize;
                });

                server.close();
                c.database.destroy();
            });
            it('pulled docs should be marked with a special revision', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(getTestData(batchSize))
                ]);
                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder
                    },
                    deletedFlag: 'deleted',
                    live: false
                });
                await replicationState.awaitInitialReplication();

                const docs = await c.find().exec();
                const docsRev = docs.map(doc => doc.toJSON(true)._rev);

                docsRev.forEach(rev => {
                    const ok = wasRevisionfromPullReplication(
                        replicationState.endpointHash,
                        rev
                    );
                    assert.ok(ok);
                });


                await AsyncTestUtil.waitUntil(async () => {
                    const ds = await c.find().exec();
                    return ds.length === batchSize;
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

                c.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder
                    },
                    live: false,
                    deletedFlag: 'deleted'
                });


                await AsyncTestUtil.waitUntil(async () => {
                    const ds = await c.find().exec();
                    return ds.length === amount;
                });

                // all of test-data should be in the database
                const docs = await c.find().exec();
                const ids = docs.map(d => d.primary);
                const notInDb = testData.find(doc => !ids.includes(doc.id));
                if (notInDb) throw new Error('not in db: ' + notInDb.id);

                server.close();
                c.database.destroy();
            });
            it('should pull all documents when they have the same timestamp because they are also sorted by id', async () => {
                const amount = batchSize * 2;
                const testData = getTestData(amount);
                const timestamp = getTimestamp();
                testData.forEach(d => d.updatedAt = timestamp);
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(testData)
                ]);

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder
                    },
                    live: false,
                    deletedFlag: 'deleted'
                });

                await replicationState.awaitInitialReplication();

                const docsInDb = await c.find().exec();
                assert.strictEqual(docsInDb.length, amount);

                server.close();
                c.database.destroy();
            });
            it('should handle deleted documents', async () => {
                const doc: any = schemaObjects.humanWithTimestamp();
                doc['deleted'] = true;
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn([doc])
                ]);

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder
                    },
                    deletedFlag: 'deleted'
                });
                await replicationState.awaitInitialReplication();
                const docs = await c.find().exec();
                assert.strictEqual(docs.length, 0);

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

                const replicationState = c.syncGraphQL({
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
                    const client = GraphQLClient({
                        url: server.url
                    });
                    replicationState.client = client;
                });

                await replicationState.awaitInitialReplication();
                const docs = await c.find().exec();
                assert.strictEqual(docs.length, amount);

                server.close();
                c.database.destroy();
            });
        });
        config.parallel('live:true pull only', () => {
            it('should also get documents that come in afterwards with active .run()', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(getTestData(1))
                ]);
                const replicationState = c.syncGraphQL({
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
                assert.strictEqual(docs.length, 2);

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
                const replicationState = c.syncGraphQL({
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
                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder
                    },
                    live: true,
                    deletedFlag: 'deleted'
                });

                await replicationState.awaitInitialReplication();

                const docs = await c.find().exec();
                assert.strictEqual(docs.length, batchSize);

                const firstDoc = AsyncTestUtil.clone(testData[0]);
                firstDoc.deleted = true;

                await server.setDocument(firstDoc);
                await replicationState.run();

                const docs2 = await c.find().exec();
                assert.strictEqual(docs2.length, batchSize - 1);

                server.close();
                c.database.destroy();
            });
            it('should overwrite the local doc if it was deleted locally', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const localDoc: any = schemaObjects.humanWithTimestamp();
                const rxDoc = await c.insert(localDoc);
                await rxDoc.remove();

                const docs = await c.find().exec();
                assert.strictEqual(docs.length, 0);

                const server = await SpawnServer.spawn();
                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder
                    },
                    live: true,
                    deletedFlag: 'deleted'
                });
                localDoc['deleted'] = false;
                await server.setDocument(localDoc);
                await replicationState.run();

                const docsAfter = await c.find().exec();
                assert.strictEqual(docsAfter.length, 1);

                server.close();
                c.database.destroy();
            });
        });

        config.parallel('push only', () => {
            it('should send all documents in one batch', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(batchSize),
                    SpawnServer.spawn()
                ]);
                const replicationState = c.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    live: false,
                    deletedFlag: 'deleted'
                });

                await replicationState.awaitInitialReplication();

                const docsOnServer = server.getDocuments();
                assert.strictEqual(docsOnServer.length, batchSize);

                server.close();
                c.database.destroy();
            });
            it('should send all documents in multiple batches', async () => {
                const amount = batchSize * 3;
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(amount),
                    SpawnServer.spawn()
                ]);
                const replicationState = c.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    live: false,
                    deletedFlag: 'deleted'
                });

                await replicationState.awaitInitialReplication();

                const docsOnServer = server.getDocuments();
                assert.strictEqual(docsOnServer.length, amount);

                server.close();
                c.database.destroy();
            });
            it('should send deletions', async () => {
                const amount = batchSize;
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(amount),
                    SpawnServer.spawn<WithDeleted<HumanWithTimestampDocumentType>>()
                ]);

                const doc = await c.findOne().exec();
                await doc.remove();

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    live: false,
                    deletedFlag: 'deleted'
                });

                await replicationState.awaitInitialReplication();
                const docsOnServer = server.getDocuments();

                const shouldBeDeleted = docsOnServer.find((d: any) => d.id === doc.primary);
                assert.strictEqual(shouldBeDeleted.deleted, true);

                server.close();
                c.database.destroy();
            });
            it('should trigger push on db-changes that have not resulted from the replication', async () => {
                const amount = batchSize;
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(amount),
                    SpawnServer.spawn()
                ]);

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    live: true,
                    liveInterval: 1000 * 60, // height
                    deletedFlag: 'deleted'
                });

                await replicationState.awaitInitialReplication();


                const docsOnServer = server.getDocuments();
                assert.strictEqual(docsOnServer.length, amount);

                // check for inserts
                await c.insert(schemaObjects.humanWithTimestamp());
                await AsyncTestUtil.waitUntil(async () => {
                    const docsOnServer2 = server.getDocuments();
                    return docsOnServer2.length === amount + 1;
                });

                // check for deletes
                await c.findOne().remove();
                await AsyncTestUtil.waitUntil(async () => {
                    const docsOnServer2 = server.getDocuments();
                    const oneShouldBeDeleted = docsOnServer2.find((d: any) => d.deleted === true);
                    return !!oneShouldBeDeleted;
                });

                server.close();
                c.database.destroy();
            });
            it('should not send index-documents', async () => {
                const server = await SpawnServer.spawn();
                const db = await RxDB.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory',
                    ignoreDuplicate: true
                });

                const schema = clone(schemas.humanWithTimestamp);
                schema.properties.name.index = true;
                const collection = await db.collection({
                    name: 'humans',
                    schema
                });

                const replicationState = collection.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    live: false,
                    deletedFlag: 'deleted'
                });

                const emitted = [];
                replicationState.error$.subscribe(err => {
                    emitted.push(err);
                });

                await replicationState.awaitInitialReplication();

                const docsOnServer = server.getDocuments();
                assert.strictEqual(docsOnServer.length, 0);
                assert.strictEqual(emitted.length, 0);

                server.close();
                db.destroy();
            });
        });
        config.parallel('push and pull', () => {
            it('should push and pull all docs; live: false', async () => {
                const amount = batchSize * 4;
                const testData = getTestData(amount);
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(amount),
                    SpawnServer.spawn(testData)
                ]);

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    pull: {
                        queryBuilder
                    },
                    live: false,
                    deletedFlag: 'deleted'
                });

                await replicationState.awaitInitialReplication();

                const docsOnServer = server.getDocuments();
                assert.strictEqual(docsOnServer.length, amount * 2);

                const docsOnDb = await c.find().exec();
                assert.strictEqual(docsOnDb.length, amount * 2);

                server.close();
                c.database.destroy();
            });
            it('should push and pull some docs; live: true', async () => {
                const amount = batchSize * 1;
                const testData = getTestData(amount);
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(amount),
                    SpawnServer.spawn(testData)
                ]);

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    pull: {
                        queryBuilder
                    },
                    live: true,
                    deletedFlag: 'deleted',
                    liveInterval: 60 * 1000
                });

                await replicationState.awaitInitialReplication();

                const docsOnServer = server.getDocuments();
                assert.strictEqual(docsOnServer.length, amount * 2);

                const docsOnDb = await c.find().exec();
                assert.strictEqual(docsOnDb.length, amount * 2);


                // insert one on local and one on server
                const doc: any = schemaObjects.humanWithTimestamp();
                doc['deleted'] = false;
                await server.setDocument(doc);

                const insertData = schemaObjects.humanWithTimestamp();
                await c.insert(insertData);

                await AsyncTestUtil.waitUntil(async () => {
                    /**
                     * we have to do replicationState.run() each time
                     * because pouchdb takes a while until the update_seq is increased
                     */
                    await replicationState.run();
                    const docsOnServer2 = server.getDocuments();
                    const shouldBe = (amount * 2) + 2;
                    return docsOnServer2.length === shouldBe;
                });
                await AsyncTestUtil.waitUntil(async () => {
                    const docsOnDb2 = server.getDocuments();
                    return docsOnDb2.length === (amount * 2) + 2;
                });
                server.close();
                c.database.destroy();
            });
            it('should push and pull many docs; live: true', async () => {
                const amount = batchSize * 4;
                const testData = getTestData(amount);
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(amount),
                    SpawnServer.spawn(testData)
                ]);

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    pull: {
                        queryBuilder
                    },
                    live: true,
                    deletedFlag: 'deleted',
                    liveInterval: 60 * 1000
                });

                await replicationState.awaitInitialReplication();

                const docsOnServer = server.getDocuments();
                assert.strictEqual(docsOnServer.length, amount * 2);

                const docsOnDb = await c.find().exec();
                assert.strictEqual(docsOnDb.length, amount * 2);


                // insert one on local and one on server
                const doc: any = schemaObjects.humanWithTimestamp();
                doc['deleted'] = false;
                await server.setDocument(doc);
                await c.insert(schemaObjects.humanWithTimestamp());

                await AsyncTestUtil.waitUntil(async () => {
                    /**
                     * we have to do replicationState.run() each time
                     * because pouchdb takes a while until the update_seq is increased
                     */
                    await replicationState.run();
                    const docsOnServer2 = server.getDocuments();
                    const shouldBe = (amount * 2) + 2;
                    return docsOnServer2.length === shouldBe;
                });
                await AsyncTestUtil.waitUntil(async () => {
                    const docsOnDb2 = server.getDocuments();
                    return docsOnDb2.length === (amount * 2) + 2;
                });

                server.close();
                c.database.destroy();
            });
            it('should not stack up run()-calls more then 2', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn()
                ]);

                const replicationState = c.syncGraphQL({
                    url: ERROR_URL,
                    pull: {
                        queryBuilder
                    },
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    deletedFlag: 'deleted',
                    live: false
                });

                // change replicationState._run to count the calls
                const oldRun = replicationState._run.bind(replicationState);
                let count = 0;
                const newRun = function () {
                    count++;
                    return oldRun();
                };
                replicationState._run = newRun;

                const amount = 50;
                // call .run() often
                await Promise.all(
                    new Array(amount).fill(0).map(
                        () => replicationState.run()
                    )
                );

                assert.ok(count < 10);
                assert.strictEqual(replicationState._runQueueCount, 0);

                server.close();
                c.database.destroy();
            });
            it('should work with multiInstance', async () => {
                const name = util.randomCouchString(10);
                const server = await SpawnServer.spawn();

                const db1 = await RxDB.create({
                    name,
                    adapter: 'memory',
                    ignoreDuplicate: true
                });
                const db2 = await RxDB.create({
                    name,
                    adapter: 'memory',
                    ignoreDuplicate: true
                });

                const collection1 = await db1.collection({
                    name: 'humans',
                    schema: schemas.humanWithTimestamp
                });
                const collection2 = await db2.collection({
                    name: 'humans',
                    schema: schemas.humanWithTimestamp
                });

                collection1.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder
                    },
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    deletedFlag: 'deleted',
                    live: true
                });
                collection2.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder
                    },
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    deletedFlag: 'deleted',
                    live: false
                });


                // insert to collection1
                await collection1.insert(schemaObjects.humanWithTimestamp());
                await AsyncTestUtil.waitUntil(async () => {
                    const docs = await collection2.find().exec();
                    return docs.length === 1;
                });

                // insert to collection2
                await collection2.insert(schemaObjects.humanWithTimestamp());
                await AsyncTestUtil.waitUntil(async () => {
                    const docs = await collection1.find().exec();
                    return docs.length === 2;
                });

                db1.destroy();
                db2.destroy();
            });
        });

        config.parallel('observables', () => {
            it('should emit the recieved documents when pulling', async () => {
                const testData = getTestData(batchSize);
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(testData)
                ]);

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder
                    },
                    deletedFlag: 'deleted'
                });

                const emitted: any[] = [];
                const sub = replicationState.recieved$.subscribe(doc => emitted.push(doc));

                await replicationState.awaitInitialReplication();
                assert.strictEqual(emitted.length, batchSize);
                assert.deepStrictEqual(testData, emitted);

                sub.unsubscribe();
                server.close();
                c.database.destroy();
            });
            it('should emit the send documents when pushing', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(batchSize),
                    SpawnServer.spawn()
                ]);

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    push: {
                        queryBuilder: pushQueryBuilder,
                        batchSize
                    },
                    live: false,
                    deletedFlag: 'deleted'
                });

                const emitted: any[] = [];
                const sub = replicationState.send$.subscribe(doc => emitted.push(doc));
                await replicationState.awaitInitialReplication();

                assert.strictEqual(emitted.length, batchSize);

                const docs = await c.find().exec();
                assert.deepStrictEqual(
                    emitted.map(d => d.id).sort(),
                    docs.map(d => d.primary).sort()
                );

                sub.unsubscribe();
                server.close();
                c.database.destroy();
            });
            it('should complete the replicationState afterwards', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn()
                ]);

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder
                    },
                    deletedFlag: 'deleted'
                });
                await replicationState.awaitInitialReplication();
                assert.strictEqual(replicationState.isStopped(), true);

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

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder
                    },
                    deletedFlag: 'deleted'
                });

                const emitted: any[] = [];
                const sub = replicationState.active$.subscribe(d => emitted.push(d));

                await replicationState.awaitInitialReplication();

                assert.strictEqual(emitted.length, 3);
                const last = emitted.pop();
                assert.strictEqual(last, false);

                sub.unsubscribe();
                server.close();
                c.database.destroy();
            });
            it('should emit an error when the server is not reachable', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const replicationState = c.syncGraphQL({
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

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder
                    },
                    live: true,
                    deletedFlag: 'deleted'
                });
                await replicationState.run();

                await AsyncTestUtil.waitUntil(async () => {
                    const docsAfter2 = await c.find().exec();
                    return docsAfter2.length === 1;
                });

                const doc: any = schemaObjects.humanWithTimestamp();
                doc['deleted'] = false;
                await server.setDocument(doc);

                await replicationState.run();
                // directly after .run(), the doc must be available
                const docsAfter = await c.find().exec();
                assert.strictEqual(docsAfter.length, 2);

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

                const replicationState = collection.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder
                    },
                    deletedFlag: 'deleted'
                });
                await replicationState.awaitInitialReplication();

                const docs = await collection.find().exec();
                assert.strictEqual(docs.length, 1);
                assert.strictEqual(docs[0].name, 'Alice');

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

                const replicationState = collection.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder
                    },
                    deletedFlag: 'deleted'
                });
                await replicationState.awaitInitialReplication();

                const docs = await collection.find().exec();
                assert.strictEqual(docs.length, 1);
                assert.strictEqual(docs[0].name, 'Alice');

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

        config.parallel('issues', () => {
            it('push not working on slow db', async () => {
                const db = await RxDB.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory',
                    multiInstance: true,
                    queryChangeDetection: true,
                    ignoreDuplicate: true,
                    password: util.randomCouchString(10)
                });
                const schema = clone(schemas.humanWithTimestampAllIndex);
                schema.properties.name.encrypted = true;
                const collection = await db.collection({
                    name: 'humans',
                    schema
                });

                // insert data to slow down the db
                const amount = 30;
                await Promise.all(
                    new Array(amount).fill(0)
                        .map(() => schemaObjects.humanWithTimestamp())
                        .map(d => collection.insert(d))
                );

                const testData = getTestData(0);
                const server = await SpawnServer.spawn(testData);

                const replicationState = collection.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    live: true,
                    deletedFlag: 'deleted'
                });
                await replicationState.awaitInitialReplication();
                const docsOnServer = server.getDocuments();
                assert.strictEqual(docsOnServer.length, amount);

                // insert one which will trigger an auto push
                await collection.insert(schemaObjects.humanWithTimestamp());

                await AsyncTestUtil.waitUntil(async () => {
                    const docs = await server.getDocuments();
                    return docs.length === (amount + 1);
                });

                server.close();
                db.destroy();
            });
            it('push not working when big amount of docs is pulled before', async () => {
                const db = await RxDB.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory',
                    multiInstance: true,
                    queryChangeDetection: true,
                    ignoreDuplicate: true,
                    password: util.randomCouchString(10)
                });
                const schema = clone(schemas.humanWithTimestampAllIndex);
                schema.properties.name.encrypted = true;
                const collection = await db.collection({
                    name: 'humans',
                    schema
                });

                const amount = 50;
                const testData = getTestData(amount);
                const server = await SpawnServer.spawn(testData);

                const replicationState = collection.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    pull: {
                        queryBuilder
                    },
                    live: true,
                    deletedFlag: 'deleted'
                });
                await replicationState.awaitInitialReplication();

                const docsOnServer = server.getDocuments();
                assert.strictEqual(docsOnServer.length, amount);

                // insert one which will trigger an auto push
                await collection.insert(schemaObjects.humanWithTimestamp());

                await AsyncTestUtil.waitUntil(async () => {
                    const docs = await server.getDocuments();
                    return docs.length === (amount + 1);
                });

                server.close();
                db.destroy();
            });
        });
    });
    describe('browser', () => {
        if (config.platform.isNode()) return;
        describe('issues', () => {
            it('push not working on slow db', async () => {
                const dbName = util.randomCouchString(10);
                const db = await RxDB.create({
                    name: dbName,
                    adapter: 'idb',
                    multiInstance: true,
                    queryChangeDetection: true,
                    ignoreDuplicate: true
                });
                const collection = await db.collection({
                    name: 'humans',
                    schema: schemas.humanWithTimestampAllIndex
                });

                // insert data to slow down the db
                const amount = 30;
                await Promise.all(
                    new Array(amount).fill(0)
                        .map(() => schemaObjects.humanWithTimestamp())
                        .map(d => collection.insert(d))
                );

                const replicationState = collection.syncGraphQL({
                    url: browserServerUrl,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    live: false,
                    deletedFlag: 'deleted'
                });
                await replicationState.awaitInitialReplication();

                const docsStart = await getDocsOnServer(replicationState);

                // amount might be bigger if 2 browser run parallel
                assert.ok(docsStart.length >= amount);

                await db.destroy();

                // insert one in new instance of same db
                // which will trigger an auto push
                const db2 = await RxDB.create({
                    name: dbName,
                    adapter: 'idb',
                    multiInstance: true,
                    queryChangeDetection: true,
                    ignoreDuplicate: true
                });
                const collection2 = await db2.collection({
                    name: 'humans',
                    schema: schemas.humanWithTimestampAllIndex
                });
                const replicationState2 = collection2.syncGraphQL({
                    url: browserServerUrl,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    live: true,
                    deletedFlag: 'deleted'
                });
                await replicationState2.awaitInitialReplication();
                const addDoc = schemaObjects.humanWithTimestamp();
                await collection2.insert(addDoc);

                await AsyncTestUtil.waitUntil(async () => {
                    const docsEnd = await getDocsOnServer(replicationState);
                    const found = docsEnd.find(d => d.id === addDoc.id);
                    return !!found;
                });
                db2.destroy();
            });
        });
    });
});
