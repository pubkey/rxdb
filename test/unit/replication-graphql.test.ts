import assert from 'assert';
import AsyncTestUtil, {
    clone, wait
} from 'async-test-util';
import GraphQLClient from 'graphql-client';

import {
    first
} from 'rxjs/operators';

import config from './config';
import * as schemaObjects from '../helper/schema-objects';
import {
    HumanWithTimestampDocumentType
} from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import {
    addRxPlugin,
    createRxDatabase,
    RxJsonSchema,
    hash,
    LOCAL_PREFIX,
    randomCouchString,
    PouchDB
} from '../../plugins/core';
import {
    RxDBReplicationGraphQLPlugin,
    createRevisionForPulledDocument,
    wasRevisionfromPullReplication,
    getDocsWithRevisionsFromPouch,
    getLastPushSequence,
    setLastPushSequence,
    getChangesSinceLastPushSequence,
    getLastPullDocument,
    setLastPullDocument,
    graphQLSchemaFromRxSchema,
    pullQueryBuilderFromRxSchema,
    pushQueryBuilderFromRxSchema
} from '../../plugins/replication-graphql';
import * as schemas from '../helper/schemas';
import {
    GRAPHQL_PATH,
    getDocsOnServer
} from '../helper/graphql-config';

import {
    GraphQLServerModule
} from '../helper/graphql-server';

addRxPlugin(RxDBReplicationGraphQLPlugin);

