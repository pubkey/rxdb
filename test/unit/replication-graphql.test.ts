import assert from 'assert';
import AsyncTestUtil, {
    clone, wait, waitUntil
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
    fastUnsecureHash,
    randomCouchString,
    ensureNotFalsy,
    RxReplicationWriteToMasterRow
} from '../../';

import {
    addPouchPlugin,
    getRxStoragePouch
} from '../../plugins/pouchdb';

import {
    RxDBReplicationGraphQLPlugin,
    graphQLSchemaFromRxSchema,
    pullQueryBuilderFromRxSchema,
    pushQueryBuilderFromRxSchema,
    RxGraphQLReplicationState
} from '../../plugins/replication-graphql';
import {
    wrappedKeyCompressionStorage
} from '../../plugins/key-compression';
import {
    RxReplicationError
} from '../../plugins/replication';
import {
    wrappedKeyEncryptionStorage
} from '../../plugins/encryption';
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
import { RxDocumentData } from '../../src/types';
import { enableKeyCompression } from '../helper/schemas';

declare type WithDeleted<T> = T & { deleted: boolean };

describe('replication-graphql.test.ts', () => {
    // for port see karma.config.js
    const browserServerUrl = 'http://localhost:18000' + GRAPHQL_PATH;

    const getEndpointHash = () => fastUnsecureHash(AsyncTestUtil.randomString(10));
    const getTimestamp = () => Math.round(new Date().getTime() / 1000);

    const batchSize = 5 as const;
    const queryBuilder = (checkpoint: any) => {
        if (!checkpoint) {
            checkpoint = {
                id: '',
                updatedAt: 0
            };
        }
        const query = `{
            feedForRxDBReplication(lastId: "${checkpoint.id}", minUpdatedAt: ${checkpoint.updatedAt}, limit: ${batchSize}) {
                documents {
                    id
                    name
                    age
                    updatedAt
                    deleted
                }
                checkpoint {
                    id
                    updatedAt
                }
            }
        }`;
        const variables = {};
        return Promise.resolve({
            query,
            variables
        });
    };
    const pushQueryBuilder = (rows: RxReplicationWriteToMasterRow<HumanWithTimestampDocumentType>[]) => {
        if (!rows || rows.length === 0) {
            throw new Error('test pushQueryBuilder(): called with no docs');
        }
        const query = `
        mutation CreateHumans($writeRows: [HumanWriteRow!]) {
            writeHumans(writeRows: $writeRows) {
                id
                name
                age
                updatedAt
                deleted
            }
        }
        `;
        const variables = {
            writeRows: rows
        };
        return Promise.resolve({
            query,
            variables
        });
    };
    describe('node', () => {
        if (!config.platform.isNode()) return;
        const REQUIRE_FUN = require;
        addPouchPlugin(REQUIRE_FUN('pouchdb-adapter-http'));
        const SpawnServer: GraphQLServerModule = REQUIRE_FUN('../helper/graphql-server');
        const ws = REQUIRE_FUN('ws');
        const { SubscriptionClient } = REQUIRE_FUN('subscriptions-transport-ws');
        const ERROR_URL = 'http://localhost:15898/foobar';
        function getTestData(amount: number): WithDeleted<HumanWithTimestampDocumentType>[] {
            return new Array(amount).fill(0)
                .map(() => schemaObjects.humanWithTimestamp())
                .map((doc: any) => {
                    doc['deleted'] = false;
                    return doc;
                });
        }
        config.parallel('graphql-server.js', () => {
            it('spawn, reach and close a server', async () => {
                const server = await SpawnServer.spawn();
                const res = await server.client.query(`{
                    info
                }`);
                if (!res.data) {
                    console.log(JSON.stringify(res, null, 4));
                    throw new Error('res has error');
                }
                assert.strictEqual(res.data.info, 1);
                server.close();
            });
            it('server.setDocument()', async () => {
                const server = await SpawnServer.spawn<WithDeleted<HumanWithTimestampDocumentType>>();
                const doc = getTestData(1).pop();
                if (!doc) {
                    throw new Error('missing doc');
                }
                const res = await server.setDocument(doc);

                /**
                 * Because no conflicts have arised,
                 * an empty array must be returned.
                 */
                assert.strictEqual(
                    res.data.writeHumans.length,
                    0
                );
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
                        documents {
                            id,
                            name,
                            age,
                            updatedAt,
                            deleted
                        },
                        checkpoint {
                            id
                            updatedAt
                        }
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
                await server.setDocument(ensureNotFalsy(doc));

                await AsyncTestUtil.waitUntil(() => emitted.length === 1);
                assert.ok(emitted[0].data.humanChanged.checkpoint.id);
                assert.strictEqual(emittedError.length, 0);

                server.close();
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
                        batchSize,
                        queryBuilder
                    },
                    live: false,
                    deletedFlag: 'deleted'
                });
                assert.strictEqual(replicationState.isStopped(), false);

                console.log('---');

                await AsyncTestUtil.waitUntil(async () => {
                    const docs = await c.find().exec();
                    console.log('docs.lenght: ' + docs.length);
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

                c.syncGraphQL({
                    url: server.url,
                    pull: {
                        batchSize,
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
                const ids = docs.map((d: any) => d.primary);
                const notInDb = testData.find(doc => !ids.includes(doc.id));
                if (notInDb) throw new Error('not in db: ' + notInDb.id);

                server.close();
                c.database.destroy();
            });
            it('should pull documents from a custom dataPath if one is specified', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(getTestData(batchSize))
                ]);

                const collectionQueryBuilder = (doc: any) => {
                    if (!doc) {
                        doc = {
                            id: '',
                            updatedAt: 0
                        };
                    }

                    const query = `query($lastId: String!, $updatedAt: Int!, $batchSize: Int!)
                    {
                        collectionFeedForRxDBReplication(lastId: $lastId, minUpdatedAt: $updatedAt, limit: $batchSize) {
                            collection {
                                documents {
                                    id
                                    name
                                    age
                                    updatedAt
                                    deleted
                                }
                                checkpoint {
                                    id
                                    updatedAt
                                }
                            }
                        }
                    }`;

                    const variables = {
                        lastId: doc.id,
                        updatedAt: doc.updatedAt,
                        batchSize
                    };

                    return {
                        query,
                        variables
                    };
                };

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder: collectionQueryBuilder,
                        dataPath: 'data.collectionFeedForRxDBReplication.collection'
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
                        batchSize,
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
                        batchSize,
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
            it('should handle truthy deleted flag values', async () => {
                const doc: any = schemaObjects.humanWithTimestamp();
                doc['deletedAt'] = Math.floor(new Date().getTime() / 1000);
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn([doc])
                ]);

                const deletedAtQueryBuilder = (doc: any) => {
                    if (!doc) {
                        doc = {
                            id: '',
                            updatedAt: 0
                        };
                    }

                    const query = `query($lastId: String!, $updatedAt: Int!, $batchSize: Int!)
                    {
                        collectionFeedForRxDBReplication(lastId: $lastId, minUpdatedAt: $updatedAt, limit: $batchSize) {
                            collection {
                                documents {
                                    id
                                    name
                                    age
                                    updatedAt
                                    deletedAt
                                }
                                checkpoint {
                                    id
                                    updatedAt
                                }
                            }
                        }
                    }`;

                    const variables = {
                        lastId: doc.id,
                        updatedAt: doc.updatedAt,
                        batchSize
                    };

                    return {
                        query,
                        variables
                    };
                }

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder: deletedAtQueryBuilder,
                        dataPath: 'data.collectionFeedForRxDBReplication.collection'
                    },
                    deletedFlag: 'deletedAt'
                });
                replicationState.error$.subscribe((err: any) => console.error('REPLICATION ERROR', err))
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
                        batchSize,
                        queryBuilder
                    },
                    deletedFlag: 'deleted'
                });
                replicationState.replicationState.retryTime = 100;


                // on the first error, we switch out the graphql-client
                await replicationState.error$.pipe(
                    first()
                ).toPromise().then(() => {
                    const client = GraphQLClient({
                        url: server.url
                    });
                    replicationState.clientState.client = client;
                });

                await replicationState.awaitInitialReplication();
                const docs = await c.find().exec();
                assert.strictEqual(docs.length, amount);

                server.close();
                c.database.destroy();
            });
            it('should not save pulled documents that do not match the schema', async () => {
                return; // TODO
                const testData = getTestData(1);
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(testData)
                ]);
                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder,
                        modifier: (docData: any) => {
                            // delete name which is required in the schema
                            delete docData.name;
                            return docData;
                        }
                    },
                    deletedFlag: 'deleted'
                });

                const errors: any[] = [];
                const errorSub = replicationState.error$.subscribe((err: any) => {
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
            it('should also get documents that come in afterwards', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(getTestData(1))
                ]);
                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder
                    },
                    live: true,
                    deletedFlag: 'deleted'
                });


                // wait until first replication is done
                await replicationState.awaitInitialReplication();

                // add document & trigger pull
                const doc = getTestData(1).pop();
                if (!doc) {
                    throw new Error('doc missing');
                }
                await server.setDocument(doc);

                await replicationState.notifyAboutRemoteChange();

                await waitUntil(async () => {
                    const docs = await c.find().exec();
                    return docs.length === 2;
                });

                server.close();
                await c.database.destroy();

                // replication should be canceled when collection is destroyed
                assert.ok(replicationState.isStopped());
            });
            it('should also get documents that come in afterwards with interval .run()', async () => {
                // TODO this test randomly fails some times
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(getTestData(1))
                ]);

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder
                    },
                    live: true,
                    liveInterval: 50,
                    deletedFlag: 'deleted'
                });

                const errorSub = replicationState.error$.subscribe((err: any) => {
                    console.error('got error while replication');
                    console.dir(err);
                });

                await replicationState.awaitInitialReplication();

                // add document & trigger pull
                const doc = getTestData(1).pop();
                if (!doc) {
                    throw new Error('doc missing');
                }
                await server.setDocument(doc);

                await AsyncTestUtil.waitUntil(async () => {
                    const docs = await c.find().exec();
                    if (docs.length > 2) {
                        throw new Error('got too many documents');
                    }
                    return docs.length === 2;
                }, 10 * 1000, 100);

                server.close();
                errorSub.unsubscribe();
                c.database.destroy();
            });
            it('should overwrite the local doc if the remote gets deleted', async () => {
                const amount = 3;

                const testData = getTestData(amount);
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(testData)
                ]);
                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder
                    },
                    live: true,
                    deletedFlag: 'deleted'
                });

                await replicationState.awaitInitialReplication();

                const docs = await c.find().exec();
                assert.strictEqual(docs.length, amount);
                await wait(250);

                const firstDoc = AsyncTestUtil.clone(testData[0]);
                firstDoc.deleted = true;

                await server.setDocument(firstDoc);

                await replicationState.notifyAboutRemoteChange();
                await replicationState.awaitInSync();

                const docs2 = await c.find().exec();

                assert.strictEqual(docs2.length, amount - 1);

                server.close();
                c.database.destroy();
            });
            it('should overwrite the client doc if it was deleted locally before synced from the server', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const localDoc: any = schemaObjects.humanWithTimestamp();
                const rxDoc = await c.insert(localDoc);
                await rxDoc.remove();

                const docs = await c.find().exec();
                assert.strictEqual(docs.length, 0);

                const server = await SpawnServer.spawn<HumanWithTimestampDocumentType>();
                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder
                    },
                    live: true,
                    deletedFlag: 'deleted'
                });
                await replicationState.awaitInitialReplication();

                localDoc['deleted'] = false;
                await server.setDocument(localDoc);


                await replicationState.notifyAboutRemoteChange();
                await replicationState.awaitInSync();

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
                        batchSize,
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
                        liveInterval + 1000);
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
                const errSub = replicationState.error$.subscribe((err) => {
                    console.dir(err);
                    throw new Error('The replication threw an error');
                });

                await replicationState.awaitInitialReplication();

                const docsOnServer = server.getDocuments();
                assert.strictEqual(docsOnServer.length, batchSize);

                server.close();
                errSub.unsubscribe();
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
                await c.database.destroy();
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
                console.log('---- 0');
                await c.insert(schemaObjects.humanWithTimestamp());
                console.log('---- 1');
                await AsyncTestUtil.waitUntil(() => {
                    const docsOnServer2 = server.getDocuments();
                    return docsOnServer2.length === amount + 1;
                });
                console.log('---- 2');

                // check for deletes
                console.log('---- 3');
                await c.findOne().remove();
                console.log('---- 4');
                await AsyncTestUtil.waitUntil(() => {
                    const docsOnServer2 = server.getDocuments();
                    const oneShouldBeDeleted = docsOnServer2.find((d: any) => d.deleted === true);
                    return !!oneShouldBeDeleted;
                });
                console.log('---- 5');

                server.close();
                c.database.destroy();
            });
            it('should not send index-documents', async () => {
                const server = await SpawnServer.spawn();
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: config.storage.getStorage(),
                    ignoreDuplicate: true
                });

                const schema = clone(schemas.humanWithTimestamp);
                schema.indexes = ['name'];
                const collections = await db.addCollections({
                    humans: {
                        schema
                    }
                });
                const collection = collections.humans;

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
                replicationState.error$.subscribe((err: any) => {
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
                        batchSize,
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

                const asyncPushQueryBuilder = (doc: any): Promise<any> => {
                    return pushQueryBuilder(doc);
                };
                const asyncQueryBuilder = (doc: any): Promise<any> => {
                    return queryBuilder(doc);
                };

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: asyncPushQueryBuilder
                    },
                    pull: {
                        batchSize,
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
                        batchSize,
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
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(amount),
                    SpawnServer.spawn(getTestData(amount))
                ]);

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    pull: {
                        batchSize,
                        queryBuilder
                    },
                    live: true,
                    deletedFlag: 'deleted',
                    liveInterval: 60 * 1000
                });

                await replicationState.awaitInitialReplication();

                let docsOnServer = server.getDocuments();
                assert.strictEqual(docsOnServer.length, amount * 2);

                const docsOnDb = await c.find().exec();
                assert.strictEqual(docsOnDb.length, amount * 2);


                // insert one on local and one on server
                const doc: any = schemaObjects.humanWithTimestamp({
                    id: 'z-some-local'
                });
                doc['deleted'] = false;
                await server.setDocument(doc);

                docsOnServer = server.getDocuments();
                console.dir(docsOnServer.map(d => d.id));


                const insertData = schemaObjects.humanWithTimestamp({
                    id: 'z-some-server'
                });
                await c.insert(insertData);


                await replicationState.notifyAboutRemoteChange();
                await replicationState.awaitInSync();

                await AsyncTestUtil.waitUntil(() => {
                    docsOnServer = server.getDocuments();
                    const shouldBe = (amount * 2) + 2;
                    return docsOnServer.length === shouldBe;
                });
                await AsyncTestUtil.waitUntil(async () => {
                    const docsOnClient = await c.find().exec();
                    return docsOnClient.length === (amount * 2) + 2;
                });
                await server.close();
                await c.database.destroy();
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
                        batchSize,
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
                const doc: any = schemaObjects.humanWithTimestamp({
                    name: 'many1local'
                });
                doc['deleted'] = false;
                await server.setDocument(doc);
                await c.insert(schemaObjects.humanWithTimestamp({
                    name: 'many1server'
                }));

                await AsyncTestUtil.waitUntil(async () => {
                    /**
                     * we have to do replicationState.run() each time
                     * because pouchdb takes a while until the update_seq is increased
                     */
                    await replicationState.notifyAboutRemoteChange();
                    const docsOnServer2 = server.getDocuments();
                    const shouldBe = (amount * 2) + 2;
                    return docsOnServer2.length === shouldBe;
                });
                await AsyncTestUtil.waitUntil(() => {
                    const docsOnDb2 = server.getDocuments();
                    return docsOnDb2.length === (amount * 2) + 2;
                });

                await server.close();
                await c.database.destroy();
            });
            it('should work with multiInstance', async () => {
                if (!config.storage.hasMultiInstance) {
                    return;
                }
                if (config.isFastMode()) {
                    // TODO this test randomly fails in fast mode with lokijs storage.
                    return;
                }
                const name = randomCouchString(10);
                const server = await SpawnServer.spawn();

                const db1 = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    ignoreDuplicate: true
                });
                const db2 = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    ignoreDuplicate: true
                });

                const collections1 = await db1.addCollections({
                    humansmulti: {
                        schema: schemas.humanWithTimestamp
                    }
                });
                const collection1 = collections1.humansmulti;
                const collections2 = await db2.addCollections({
                    humansmulti: {
                        schema: schemas.humanWithTimestamp
                    }
                });
                const collection2 = collections2.humansmulti;

                collection1.syncGraphQL({
                    url: server.url,
                    pull: {
                        batchSize,
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
                        batchSize,
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
                await collection1.insert(schemaObjects.humanWithTimestamp({
                    name: 'mt1'
                }));
                await AsyncTestUtil.waitUntil(async () => {
                    const docs = await collection2.find().exec();
                    return docs.length === 1;
                });

                // insert to collection2
                await collection2.insert(schemaObjects.humanWithTimestamp({
                    name: 'mt2'
                }));
                await AsyncTestUtil.waitUntil(async () => {
                    const docs = await collection1.find().exec();
                    return docs.length === 2;
                });

                await db1.destroy();
                await db2.destroy();
            });
            it('should push and pull with modifier filter', async () => {
                const amount = batchSize * 1;

                const serverData = getTestData(amount);
                const serverDoc = getTestData(1)[0];
                serverDoc.id = 'server-doc';
                serverDoc.age = 101;
                serverData.push(serverDoc);
                const server = await SpawnServer.spawn(serverData);

                const name = randomCouchString(10);
                const db = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                });
                const collections = await db.addCollections({
                    humans: {
                        schema: schemas.humanWithTimestamp
                    }
                });
                const collection = collections.humans;

                for (let i = 0; i < amount; i++) {
                    const insertDocsData = schemaObjects.humanWithTimestamp();
                    insertDocsData.name = insertDocsData.name + '-client';
                    await collection.insert(insertDocsData);
                }
                const localDoc = schemaObjects.humanWithTimestamp();
                localDoc.name = localDoc.name + '-client-age-too-big';
                localDoc.age = 102;
                await collection.insert(localDoc);

                const replicationState = collection.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder,
                        modifier: (row: RxReplicationWriteToMasterRow<HumanWithTimestampDocumentType>) => {
                            if (row.newDocumentState.age > 100) {
                                return null;
                            }
                            return row;
                        }
                    },
                    pull: {
                        batchSize,
                        queryBuilder,
                        modifier: (doc: any) => {
                            if (doc.age > 100) {
                                return null;
                            }
                            return doc;
                        }
                    },
                    live: false,
                    deletedFlag: 'deleted'
                });
                const errSub = replicationState.error$.subscribe((err) => {
                    console.dir(err);
                    throw new Error('The replication threw an error');
                });

                await replicationState.awaitInitialReplication();

                console.log('################');

                const docsOnServer = server.getDocuments();
                console.dir(docsOnServer);
                const docsOnDb = await collection.find().exec();

                assert.strictEqual(docsOnServer.length, 2 * amount + 1);
                assert.strictEqual(docsOnDb.length, 2 * amount + 1);

                errSub.unsubscribe();
                server.close();
                db.destroy();
            });
            it('should not do more requests then needed', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn()
                ]);

                let pullCount = 0;
                let pushCount = 0;
                const replicationState = c.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize: 20,
                        queryBuilder: args => {
                            pushCount++;
                            return pushQueryBuilder(args);
                        }
                    },
                    pull: {
                        batchSize: 20,
                        queryBuilder: args => {
                            console.log('pull query builder!');
                            console.dir(args);
                            pullCount++;
                            return queryBuilder(args);
                        }
                    },
                    live: true,
                    deletedFlag: 'deleted',
                    liveInterval: 60 * 1000
                });


                console.log('.................... 0');

                await replicationState.awaitInitialReplication();
                console.log('.................... 1');

                function getStats() {
                    return ensureNotFalsy(replicationState.replicationState.internalReplicationState).stats;
                }


                console.log('### stats:');
                console.dir(getStats());

                // pullCount should be exactly 1 because pull was started on replication start
                assert.strictEqual(pullCount, 1);
                assert.strictEqual(pushCount, 0);

                // insert one document at the client
                await c.insert(schemaObjects.humanWithTimestamp());

                /**
                 * After the insert,
                 * exactly one push must be triggered
                 * and then one pull should have happened afterwards
                 */
                console.log('.................... 1 - a');
                await waitUntil(() => pushCount === 1);
                console.log('.................... 1 - b');
                await waitUntil(() => pullCount === 1);

                console.log('.................... 1 - c');


                /**
                 * Even after some time,
                 * no more requests should have happened
                 */
                await wait(250);
                assert.strictEqual(pushCount, 1);
                assert.strictEqual(pullCount, 1);


                server.close();
                c.database.destroy();
            });
        });

        config.parallel('observables', () => {
            it('should emit the received documents when pulling', async () => {
                const testData = getTestData(batchSize);
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(testData)
                ]);

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder
                    },
                    deletedFlag: 'deleted'
                });

                const emitted: RxDocumentData<HumanWithTimestampDocumentType>[] = [];
                const sub = replicationState.received$.subscribe((doc: any) => emitted.push(doc));

                await replicationState.awaitInitialReplication();
                assert.strictEqual(emitted.length, batchSize);

                testData.forEach((testDoc, idx) => {
                    const isDoc = emitted[idx];
                    assert.deepStrictEqual(testDoc.id, isDoc.id);
                    assert.deepStrictEqual(testDoc.deleted, isDoc._deleted);
                });

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
                const sub = replicationState.send$.subscribe((doc: any) => emitted.push(doc));
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
            it('should emit an error when the server is not reachable', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const replicationState = c.syncGraphQL({
                    url: ERROR_URL,
                    pull: {
                        batchSize,
                        queryBuilder
                    },
                    deletedFlag: 'deleted'
                });

                const error = await replicationState.error$.pipe(
                    first()
                ).toPromise();

                if (!error || (error as RxReplicationError<any, any>).type !== 'pull') {
                    console.dir(error);
                    throw error;
                }

                replicationState.cancel();
                c.database.destroy();
            });
            it('should contain include replication action data in pull request failure', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const replicationState = c.syncGraphQL({
                    url: ERROR_URL,
                    pull: {
                        batchSize,
                        queryBuilder
                    },
                    deletedFlag: 'deleted'
                });

                const error = await replicationState.error$.pipe(
                    first()
                ).toPromise();

                assert.strictEqual(ensureNotFalsy(error).type, 'pull');

                replicationState.cancel();
                c.database.destroy();
            });
            it('should contain include replication action data in push request failure', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const replicationState = c.syncGraphQL({
                    url: ERROR_URL,
                    push: {
                        queryBuilder: pushQueryBuilder,
                    },
                    deletedFlag: 'deleted'
                });

                const localDoc = schemaObjects.humanWithTimestamp();
                await c.insert(localDoc);

                const error = ensureNotFalsy(
                    await replicationState.error$.pipe(
                        first()
                    ).toPromise()
                );

                if (error.type === 'pull') {
                    throw new Error('wrong error type');
                }

                console.log('error:');
                console.dir(error);
                console.log(JSON.stringify(error, null, 4));
                const firstRow = ensureNotFalsy(error).pushRows[0];
                const newDocState = firstRow.newDocumentState;

                assert.strictEqual(ensureNotFalsy(error).type, 'push');
                assert.strictEqual(newDocState.id, localDoc.id);
                assert.strictEqual(newDocState.name, localDoc.name);
                assert.strictEqual(newDocState.age, localDoc.age);
                assert.strictEqual(newDocState.updatedAt, localDoc.updatedAt);

                replicationState.cancel();
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
                    deletedFlag: 'deleted',
                }, batchSize);

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
                    deletedFlag: 'deleted',
                }, batchSize);

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

                // build valid output for insert document
                const output = await builder([{
                    id: 'foo',
                    name: 'foo',
                    age: 1234,
                    updatedAt: 12343,
                    _attachments: {},
                    _rev: '1-foobar'
                }]);
                const parsed = parseQuery(output.query);

                const variable: HumanWithTimestampDocumentType = output.variables.human;

                // should not have added internal properties
                assert.ok(!variable.hasOwnProperty('_rev'));
                assert.ok(!variable.hasOwnProperty('_attachments'));
                assert.ok(!variable.hasOwnProperty('_deleted'));

                // build valid output for deleted document
                const outputDeleted = await builder([{
                    id: 'foo',
                    _deleted: true
                }]);
                parseQuery(outputDeleted.query);

                // should not have added internal properties
                const variableDeleted: HumanWithTimestampDocumentType = outputDeleted.variables.human;
                assert.ok(!variableDeleted.hasOwnProperty('_rev'));
                assert.ok(!variableDeleted.hasOwnProperty('_attachments'));
                assert.ok(!variableDeleted.hasOwnProperty('_deleted'));

                assert.ok(parsed);
            });
            it('should keep the deleted value', async () => {
                const docData: any = schemaObjects.humanWithTimestamp();
                /**
                 * The GraphQL replication will
                 * internally switch out _deleted with the deleted flag.
                 * So the pushQueryBuilder MUST NOT switch out again.
                 */
                docData.deleted = true;
                const ownPushQueryBuilder = pushQueryBuilderFromRxSchema(
                    'human',
                    {
                        deletedFlag: 'deleted',
                        feedKeys: [
                            'id',
                            'updatedAt'
                        ],
                        schema: schemas.humanWithTimestamp
                    }
                );
                const pushData = await ownPushQueryBuilder([docData]);
                const pushDoc = pushData.variables.human[0];
                assert.ok(pushDoc.deleted);
            });
        });
        config.parallel('integrations', () => {
            it('should work with encryption', async () => {
                if (config.storage.name !== 'pouchdb') {
                    return;
                }
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: wrappedKeyEncryptionStorage({
                        storage: config.storage.getStorage(),
                    }),
                    multiInstance: true,
                    eventReduce: true,
                    ignoreDuplicate: true,
                    password: randomCouchString(10)
                });
                const schema: RxJsonSchema<HumanWithTimestampDocumentType> = clone(schemas.humanWithTimestamp);
                schema.encrypted = ['name'];
                const collections = await db.addCollections({
                    humans: {
                        schema
                    }
                });
                const collection = collections.humans;

                const testData = getTestData(1);
                testData[0].name = 'Alice';
                const server = await SpawnServer.spawn(testData);

                const replicationState: RxGraphQLReplicationState<HumanWithTimestampDocumentType> = collection.syncGraphQL({
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder
                    },
                    deletedFlag: 'deleted'
                });
                await replicationState.awaitInitialReplication();

                const docs = await collection.find().exec();
                assert.strictEqual(docs.length, 1);
                assert.strictEqual(docs[0].name, 'Alice');

                const pouchDocs = await collection.storageInstance.internals.pouch.find({
                    selector: {}
                });
                assert.ok(pouchDocs.docs[0].name !== 'Alice');

                db.destroy();
            });
            it('pull should work with keyCompression', async () => {
                if (config.storage.name !== 'pouchdb') {
                    return;
                }
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: wrappedKeyCompressionStorage({
                        storage: config.storage.getStorage(),
                    }),
                    multiInstance: true,
                    eventReduce: true,
                    ignoreDuplicate: true,
                    password: randomCouchString(10)
                });
                const schema = clone(schemas.humanWithTimestamp);
                schema.keyCompression = true;
                const collections = await db.addCollections({
                    humans: {
                        schema
                    }
                });
                const collection = collections.humans;
                const testData = getTestData(1);
                testData[0].name = 'Alice';
                const server = await SpawnServer.spawn(testData);

                const replicationState = collection.syncGraphQL({
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder
                    },
                    deletedFlag: 'deleted'
                });
                await replicationState.awaitInitialReplication();

                const docs = await collection.find().exec();
                assert.strictEqual(docs.length, 1);
                assert.strictEqual(docs[0].name, 'Alice');

                const pouchDocs = await collection.storageInstance.internals.pouch.find({
                    selector: {}
                });

                // first key must be compressed
                assert.ok(Object.keys(pouchDocs.docs[0])[0].startsWith('|'));

                server.close();
                db.destroy();
            });
            it('push should work with keyCompression', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: wrappedKeyCompressionStorage({
                        storage: config.storage.getStorage()
                    }),
                    multiInstance: true,
                    eventReduce: true,
                    ignoreDuplicate: true,
                    password: randomCouchString(10)
                });
                const collections = await db.addCollections({
                    humans: {
                        schema: enableKeyCompression(schemas.humanWithTimestamp)
                    }
                });
                const collection = collections.humans;
                await collection.insert(schemaObjects.humanWithTimestamp());

                const server = await SpawnServer.spawn<HumanWithTimestampDocumentType>([]);

                const replicationState = collection.syncGraphQL({
                    url: server.url,
                    push: {
                        /**
                         * TODO for whatever reason this test
                         * does not work with batchSize=1
                         */
                        batchSize: 10,
                        queryBuilder: doc => {
                            const ret = pushQueryBuilder(doc);
                            return ret;
                        }
                    },
                    deletedFlag: 'deleted'
                });
                const errorSub = replicationState.error$.subscribe(err => {
                    console.dir(err);
                });
                await replicationState.awaitInitialReplication();

                const serverDocs = server.getDocuments();
                assert.strictEqual(serverDocs.length, 1);
                assert.ok(serverDocs[0].age);

                errorSub.unsubscribe();
                server.close();
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
                        batchSize,
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
                        batchSize,
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
                if (!doc) {
                    throw new Error('missing doc');
                }
                await server.setDocument(doc);

                replicationState.setHeaders({
                    'Authorization': '1234'
                });
                await replicationState.notifyAboutRemoteChange();
                await replicationState.awaitInSync();

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
                        batchSize,
                        queryBuilder
                    },
                    headers: {
                        Authorization: 'wrong-password'
                    },
                    live: true,
                    deletedFlag: 'deleted'
                });
                const replicationError = await replicationState.error$.pipe(first()).toPromise();
                assert.notStrictEqual(ensureNotFalsy(replicationError).message, '[object Object]');

                server.close();
                await c.database.destroy();
            });
        });
        config.parallel('issues', () => {
            it('push not working on slow db', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: wrappedKeyEncryptionStorage({
                        storage: config.storage.getStorage(),
                    }),
                    multiInstance: true,
                    eventReduce: true,
                    ignoreDuplicate: true,
                    password: randomCouchString(10)
                });
                const schema: RxJsonSchema<any> = clone(schemas.humanWithTimestampAllIndex);
                schema.encrypted = ['name'];
                const collections = await db.addCollections({
                    humans: {
                        schema
                    }
                });
                const collection = collections.humans;

                // insert data to slow down the db
                const amount = 30;
                await Promise.all(
                    new Array(amount).fill(0)
                        .map(() => schemaObjects.humanWithTimestamp())
                        .map(d => collection.insert(d))
                );
                const server = await SpawnServer.spawn(getTestData(0));
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
            it('push not working when big amount of docs was pulled before', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: wrappedKeyEncryptionStorage({
                        storage: config.storage.getStorage(),
                    }),
                    multiInstance: true,
                    eventReduce: true,
                    ignoreDuplicate: true,
                    password: randomCouchString(10)
                });
                const schema: RxJsonSchema<any> = clone(schemas.humanWithTimestampAllIndex);
                schema.encrypted = ['name'];
                const collections = await db.addCollections({
                    humans: {
                        schema
                    }
                });
                const collection = collections.humans;

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
                        batchSize,
                        queryBuilder
                    },
                    live: true,
                    deletedFlag: 'deleted'
                });
                replicationState.error$.subscribe((err: any) => console.error('REPLICATION ERROR', err));
                await replicationState.awaitInitialReplication();

                const docsOnServer = server.getDocuments();
                assert.strictEqual(docsOnServer.length, amount);

                // insert one which will trigger an auto push
                const insertedDoc = await collection.insert(schemaObjects.humanWithTimestamp());
                assert.ok(insertedDoc);

                await AsyncTestUtil.waitUntil(async () => {
                    const docs = await server.getDocuments();
                    if (docs.length > (amount + 1)) {
                        throw new Error('too many docs');
                    }
                    return docs.length === (amount + 1);
                });

                server.close();
                db.destroy();
            });
            it('#1812 updates fail when graphql is enabled', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: config.storage.getStorage(),
                    multiInstance: false,
                    eventReduce: true,
                    password: randomCouchString(10)
                });
                const schema: RxJsonSchema<any> = clone(schemas.humanWithTimestampAllIndex);
                const collections = await db.addCollections({
                    humans: {
                        schema
                    }
                });
                const collection = collections.humans;

                const server = await SpawnServer.spawn();
                assert.strictEqual(server.getDocuments().length, 0);

                // start live replication
                const replicationState = collection.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    pull: {
                        batchSize,
                        queryBuilder
                    },
                    live: true,
                    deletedFlag: 'deleted'
                });

                // ensure we are in sync even when there are no doc in the db at this moment
                await replicationState.awaitInitialReplication();

                // add one doc to the client database
                const testData = getTestData(1).pop();
                delete (testData as any).deleted;
                await collection.insert(testData);

                // sync
                await replicationState.notifyAboutRemoteChange();
                await replicationState.awaitInSync();

                assert.strictEqual(server.getDocuments().length, 1);

                // update document
                const newAge = 1111;
                const doc = await collection.findOne().exec(true);
                await doc.atomicPatch({ age: newAge });

                const docAfter = await collection.findOne().exec(true);
                assert.strictEqual(docAfter.age, newAge);

                // check server
                await replicationState.notifyAboutRemoteChange();
                await replicationState.awaitInSync();

                await AsyncTestUtil.waitUntil(() => {
                    const serverDocs = server.getDocuments();
                    const notUpdated = serverDocs.find((d: any) => d.age !== newAge);
                    return !notUpdated;
                });

                server.close();
                db.destroy();
            });
            it('#3856 atomicUpsert not working', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: config.storage.getStorage(),
                    multiInstance: false,
                    eventReduce: true,
                    password: randomCouchString(10),
                });
                const schema: RxJsonSchema<any> = clone(schemas.humanWithTimestampAllIndex);
                const collections = await db.addCollections({
                    humans: {
                        schema,
                    },
                });
                const collection = collections.humans;

                const server = await SpawnServer.spawn();
                assert.strictEqual(server.getDocuments().length, 0);

                // start live replication
                const replicationState = collection.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder,
                    },
                    pull: {
                        batchSize,
                        queryBuilder,
                    },
                    live: true,
                    deletedFlag: 'deleted',
                });

                // ensure we are in sync even when there are no doc in the db at this moment
                await replicationState.awaitInitialReplication();

                // add one doc to the client database
                const testData = getTestData(1).pop();
                delete (testData as any).deleted;
                await collection.insert(testData);

                // sync
                await replicationState.notifyAboutRemoteChange();
                await replicationState.awaitInSync();

                assert.strictEqual(server.getDocuments().length, 1);

                // update document
                const newAge = 1111;
                await collection.atomicUpsert({
                    id: testData?.id,
                    age: newAge,
                    name: testData?.name,
                    updatedAt: testData?.updatedAt,
                });

                const docAfter = await collection.findOne().exec(true);
                assert.strictEqual(docAfter.age, newAge);

                // check server
                await replicationState.notifyAboutRemoteChange();
                await replicationState.awaitInSync();

                await AsyncTestUtil.waitUntil(() => {
                    const serverDocs = server.getDocuments();
                    const notUpdated = serverDocs.find(
                        (d: any) => d.age !== newAge
                    );
                    return !notUpdated;
                });

                server.close();
                db.destroy();
            });
        });
    });
    describe('browser', () => {
        if (config.platform.isNode()) {
            return;
        }
        describe('issues', () => {
            it('push not working on slow db', async () => {
                const dbName = randomCouchString(10);
                const db = await createRxDatabase({
                    name: dbName,
                    storage: getRxStoragePouch('idb'),
                    multiInstance: true,
                    eventReduce: true,
                    ignoreDuplicate: true
                });
                const collections = await db.addCollections({
                    humans: {
                        schema: schemas.humanWithTimestampAllIndex
                    }
                });
                const collection = collections.humans;

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
                    storage: getRxStoragePouch('idb'),
                    multiInstance: true,
                    eventReduce: true,
                    ignoreDuplicate: true
                });
                const collections2 = await db2.addCollections({
                    humans: {
                        schema: schemas.humanWithTimestampAllIndex
                    }
                });
                const collection2 = collections2.humans;
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
