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
    RxGraphQLReplicationState,
    pullStreamBuilderFromRxSchema
} from '../../plugins/replication-graphql';
import {
    wrappedKeyCompressionStorage
} from '../../plugins/key-compression';
import {
    wrappedKeyEncryptionStorage
} from '../../plugins/encryption';
import * as schemas from '../helper/schemas';
import {
    GRAPHQL_PATH,
    getDocsOnServer
} from '../helper/graphql-config';

import {
    wrappedValidateAjvStorage
} from '../../plugins/validate-ajv';

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
    const getTimestamp = () => new Date().getTime();

    const batchSize = 5 as const;
    const pullQueryBuilder = (checkpoint: any, limit: number) => {
        if (!checkpoint) {
            checkpoint = {
                id: '',
                updatedAt: 0
            };
        }
        const query = `query FeedForRxDBReplication($checkpoint: CheckpointInput, $limit: Int!) {
            feedForRxDBReplication(checkpoint: $checkpoint, limit: $limit) {
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
        const variables = {
            checkpoint,
            limit
        };
        return Promise.resolve({
            query,
            variables
        });
    };
    const pullStreamQueryBuilder = (headers: { [k: string]: string }) => {
        const query = `subscription onHumanChanged($headers: Headers) {
            humanChanged(headers: $headers) {
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
        return {
            query,
            variables: {
                headers
            }
        };
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
    function ensureReplicationHasNoErrors(replicationState: RxGraphQLReplicationState<any, any>) {
        /**
         * We do not have to unsubscribe because the observable will cancel anyway.
         */
        replicationState.error$.subscribe(err => {
            console.dir(err.parameters.errors);
            console.log(JSON.stringify(err.parameters.errors, null, 4));
            throw err;
        });
    }
    describe('node', () => {
        if (!config.platform.isNode()) {
            return;
        }
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

                const endpointUrl = server.url.ws;
                console.log('endpointUrlendpointUrlendpointUrl: ' + endpointUrl);
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

                await server.close();
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
                        queryBuilder: pullQueryBuilder
                    },
                    live: false,
                    deletedField: 'deleted'
                });
                assert.strictEqual(replicationState.isStopped(), false);
                ensureReplicationHasNoErrors(replicationState);

                await AsyncTestUtil.waitUntil(async () => {
                    const docs = await c.find().exec();
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
                        queryBuilder: pullQueryBuilder
                    },
                    live: false,
                    deletedField: 'deleted'
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

                const collectionQueryBuilder = (checkpoint: any, limit: number) => {
                    if (!checkpoint) {
                        checkpoint = {
                            id: '',
                            updatedAt: 0
                        };
                    }

                    const query = `query($checkpoint: CheckpointInput, $limit: Int!)
                    {
                        collectionFeedForRxDBReplication(checkpoint: $checkpoint, limit: $limit) {
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
                        checkpoint,
                        limit
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
                    deletedField: 'deleted'
                });
                ensureReplicationHasNoErrors(replicationState);
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
                        queryBuilder: pullQueryBuilder
                    },
                    live: false,
                    deletedField: 'deleted'
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

                console.log('#######################');
                console.log('#######################');
                console.log('#######################');
                console.log('#######################');
                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder: pullQueryBuilder
                    },
                    deletedField: 'deleted'
                });
                ensureReplicationHasNoErrors(replicationState);
                await replicationState.awaitInitialReplication();
                const docs = await c.find().exec();

                assert.strictEqual(docs.length, 0);

                server.close();
                c.database.destroy();
            });
            /**
             * @link https://github.com/pubkey/rxdb/pull/3644
             */
            it('should handle truthy deleted flag values', async () => {
                const doc: any = schemaObjects.humanWithTimestamp();
                doc['deletedAt'] = Math.floor(new Date().getTime());
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn([doc])
                ]);

                const deletedAtQueryBuilder = (checkpoint: any, limit: number) => {
                    if (!checkpoint) {
                        checkpoint = {
                            id: '',
                            updatedAt: 0
                        };
                    }

                    const query = `query FeedForRxDBReplication($checkpoint: CheckpointInput, $limit: Int!)
                    {
                        collectionFeedForRxDBReplication(checkpoint: $checkpoint, limit: $limit) {
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
                        checkpoint,
                        limit
                    };

                    return {
                        query,
                        variables
                    };
                }

                const replicationState = c.syncGraphQL({
                    url: server.url,
                    pull: {
                        queryBuilder: deletedAtQueryBuilder,
                        dataPath: 'data.collectionFeedForRxDBReplication.collection'
                    },
                    deletedField: 'deletedAt'
                });
                ensureReplicationHasNoErrors(replicationState);

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
                    url: {
                        http: ERROR_URL
                    },
                    pull: {
                        batchSize,
                        queryBuilder: pullQueryBuilder
                    },
                    deletedField: 'deleted'
                });
                replicationState.retryTime = 100;


                // on the first error, we switch out the graphql-client
                await replicationState.error$.pipe(
                    first()
                ).toPromise().then(() => {
                    const client = GraphQLClient({
                        url: server.url.http
                    });
                    replicationState.clientState.client = client;
                });

                await replicationState.awaitInitialReplication();
                const docs = await c.find().exec();
                assert.strictEqual(docs.length, amount);

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
                        queryBuilder: pullQueryBuilder
                    },
                    live: true,
                    deletedField: 'deleted'
                });


                // wait until first replication is done
                await replicationState.awaitInitialReplication();

                // add document & trigger pull
                const doc = getTestData(1).pop();
                if (!doc) {
                    throw new Error('doc missing');
                }
                await server.setDocument(doc);

                await replicationState.reSync();

                await waitUntil(async () => {
                    const docs = await c.find().exec();
                    return docs.length === 2;
                });

                server.close();
                await c.database.destroy();

                // replication should be canceled when collection is destroyed
                assert.ok(replicationState.isStopped());
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
                        queryBuilder: pullQueryBuilder
                    },
                    live: true,
                    deletedField: 'deleted'
                });

                await replicationState.awaitInitialReplication();

                const docs = await c.find().exec();
                assert.strictEqual(docs.length, amount);
                await wait(250);

                const firstDoc: typeof testData[0] = AsyncTestUtil.clone(testData[0]);
                firstDoc.updatedAt = new Date().getTime();
                firstDoc.deleted = true;

                await server.setDocument(firstDoc);

                await replicationState.reSync();
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
                        queryBuilder: pullQueryBuilder
                    },
                    live: true,
                    deletedField: 'deleted'
                });
                await replicationState.awaitInitialReplication();

                localDoc['deleted'] = false;
                await server.setDocument(localDoc);


                await replicationState.reSync();
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
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn()
                ]);

                const replicationState = c.syncGraphQL({
                    url: {
                        http: ERROR_URL
                    },
                    pull: {
                        batchSize,
                        queryBuilder: pullQueryBuilder
                    },
                    live: true,
                    deletedField: 'deleted'
                });

                let timeoutId: any;
                const timeout = new Promise((_, reject) => {
                    timeoutId = setTimeout(() => {
                        clearTimeout(timeoutId);
                        reject(new Error('Timeout reached'));
                    },
                        // small buffer until the promise rejects
                        1000);
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
                console.log('######################################');
                console.log('######################################');
                console.log('######################################');
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
                    retryTime: 1000,
                    deletedField: 'deleted'
                });
                ensureReplicationHasNoErrors(replicationState);


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
                    deletedField: 'deleted'
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
                    deletedField: 'deleted'
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
                    deletedField: 'deleted'
                });
                ensureReplicationHasNoErrors(replicationState);


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
                await replicationState.awaitInSync();
                console.log('---- 4');
                await AsyncTestUtil.waitUntil(() => {
                    const docsOnServer2 = server.getDocuments();
                    console.log(JSON.stringify(docsOnServer2, null, 4));
                    const oneShouldBeDeleted = docsOnServer2.find((d: any) => d.deleted === true);
                    return !!oneShouldBeDeleted;
                }, 1000, 200);
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
                    deletedField: 'deleted'
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
                        queryBuilder: pullQueryBuilder
                    },
                    live: false,
                    deletedField: 'deleted'
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
                const asyncQueryBuilder = (doc: any, limit: number): Promise<any> => {
                    return pullQueryBuilder(doc, limit);
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
                    deletedField: 'deleted'
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
                const amount = batchSize;
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
                        queryBuilder: pullQueryBuilder
                    },
                    live: true,
                    deletedField: 'deleted'
                });

                console.log('---------------------- 0');
                await replicationState.awaitInitialReplication();

                let docsOnServer = server.getDocuments();
                assert.strictEqual(docsOnServer.length, amount * 2);

                const docsOnDb = await c.find().exec();
                assert.strictEqual(docsOnDb.length, amount * 2);


                console.log('---------------------- 0.01');
                // insert one on local and one on server
                const doc: any = schemaObjects.humanWithTimestamp({
                    id: 'z-some-local'
                });
                doc['deleted'] = false;
                await server.setDocument(doc);

                docsOnServer = server.getDocuments();
                console.dir(docsOnServer.map(d => d.id));
                console.log('---------------------- 0.02');

                const insertData = schemaObjects.humanWithTimestamp({
                    id: 'z-some-server'
                });
                await c.insert(insertData);
                console.log('---------------------- 0.03');

                await replicationState.reSync();
                console.log('---------------------- 0.1');
                await replicationState.awaitInSync();

                console.log('---------------------- 0.2');
                await AsyncTestUtil.waitUntil(async () => {
                    await replicationState.reSync();
                    docsOnServer = server.getDocuments();
                    const shouldBe = (amount * 2) + 2;
                    console.dir(docsOnServer.map(d => d.id));
                    return docsOnServer.length === shouldBe;
                });
                console.log('---------------------- 1');
                await AsyncTestUtil.waitUntil(async () => {
                    await replicationState.reSync();
                    const docsOnClient = await c.find().exec();
                    console.log('docsOnClient.length: ' + docsOnClient.length);
                    return docsOnClient.length === (amount * 2) + 2;
                });
                console.log('---------------------- 2');
                await replicationState.awaitInSync();
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
                        queryBuilder: pullQueryBuilder
                    },
                    live: true,
                    deletedField: 'deleted'
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
                    await replicationState.reSync();
                    const docsOnServer2 = server.getDocuments();
                    const shouldBe = (amount * 2) + 2;
                    return docsOnServer2.length === shouldBe;
                });
                await AsyncTestUtil.waitUntil(() => {
                    const docsOnDb2 = server.getDocuments();
                    return docsOnDb2.length === (amount * 2) + 2;
                });

                await replicationState.awaitInSync();
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
                        queryBuilder: pullQueryBuilder
                    },
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    live: true,
                    deletedField: 'deleted'
                });
                collection2.syncGraphQL({
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder: pullQueryBuilder
                    },
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    live: false,
                    deletedField: 'deleted'
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
                        queryBuilder: (args, limit: number) => {
                            console.log('pull query builder!');
                            console.dir(args);
                            pullCount++;
                            return pullQueryBuilder(args, limit);
                        }
                    },
                    live: true,
                    deletedField: 'deleted'
                });


                console.log('.................... 0');

                await replicationState.awaitInitialReplication();
                console.log('.................... 1');

                function getStats() {
                    return ensureNotFalsy(replicationState.internalReplicationState).stats;
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

        config.parallel('live:true with pull.stream$', () => {
            it('should pull all ongoing document writes from the server', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn()
                ]);
                const replicationState = c.syncGraphQL({
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    pull: {
                        batchSize,
                        queryBuilder: pullQueryBuilder,
                        streamQueryBuilder: pullStreamQueryBuilder
                    },
                    live: true,
                    deletedField: 'deleted'
                });
                ensureReplicationHasNoErrors(replicationState);
                await replicationState.awaitInSync();

                const testDocData = getTestData(1)[0];

                // insert on remote
                await server.setDocument(testDocData);
                await waitUntil(async () => {
                    const docs = await c.find().exec();
                    return docs.length === 1;
                });

                // update on remote
                const updateDocData: typeof testDocData = clone(testDocData);
                updateDocData.name = 'updated';
                await server.setDocument(updateDocData);
                await waitUntil(async () => {
                    const doc = await c.findOne().exec(true);
                    return doc.name === 'updated';
                });

                console.log('kkkkkkk 0');

                // delete on remote
                const deleteDocData: typeof testDocData = clone(updateDocData);
                deleteDocData.deleted = true;
                await server.setDocument(deleteDocData);
                console.log('kkkkkkk 1');
                await waitUntil(async () => {
                    const doc = await c.findOne().exec();
                    if (doc) {
                        console.dir(doc.toJSON());
                    }
                    return !doc;
                }, 1000, 200);

                console.log('kkkkkkk 2');

                await server.close();
                await c.database.destroy();
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
                        queryBuilder: pullQueryBuilder
                    },
                    deletedField: 'deleted'
                });

                const emitted: RxDocumentData<HumanWithTimestampDocumentType>[] = [];
                const sub = replicationState.received$.subscribe((doc: any) => emitted.push(doc));


                await replicationState.awaitInitialReplication();
                assert.strictEqual(emitted.length, batchSize);


                assert.deepStrictEqual(
                    emitted.map(d => d.id).sort(),
                    testData.map(d => d.id).sort()
                );
                emitted.forEach(d => assert.strictEqual(d._deleted, false));

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
                    deletedField: 'deleted'
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
                    url: {
                        http: ERROR_URL
                    },
                    pull: {
                        batchSize,
                        queryBuilder: pullQueryBuilder
                    },
                    deletedField: 'deleted'
                });

                const error = await replicationState.error$.pipe(
                    first()
                ).toPromise();

                assert.strictEqual(ensureNotFalsy(error).parameters.direction, 'pull');
                replicationState.cancel();
                c.database.destroy();
            });
            it('should contain include replication action data in push request failure', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const replicationState = c.syncGraphQL({
                    url: {
                        http: ERROR_URL
                    },
                    push: {
                        queryBuilder: pushQueryBuilder,
                    },
                    deletedField: 'deleted'
                });

                const localDoc = schemaObjects.humanWithTimestamp();
                await c.insert(localDoc);

                const error = ensureNotFalsy(
                    await replicationState.error$.pipe(
                        first()
                    ).toPromise()
                );

                console.log('error:');
                console.dir(error);
                console.log(JSON.stringify(error, null, 4));
                const firstRow = (error as any).parameters.pushRows[0];
                const newDocState = firstRow.newDocumentState;

                assert.strictEqual(ensureNotFalsy(error).parameters.direction, 'push');
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
                        checkpointFields: [
                            'id',
                            'updatedAt'
                        ],
                        deletedField: 'customDeleted'
                    }
                });

                assert.ok(output.asString.includes('customDeleted'));
                const build = buildSchema(output.asString);
                assert.ok(build);
            });
            it('should create a valid output with subscription params', () => {
                const output = graphQLSchemaFromRxSchema({
                    human: {
                        schema: schemas.humanWithTimestamp,
                        checkpointFields: [
                            'id',
                            'updatedAt'
                        ]
                    },
                    deepNestedHuman: {
                        schema: schemas.deepNestedHuman,
                        checkpointFields: [
                            'passportId'
                        ],
                        headerFields: [
                            'foo'
                        ]
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
                    checkpointFields: [
                        'id',
                        'updatedAt'
                    ]
                });

                const output = await builder({
                    id: 'foo',
                    updatedAt: 12343
                }, batchSize);

                const parsed = parseQuery(output.query);
                assert.ok(parsed);
            });
            it('builder should work on null-document', async () => {
                const builder = pullQueryBuilderFromRxSchema(
                    'human', {
                    schema: schemas.humanWithTimestamp,
                    checkpointFields: [
                        'id',
                        'updatedAt'
                    ]
                });

                const output = await builder(null, batchSize);
                const parsed = parseQuery(output.query);
                assert.ok(parsed);
            });
        });
        config.parallel('.pullStreamBuilderFromRxSchema()', () => {
            it('should create a valid builder', async () => {
                const builder = pullStreamBuilderFromRxSchema(
                    'human', {
                    schema: schemas.humanWithTimestamp,
                    checkpointFields: [
                        'id',
                        'updatedAt'
                    ],
                    headerFields: ['AUTH_TOKEN']
                });

                const output = await builder({
                    AUTH_TOKEN: 'foobar'
                });

                assert.strictEqual(output.variables.headers.AUTH_TOKEN, 'foobar');
                const parsed = parseQuery(output.query);
                assert.ok(parsed);
            });
            it('builder should work on null-document', async () => {
                const builder = pullStreamBuilderFromRxSchema(
                    'human', {
                    schema: schemas.humanWithTimestamp,
                    checkpointFields: [
                        'id',
                        'updatedAt'
                    ]
                });

                const output = await builder({});
                const parsed = parseQuery(output.query);
                assert.ok(parsed);
            });
        });
        config.parallel('.pushQueryBuilderFromRxSchema()', () => {
            it('should create a valid builder', async () => {
                const builder = pushQueryBuilderFromRxSchema(
                    'human', {
                    schema: schemas.humanWithTimestamp,
                    checkpointFields: [
                        'id',
                        'updatedAt'
                    ],
                    deletedField: 'deleted'
                });

                // build valid output for insert document
                const output = await builder([{
                    newDocumentState: {
                        id: 'foo',
                        name: 'foo',
                        age: 1234,
                        updatedAt: 12343,
                        _attachments: {},
                        _rev: '1-foobar'
                    }
                }]);


                console.log(output.query);

                const parsed = parseQuery(output.query);
                const firstPushRowDoc: HumanWithTimestampDocumentType = output.variables.humanPushRow[0].newDocumentState;

                console.dir(output.variables);

                // should not have added internal properties
                assert.ok(!firstPushRowDoc.hasOwnProperty('_rev'));
                assert.ok(!firstPushRowDoc.hasOwnProperty('_attachments'));
                assert.ok(!firstPushRowDoc.hasOwnProperty('_deleted'));

                // build valid output for deleted document
                const outputDeleted = await builder([{
                    newDocumentState: {
                        id: 'foo',
                        _deleted: true
                    }
                }]);
                parseQuery(outputDeleted.query);

                // should not have added internal properties
                const firstPushRowDocDeleted: HumanWithTimestampDocumentType = outputDeleted.variables.humanPushRow[0].newDocumentState;
                assert.ok(!firstPushRowDocDeleted.hasOwnProperty('_rev'));
                assert.ok(!firstPushRowDocDeleted.hasOwnProperty('_attachments'));
                assert.ok(!firstPushRowDocDeleted.hasOwnProperty('_deleted'));

                assert.ok(parsed);
            });
            it('should keep the deleted value', async () => {
                const docData = schemaObjects.humanWithTimestamp();
                /**
                 * The GraphQL replication will
                 * internally switch out _deleted with the deleted flag.
                 * So the pushQueryBuilder MUST NOT switch out again.
                 */
                (docData as any).deleted = true;
                const ownPushQueryBuilder = pushQueryBuilderFromRxSchema(
                    'human',
                    {
                        checkpointFields: [
                            'id',
                            'updatedAt'
                        ],
                        schema: schemas.humanWithTimestamp,
                        deletedField: 'deleted'
                    }
                );
                const pushData = await ownPushQueryBuilder([{
                    newDocumentState: docData
                }]);

                console.log('-.------');
                console.log(JSON.stringify(pushData.variables, null, 4));
                const pushDoc = pushData.variables.humanPushRow[0].newDocumentState;
                assert.ok(pushDoc.deleted);
            });
        });
        config.parallel('integrations', () => {
            it('should work with encryption', async () => {
                if (config.storage.name !== 'pouchdb') {
                    // TODO
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

                const replicationState: RxGraphQLReplicationState<HumanWithTimestampDocumentType, any> = collection.syncGraphQL({
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder: pullQueryBuilder
                    },
                    deletedField: 'deleted'
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
                        queryBuilder: pullQueryBuilder
                    },
                    deletedField: 'deleted'
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
                    deletedField: 'deleted'
                });
                ensureReplicationHasNoErrors(replicationState);

                await replicationState.awaitInitialReplication();

                const serverDocs = server.getDocuments();
                assert.strictEqual(serverDocs.length, 1);
                assert.ok(serverDocs[0].age);

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
                        queryBuilder: pullQueryBuilder
                    },
                    headers: {
                        Authorization: 'password'
                    },
                    live: true,
                    deletedField: 'deleted'
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
                        queryBuilder: pullQueryBuilder
                    },
                    headers: {
                        Authorization: 'password'
                    },
                    live: true,
                    deletedField: 'deleted'
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
                await replicationState.reSync();
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
                        queryBuilder: pullQueryBuilder
                    },
                    headers: {
                        Authorization: 'wrong-password'
                    },
                    live: true,
                    deletedField: 'deleted'
                });
                const replicationError = await replicationState.error$.pipe(first()).toPromise();

                console.log('---------------------');
                console.dir(replicationError);
                console.log(JSON.stringify(replicationError, null, 4));


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
                    deletedField: 'deleted'
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
                        queryBuilder: pullQueryBuilder
                    },
                    live: true,
                    deletedField: 'deleted'
                });
                ensureReplicationHasNoErrors(replicationState);
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
                    storage: wrappedValidateAjvStorage({
                        storage: config.storage.getStorage()
                    }),
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
                        queryBuilder: pullQueryBuilder
                    },
                    live: true,
                    deletedField: 'deleted'
                });
                ensureReplicationHasNoErrors(replicationState);

                // ensure we are in sync even when there are no doc in the db at this moment
                await replicationState.awaitInitialReplication();

                // add one doc to the client database
                const testData = ensureNotFalsy(getTestData(1).pop());
                testData.id = 'first';
                delete (testData as any).deleted;
                await collection.insert(testData);

                // sync
                await replicationState.reSync();
                await replicationState.awaitInSync();

                assert.strictEqual(server.getDocuments().length, 1);

                // update document
                const newAge = 1111;
                const doc = await collection.findOne().exec(true);
                await doc.atomicPatch({
                    age: newAge,
                    updatedAt: new Date().getTime()
                });

                const docAfter = await collection.findOne().exec(true);
                assert.strictEqual(docAfter.age, newAge);

                // check server
                await replicationState.reSync();
                await replicationState.awaitInSync();

                await AsyncTestUtil.waitUntil(() => {
                    const serverDocs = server.getDocuments();
                    const notUpdated = serverDocs.find((d: any) => d.age !== newAge);
                    return !notUpdated;
                }, 1000, 200);

                await db.destroy();
                await server.close();
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
                        queryBuilder: pullQueryBuilder,
                    },
                    live: true,
                    deletedField: 'deleted'
                });
                ensureReplicationHasNoErrors(replicationState);

                // ensure we are in sync even when there are no doc in the db at this moment
                await replicationState.awaitInitialReplication();

                // add one doc to the client database
                const testData = getTestData(1).pop();
                delete (testData as any).deleted;
                await collection.insert(testData);

                // sync
                await replicationState.reSync();
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
                await replicationState.reSync();
                await replicationState.awaitInSync();

                await AsyncTestUtil.waitUntil(() => {
                    const serverDocs = server.getDocuments();
                    const notUpdated = serverDocs.find(
                        (d: any) => d.age !== newAge
                    );
                    return !notUpdated;
                });

                await db.destroy();
                await server.close();
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
                    url: {
                        http: browserServerUrl
                    },
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    live: false,
                    deletedField: 'deleted'
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
                    url: {
                        http: browserServerUrl
                    },
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    live: true,
                    deletedField: 'deleted'
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