import {
    buildSchema,
    parse as parseQuery
} from 'graphql';

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
        if (!doc) {
            throw new Error();
        }
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
        addRxPlugin(REQUIRE_FUN('pouchdb-adapter-http'));
        const SpawnServer: GraphQLServerModule = REQUIRE_FUN('../helper/graphql-server');
        const ws = REQUIRE_FUN('ws');
        const { SubscriptionClient } = REQUIRE_FUN('subscriptions-transport-ws');
        const ERROR_URL = 'http://localhost:15898/foobar';
        const getEndpointHash = () => hash(AsyncTestUtil.randomString(10));
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
        const getTestDataWithRevisions = (amount: any) => {
            return new Array(amount).fill(0)
                .map(() => schemaObjects.humanWithTimestamp())
                .map((doc: any) => {
                    doc['deleted'] = false;
                    const dataHash = hash(doc);

                    const rev = `1-${dataHash}`;
                    const revisions = {
                        start: 1,
                        ids: [dataHash]
                    };

                    doc._rev = rev;
                    doc._revisions = revisions;

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
                const doc = await c.findOne().exec(true);
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
                const doc = await c.findOne().exec(true);
                const docData = doc.toJSON();
                const customRev = '2-fadae8ee3847d0748381f13988e95502-rxdb-from-graphql';
                (docData as any)._id = docData.id;
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
                    selector: {}
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
                } as any);

                const overwriteDoc = (bulkGetDocs.results[0].docs[0] as any).ok;

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
                    } as any,
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
                } as any);
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
                } as any);
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
                } as any);
                assert.strictEqual(bulkGetDocs.results.length, 1);
                assert.strictEqual((bulkGetDocs.results[0].docs[0] as any).ok._revisions.ids.length, 3);

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
                    assert.ok(doc1);
                    await doc1.atomicSet('age', 99);
                    await doc1.remove();

                    // edit one twice
                    const doc2 = docs[1];
                    assert.ok(doc2);
                    await doc2.atomicSet('age', 66);
                    await doc2.atomicSet('age', 67);

                    //  not edited
                    const doc3 = docs[2];
                    assert.ok(doc3);


                    const result = await getDocsWithRevisionsFromPouch(
                        c,
                        docIds
                    );

                    assert.strictEqual(Object.keys(result).length, 3);

                    const notEdited = result[doc3.primary];
                    assert.ok(notEdited);
                    assert.strictEqual(notEdited.revisions.start, 1);
                    assert.strictEqual(notEdited.revisions.ids.length, 1);

                    const editedAndRemoved = result[doc1.primary];
                    assert.ok(editedAndRemoved);
                    assert.strictEqual(editedAndRemoved.revisions.start, 3);
                    assert.strictEqual(editedAndRemoved.revisions.ids.length, 3);
                    assert.strictEqual(editedAndRemoved.deleted, true);

                    const editedTwice = result[doc2.primary];
                    assert.ok(editedTwice);
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
                    const r = result[id];
                    assert.ok(r && r.doc);
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
                    assert.ok(ret.id.startsWith(LOCAL_PREFIX));
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
                        'last_pulled_rev',
                        10
                    );
                    assert.strictEqual(changes.results.length, amount);
                    assert.ok((changes.results[0] as any).doc.name);
                    c.database.destroy();
                });
                it('should get only the newest update to documents', async () => {
                    const amount = 5;
                    const c = await humansCollection.createHumanWithTimestamp(amount);
                    const oneDoc = await c.findOne().exec(true);
                    await oneDoc.atomicSet('age', 1);
                    const changes = await getChangesSinceLastPushSequence(
                        c,
                        endpointHash,
                        'last_pulled_rev',
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
                        'last_pulled_rev',
                        10
                    );
                    assert.strictEqual(changes.results.length, 10);
                    c.database.destroy();
                });
                it('should get deletions', async () => {
                    const amount = 5;
                    const c = await humansCollection.createHumanWithTimestamp(amount);
                    const oneDoc = await c.findOne().exec(true);
                    await oneDoc.remove();
                    const changes = await getChangesSinceLastPushSequence(
                        c,
                        endpointHash,
                        'last_pulled_rev',
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
                        'last_pulled_rev',
                        10
                    );
                    const firstDoc = changes.results[0];
                    assert.ok((firstDoc as any).doc.id);
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
                        'last_pulled_rev',
                        10
                    );

                    assert.strictEqual(changes.results.length, amount);
                    const shouldNotBeFound = changes.results.find((change: any) => change.id === toPouch.id);
                    assert.ok(!shouldNotBeFound);
                    assert.strictEqual(changes.last_seq, amount + 1);
                    c.database.destroy();
                });
                it('should have filtered out docs with last_pulled_rev set', async () => {
                    const amount = 5;
                    const c = await humansCollection.createHumanWithTimestamp(amount);
                    const toPouch: any = schemaObjects.humanWithTimestamp();
                    toPouch._rev = `1-${hash(toPouch)}`;
                    toPouch.last_pulled_rev = toPouch._rev;

                    await c.pouch.bulkDocs([c._handleToPouch(toPouch)], {
                        new_edits: false
                    });

                    const allDocs = await c.find().exec();
                    assert.strictEqual(allDocs.length, amount + 1);

                    const changes = await getChangesSinceLastPushSequence(
                        c,
                        endpointHash,
                        'last_pulled_rev',
                        10
                    );

                    assert.strictEqual(changes.results.length, amount);
                    const shouldNotBeFound = changes.results.find((change: any) => change.id === toPouch.id);
                    assert.ok(!shouldNotBeFound);
                    assert.strictEqual(changes.last_seq, amount + 1);
                    c.database.destroy();
                });
                it('should fetch revisions if syncRevisions is set to true', async () => {
                    const amount = 5;
                    const c = await humansCollection.createHumanWithTimestamp(amount);

                    await c.find().update({
                        $inc: {
                            age: 1,
                        }
                    });

                    const changes = await getChangesSinceLastPushSequence(
                        c,
                        endpointHash,
                        'last_pulled_rev',
                        10,
                        true
                    );
                    assert.strictEqual(changes.results.length, amount);
                    assert.ok((changes as any).results[0].doc.name);

                    changes.results.forEach((result) => {
                        const doc = result.doc;
                        if (!doc) {
                            throw new Error('doc not defined');
                        }
                        const revisions = (doc as any)._revisions;

                        assert.ok(revisions);
                        assert.ok(revisions.ids);
                        assert.strictEqual(revisions.ids.length, 2);
                        assert.strictEqual(doc._rev, `${revisions.start}-${revisions.ids[0]}`);
                    });
                    c.database.destroy();
                });
            });
            describe('.setLastPullDocument()', () => {
                it('should set the document', async () => {
                    const c = await humansCollection.createHumanWithTimestamp(1);
                    const doc = await c.findOne().exec(true);
                    const docData = doc.toJSON(true);
                    const ret = await setLastPullDocument(
                        c,
                        endpointHash,
                        docData
                    );
                    assert.ok(ret.id.startsWith(LOCAL_PREFIX));
                    c.database.destroy();
                });
                it('should be able to run multiple times', async () => {
                    const c = await humansCollection.createHumanWithTimestamp(1);
                    const doc = await c.findOne().exec(true);
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
                    assert.ok(ret.id.startsWith(LOCAL_PREFIX));
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
                    const doc = await c.findOne().exec(true);
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
            it('pulled docs should be marked with a special revision if syncRevisions is false', async () => {
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
                    live: false,
                    syncRevisions: false,
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
            it('should sync revisions from server if syncRevisions is true', async () => {
                const remoteDocs = getTestDataWithRevisions(batchSize);

                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(remoteDocs)
                ]);

                const queryBuilder2 = (doc: any) => {
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
                      _rev
                      _revisions {
                        start
                        ids
                      }
                  }
              }`;
                    const variables = {};
                    return {
                        query,
                        variables
                    };
                };

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder: queryBuilder2
                    },
                    deletedFlag: 'deleted',
                    live: false,
                    syncRevisions: true,
                });
                await replicationState.awaitInitialReplication();

                const docIds = remoteDocs.map((doc) => {
                    return {
                        id: doc.id,
                        rev: doc._rev
                    };
                });

                const localDocs = await c.pouch.bulkGet({ docs: docIds, revs: true });

                assert.strictEqual(localDocs.results.length, remoteDocs.length);

                localDocs.results.forEach((doc: any) => {
                    const remoteDoc = remoteDocs.find((d) => d.id === doc.id);
                    assert.ok(remoteDoc);
                    assert.ok(remoteDoc._rev, doc.docs[0].ok._rev);
                    assert.deepStrictEqual(doc.docs[0].ok._revisions, remoteDoc._revisions);
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
            it('should not save pulled documents that do not match the schema', async () => {
                const testData = getTestData(1);
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(testData)
                ]);
                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder,
                        modifier: docData => {
                            // delete name which is required in the schema
                            delete docData.name;
                            return docData;
                        }
                    },
                    deletedFlag: 'deleted'
                });

                const errors: any[] = [];
                const errorSub = replicationState.error$.subscribe(err => {
                    errors.push(err);
                });
                await AsyncTestUtil.waitUntil(() => errors.length === 1);

                const firstError = errors[0];
                assert.strictEqual(firstError.code, 'VD2');

                errorSub.unsubscribe();
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
            it('should fail because initial replication never resolves', async () => {
                if (config.isFastMode()) {
                    // this test takes too long, do not run in fast mode
                    return;
                }
                const liveInterval = 4000;
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn()
                ]);

                const replicationState = c.syncGraphQL({
                    url: ERROR_URL,
                    pull: {
                        queryBuilder
                    },
                    deletedFlag: 'deleted',
                    live: true,
                    liveInterval: liveInterval,
                });

                let timeoutId: any;
                const timeout = new Promise((_, reject) => {
                    timeoutId = setTimeout(() => {
                        clearTimeout(timeoutId);
                        reject(new Error('Timeout reached'));
                    },
                        // small buffer until the promise rejects
                        liveInterval + 5000);
                });

                const raceProm = Promise.race([
                    replicationState.awaitInitialReplication(),
                    timeout
                ]).then(_ => clearTimeout(timeoutId));

                // error should be thrown because awaitInitialReplication() should never resolve
                await AsyncTestUtil.assertThrows(() => raceProm, Error, 'Timeout');

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

                const doc = await c.findOne().exec(true);
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
                assert.strictEqual((shouldBeDeleted as any).deleted, true);

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
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    ignoreDuplicate: true
                });

                const schema = clone(schemas.humanWithTimestamp);
                schema.indexes = ['name'];
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
            it('should include revision fields if syncRevisions is set', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(batchSize),
                    SpawnServer.spawn()
                ]);

                const pushQueryBuilder2 = (doc: any) => {
                    assert.ok(doc._rev);
                    assert.ok(doc._revisions);

                    delete doc._rev;
                    delete doc._revisions;
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

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder2
                    },
                    live: false,
                    deletedFlag: 'deleted',
                    syncRevisions: true,
                });

                await replicationState.awaitInitialReplication();

                const docsOnServer = server.getDocuments();
                assert.strictEqual(docsOnServer.length, batchSize);

                server.close();
                c.database.destroy();
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
            it('should allow asynchronous push and pull queryBuilders', async () => {
                const amount = batchSize * 4;
                const testData = getTestData(amount);
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(amount),
                    SpawnServer.spawn(testData)
                ]);

                const asyncPushQueryBuilder = async (doc: any): Promise<any> => {
                    return pushQueryBuilder(doc);
                };
                const asyncQueryBuilder = async (doc: any): Promise<any> => {
                    return queryBuilder(doc);
                };

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: asyncPushQueryBuilder
                    },
                    pull: {
                        queryBuilder: asyncQueryBuilder
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
            it('should allow asynchronous push and pull modifiers', async () => {
                const amount = batchSize * 4;
                const testData = getTestData(amount);
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(amount),
                    SpawnServer.spawn(testData)
                ]);

                const asyncModifier = async (d: any) => {
                    await wait(10);
                    return d;
                };

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder,
                        modifier: asyncModifier
                    },
                    pull: {
                        queryBuilder: queryBuilder,
                        modifier: asyncModifier
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

                await AsyncTestUtil.waitUntil(
                    () => replicationState._runQueueCount === 0
                );
                assert.ok(count < 10);

                server.close();
                c.database.destroy();
            });
            it('should work with multiInstance', async () => {
                const name = randomCouchString(10);
                const server = await SpawnServer.spawn();

                const db1 = await createRxDatabase({
                    name,
                    adapter: 'memory',
                    ignoreDuplicate: true
                });
                const db2 = await createRxDatabase({
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
            it('should push and pull with modifier filter', async () => {
                const amount = batchSize * 1;

                const serverData = getTestData(amount);
                const serverDoc: any = getTestData(1)[0];
                serverDoc.age = 101;
                serverData.push(serverDoc);
                const server = await SpawnServer.spawn(serverData);

                const name = randomCouchString(10);
                const db = await createRxDatabase({
                    name,
                    adapter: 'memory'
                });
                const collection = await db.collection({
                    name: 'humans',
                    schema: schemas.humanWithTimestamp
                });

                for (let i = 0; i < amount; i++) {
                    await collection.insert(schemaObjects.humanWithTimestamp());
                }
                const localDoc: any = schemaObjects.humanWithTimestamp();
                localDoc.age = 102;
                await collection.insert(localDoc);

                const replicationState = collection.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder,
                        modifier: (doc) => {
                            if (doc.age > 100) {
                                return null;
                            }
                            return doc;
                        }
                    },
                    pull: {
                        queryBuilder,
                        modifier: (doc) => {
                            if (doc.age > 100) {
                                return null;
                            }
                            return doc;
                        }
                    },
                    live: false,
                    deletedFlag: 'deleted'
                });
                const errSub = replicationState.error$.subscribe(() => {
                    throw new Error('The replication threw an error');
                });

                await replicationState.awaitInitialReplication();

                const docsOnServer = server.getDocuments();
                const docsOnDb = await collection.find().exec();

                assert.strictEqual(docsOnServer.length, 2 * amount + 1);
                assert.strictEqual(docsOnDb.length, 2 * amount + 1);

                errSub.unsubscribe();
                server.close();
                db.destroy();
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

        config.parallel('.graphQLSchemaFromRxSchema()', () => {
            it('assumption: buildSchema() fails on non-graphql input', () => {
                assert.throws(
                    () => buildSchema('foobar')
                );
            });
            it('should create a valid output', () => {
                const output = graphQLSchemaFromRxSchema({
                    human: {
                        schema: schemas.humanWithTimestamp,
                        feedKeys: [
                            'id',
                            'updatedAt'
                        ],
                        deletedFlag: 'deleted'
                    },
                    deepNestedHuman: {
                        schema: schemas.deepNestedHuman,
                        feedKeys: [
                            'passportId'
                        ],
                        deletedFlag: 'deleted'
                    }
                });
                const build = buildSchema(output.asString);
                assert.ok(build);
            });
            it('should create a valid output with subscription params', () => {
                const output = graphQLSchemaFromRxSchema({
                    human: {
                        schema: schemas.humanWithTimestamp,
                        feedKeys: [
                            'id',
                            'updatedAt'
                        ],
                        deletedFlag: 'deleted'
                    },
                    deepNestedHuman: {
                        schema: schemas.deepNestedHuman,
                        feedKeys: [
                            'passportId'
                        ],
                        deletedFlag: 'deleted',
                        subscriptionParams: {
                            foo: 'ID!'
                        }
                    }
                });
                const build = buildSchema(output.asString);
                assert.ok(build);
            });
        });
        config.parallel('.pullQueryBuilderFromRxSchema()', () => {
            it('assumption: parseQuery() fails on non-graphql input', () => {
                assert.throws(
                    () => parseQuery('foobar')
                );
            });
            it('should create a valid builder', async () => {
                const builder = pullQueryBuilderFromRxSchema(
                    'human', {
                    schema: schemas.humanWithTimestamp,
                    feedKeys: [
                        'id',
                        'updatedAt'
                    ],
                    deletedFlag: 'deleted'
                });

                const output = await builder({
                    id: 'foo',
                    updatedAt: 12343
                });

                const parsed = parseQuery(output.query);
                assert.ok(parsed);
            });
            it('builder should work on null-document', async () => {
                const builder = pullQueryBuilderFromRxSchema(
                    'human', {
                    schema: schemas.humanWithTimestamp,
                    feedKeys: [
                        'id',
                        'updatedAt'
                    ],
                    deletedFlag: 'deleted'
                });

                const output = await builder(null);
                const parsed = parseQuery(output.query);
                assert.ok(parsed);
            });
        });
        config.parallel('.pushQueryBuilderFromRxSchema()', () => {
            it('should create a valid builder', async () => {
                const builder = pushQueryBuilderFromRxSchema(
                    'human', {
                    schema: schemas.humanWithTimestamp,
                    feedKeys: [
                        'id',
                        'updatedAt'
                    ],
                    deletedFlag: 'deleted'
                });

                const output = await builder({
                    id: 'foo',
                    name: 'foo',
                    age: 1234,
                    updatedAt: 12343
                });

                const parsed = parseQuery(output.query);
                assert.ok(parsed);
            });
        });
        config.parallel('integrations', () => {
            it('should work with encryption', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    multiInstance: true,
                    eventReduce: true,
                    ignoreDuplicate: true,
                    password: randomCouchString(10)
                });
                const schema: RxJsonSchema = clone(schemas.humanWithTimestamp);
                schema.encrypted = ['name'];
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
                    selector: {}
                });
                assert.ok(pouchDocs.docs[0].name !== 'Alice');

                db.destroy();
            });
            it('should work with keyCompression', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    multiInstance: true,
                    eventReduce: true,
                    ignoreDuplicate: true,
                    password: randomCouchString(10)
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
                    selector: {}
                });

                // first key must be compressed
                const keys = Object.keys(pouchDocs.docs[0]);
                assert.ok(keys[0] && keys[0].startsWith('|'));

                db.destroy();
            });
            it('should work with headers', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(getTestData(1))
                ]);

                server.requireHeader('Authorization', 'password');
                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder
                    },
                    headers: {
                        Authorization: 'password'
                    },
                    live: true,
                    deletedFlag: 'deleted'
                });
                await replicationState.awaitInitialReplication();

                const docs = await c.find().exec();
                assert.strictEqual(docs.length, 1);

                server.close();
                await c.database.destroy();
            });
            it('should work after headers change', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(getTestData(1))
                ]);

                server.requireHeader('Authorization', 'password');
                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder
                    },
                    headers: {
                        Authorization: 'password'
                    },
                    live: true,
                    deletedFlag: 'deleted'
                });
                await replicationState.awaitInitialReplication();

                server.requireHeader('Authorization', '1234');
                const doc = getTestData(1).pop();
                await server.setDocument(doc);

                replicationState.setHeaders({
                    'Authorization': '1234'
                });
                await replicationState.run();

                const docs = await c.find().exec();
                assert.strictEqual(docs.length, 2);

                server.close();
                await c.database.destroy();

                // replication should be canceled when collection is destroyed
                assert.ok(replicationState.isStopped());
            });
            it('should not lose error information', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(getTestData(1))
                ]);

                server.requireHeader('Authorization', 'password');
                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder
                    },
                    headers: {
                        Authorization: 'wrong-password'
                    },
                    live: true,
                    deletedFlag: 'deleted'
                });
                const replicationError = await replicationState.error$.pipe(first()).toPromise();
                assert.notStrictEqual(replicationError.message, '[object Object]');

                server.close();
                await c.database.destroy();
            });
        });

        config.parallel('issues', () => {
            it('push not working on slow db', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    multiInstance: true,
                    eventReduce: true,
                    ignoreDuplicate: true,
                    password: randomCouchString(10)
                });
                const schema: RxJsonSchema = clone(schemas.humanWithTimestampAllIndex);
                schema.encrypted = ['name'];
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
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    multiInstance: true,
                    eventReduce: true,
                    ignoreDuplicate: true,
                    password: randomCouchString(10)
                });
                const schema: RxJsonSchema = clone(schemas.humanWithTimestampAllIndex);
                schema.encrypted = ['name'];
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
            it('#1812 updates fail when graphql is enabled', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    multiInstance: false,
                    eventReduce: true,
                    password: randomCouchString(10)
                });
                const schema: RxJsonSchema = clone(schemas.humanWithTimestampAllIndex);
                schema.encrypted = ['name'];
                const collection = await db.collection({
                    name: 'humans',
                    schema
                });
                const server = await SpawnServer.spawn();
                assert.strictEqual(server.getDocuments().length, 0);

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

                // add one doc
                const testData = getTestData(1).pop();
                delete testData.deleted;
                await collection.insert(testData);

                // sync
                await replicationState.run();
                assert.strictEqual(server.getDocuments().length, 1);

                // update document
                const newAge = 1111;
                const doc = await collection.findOne().exec(true);
                await doc.atomicSet('age', newAge);

                const docAfter = await collection.findOne().exec(true);
                assert.strictEqual(docAfter.age, newAge);

                // check server
                await replicationState.run();

                await AsyncTestUtil.waitUntil(() => {
                    const serverDocs = server.getDocuments();
                    const notUpdated = serverDocs.find((d: any) => d.age !== newAge);
                    return !notUpdated;
                });

                // also delete to ensure nothing broke
                await doc.remove();
                await replicationState.run();

                await AsyncTestUtil.waitUntil(() => {
                    const d = server.getDocuments().pop();
                    return (d as any).deleted;
                });
                server.close();
                db.destroy();
            });
            it('#2048 GraphQL .run() fires exponentially on push errors', async () => {
                if (config.isFastMode()) {
                    // this test takes too long, do not run in fast mode
                    return;
                }

                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(batchSize),
                    SpawnServer.spawn()
                ]);
                const pushQueryBuilderFailing = (doc: any) => {
                    // Note: setHumanFail will error out
                    const query = `
                    mutation CreateHuman($human: HumanInput) {
                        setHumanFail(human: $human) {
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

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilderFailing
                    },
                    live: true,
                    deletedFlag: 'deleted',
                    retryTime: 500,
                    liveInterval: Infinity
                });

                // We sleep 5000 seconds with retry time set to 500 sec
                await AsyncTestUtil.wait(5000);

                // Since push will error out we expect it there to be around 5000/500 = 10 retries
                assert.ok(replicationState._runCount >= 9, replicationState._runCount.toString());
                assert.ok(replicationState._runCount <= 11, replicationState._runCount.toString());

                c.database.destroy();
            });
            it('#2336 liveInterval-retries should not stack up', async () => {
                if (config.isFastMode()) {
                    // this test takes too long, do not run in fast mode
                    return;
                }

                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(batchSize),
                    SpawnServer.spawn()
                ]);
                const pullQueryBuilderFailing = (doc: any) => {
                    // Note: setHumanFail will error out
                    const query = `
                    mutation CreateHuman($human: HumanInput) {
                        setHumanFail(human: $human) {
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

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder: pullQueryBuilderFailing
                    },
                    live: true,
                    deletedFlag: 'deleted',
                    retryTime: 1000,
                    liveInterval: 500
                });

                // Since push will error out we expect it there to be around 5000/500 = 10 runs with some retries
                await AsyncTestUtil.wait(5000);
                assert.ok(replicationState._runCount < 20, replicationState._runCount.toString());

                c.database.destroy();
            });
        });
    });
    describe('browser', () => {
        if (config.platform.isNode()) return;
        describe('issues', () => {
            it('push not working on slow db', async () => {
                const dbName = randomCouchString(10);
                const db = await createRxDatabase({
                    name: dbName,
                    adapter: 'idb',
                    multiInstance: true,
                    eventReduce: true,
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
                const db2 = await createRxDatabase({
                    name: dbName,
                    adapter: 'idb',
                    multiInstance: true,
                    eventReduce: true,
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
