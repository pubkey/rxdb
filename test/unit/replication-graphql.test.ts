import assert from 'assert';
import {
    assertThrows,
    clone,
    wait,
    waitUntil
} from 'async-test-util';
import pkg from 'isomorphic-ws';
const { WebSocket: IsomorphicWebSocket } = pkg;


import {
    first
} from 'rxjs/operators';
import {
    firstValueFrom
} from 'rxjs';

import config, { describeParallel } from './config.ts';
import {
    createRxDatabase,
    RxJsonSchema,
    randomToken,
    ensureNotFalsy,
    RxReplicationWriteToMasterRow,
    ReplicationPullHandlerResult,
    RxCollection
} from '../../plugins/core/index.mjs';

import {
    replicateGraphQL,
    graphQLSchemaFromRxSchema,
    pullQueryBuilderFromRxSchema,
    pushQueryBuilderFromRxSchema,
    RxGraphQLReplicationState,
    pullStreamBuilderFromRxSchema,
    graphQLRequest
} from '../../plugins/replication-graphql/index.mjs';
import {
    wrappedKeyCompressionStorage
} from '../../plugins/key-compression/index.mjs';
import {
    schemaObjects,
    schemas,
    humansCollection,
    isNode,
    getPassword,
    isFastMode,
    isDeno,
    isBun,
    getEncryptedStorage,
    enableKeyCompression
} from '../../plugins/test-utils/index.mjs';
import {
    GRAPHQL_PATH,
    getDocsOnServer
} from '../helper/graphql-config.ts';

import {
    wrappedValidateAjvStorage
} from '../../plugins/validate-ajv/index.mjs';

import {
    buildSchema,
    parse as parseQuery
} from 'graphql';
import { ReplicationPushHandlerResult, RxDocumentData } from '../../plugins/core/index.mjs';
import { HumanWithTimestampDocumentType } from '../../src/plugins/test-utils/schema-objects.ts';
import { normalizeString } from '../../plugins/utils/index.mjs';

declare type WithDeleted<T> = T & { deleted: boolean; };

describe('replication-graphql.test.ts', () => {
    if (!config.storage.hasReplication) {
        return;
    }
    // for port see karma.config.js
    const browserServerUrl = 'http://localhost:18000' + GRAPHQL_PATH;
    const getTimestamp = () => Date.now();

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
            operationName: 'FeedForRxDBReplication',
            variables
        });
    };
    const pullStreamQueryBuilder = (headers: { [k: string]: string; }) => {
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
            operationName: 'onHumanChanged',
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
            operationName: 'CreateHumans',
            variables
        });
    };
    function ensureReplicationHasNoErrors(replicationState: RxGraphQLReplicationState<any, any>) {
        /**
         * We do not have to unsubscribe because the observable will cancel anyway.
         */
        replicationState.error$.subscribe(err => {
            console.error('ensureReplicationHasNoErrors() has error:');
            console.dir(err.parameters.errors);
            console.log(JSON.stringify(err.parameters.errors, null, 4));
            throw err;
        });
    }
    describe('node', () => {
        if (!isNode) {
            return;
        }
        let SpawnServer: any;
        const ERROR_URL = 'http://localhost:15898/foobar';
        function getTestData(amount: number): WithDeleted<HumanWithTimestampDocumentType>[] {
            return new Array(amount).fill(0)
                .map(() => schemaObjects.humanWithTimestampData())
                .map((doc: any) => {
                    doc['deleted'] = false;
                    return doc;
                });
        }
        describe('init', () => {
            it('import server module', async () => {
                if (isNode) {
                    SpawnServer = await import('../helper/graphql-server.js');
                } else if (isDeno) {
                    SpawnServer = await import('../helper/graphql-server.ts');
                }
            });
        });
        describeParallel('graphql-server.js', () => {
            it('spawn, reach and close a server', async () => {
                const server = await SpawnServer.spawn();
                const res = await graphQLRequest(
                    fetch,
                    ensureNotFalsy(server.url.http),
                    {
                        headers: {},
                        credentials: undefined
                    },
                    {
                        query: '{ info }',
                        variables: {}
                    }
                );
                if (!res.data) {
                    console.log(JSON.stringify(res, null, 4));
                    throw new Error('res has error');
                }
                assert.strictEqual(res.data.info, 1);
                server.close();
            });
            it('spawn, reach with a custom fetch and close a server', async () => {
                const server = await SpawnServer.spawn();
                const customFetch = async (request: Request) => {
                    /**
                     * example with axios
                        return axios({
                        method: request.method || 'POST',
                        url: request.url,
                            data: await request.json(),
                            headers: { ...request.headers,  Authorization: 'Bearer ' + JWT_BEARER_TOKEN },
                        })
                        .then(res => async () => Promise.resolve(res.data))
                        .catch(err => {
                            throw err.response.data;
                        })
                     */
                    return await fetch(ensureNotFalsy(request.url), {
                        method: request.method || 'POST',
                        headers: request.headers,
                        body: JSON.stringify(await request.json()),
                    });
                };
                const res = await graphQLRequest(
                    customFetch,
                    ensureNotFalsy(server.url.http),
                    {
                        headers: {},
                        credentials: undefined
                    },
                    {
                        query: '{ info }',
                        variables: {}
                    }
                );
                if (!res.data) {
                    console.log(JSON.stringify(res, null, 4));
                    throw new Error('res has error');
                }
                assert.strictEqual(res.data.info, 1);
                server.close();
            });
            it('spawn and throw an unknown operation name', async () => {
                const server = await SpawnServer.spawn();
                try {
                    await graphQLRequest(
                        fetch,
                        ensureNotFalsy(server.url.http),
                        {
                            headers: {},
                            credentials: undefined
                        },
                        {
                            query: '{ info }',
                            operationName: 'info',
                            variables: {}
                        }
                    );
                } catch (err: any) {
                    assert.ok(err.message.includes('Unknown operation named "info".'));
                }

                server.close();
            });
            it('server.setDocument()', async () => {
                const server = await SpawnServer.spawn();
                const doc = getTestData(1).pop();
                if (!doc) {
                    throw new Error('missing doc');
                }
                const res = await server.setDocument(doc);

                /**
                 * Because no conflicts have arose,
                 * an empty array must be returned.
                 */
                assert.strictEqual(
                    res.data.writeHumans.length,
                    0
                );
                server.close();
            });
            it('should be able to use the ws-subscriptions', async () => {
                if (isFastMode()) {
                    return;
                }
                const [server, graphQLWs] = await Promise.all([
                    SpawnServer.spawn(),
                    import('graphql-ws')
                ]);
                const endpointUrl = server.url.ws;

                const { createClient } = graphQLWs;
                const client = createClient({
                    url: endpointUrl,
                    shouldRetry: () => false,
                    webSocketImpl: IsomorphicWebSocket,
                });

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

                const emitted: any[] = [];
                const emittedError = [];

                client.subscribe({ query: query },
                    {
                        next: (data: any) => {
                            emitted.push(data);
                        },
                        error: (error: any) => {
                            emittedError.push(error);
                        },
                        complete: () => {
                        }
                    });


                /**
                 * Because we do not know when exactly the client is subscribed
                 * and we do not want to have a wait(300) in the test suite,
                 * we just add a new document on each try
                 */
                await waitUntil(async () => {
                    const doc = getTestData(1).pop();
                    await server.setDocument(ensureNotFalsy(doc));
                    return emitted.length >= 1;
                }, undefined, 50);

                assert.ok(emitted[0].data.humanChanged.checkpoint.id);
                assert.strictEqual(emittedError.length, 0);

                client.terminate();
                server.close();
            });
        });
        describeParallel('live:false pull only', () => {
            it('should pull all documents in one batch', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(getTestData(batchSize))
                ]);
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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

                await waitUntil(async () => {
                    const docs = await c.find().exec();
                    return docs.length === batchSize;
                });

                server.close();
                c.database.close();
            });
            it('should pull all documents in multiple batches', async () => {
                const amount = batchSize * 4;
                const testData = getTestData(amount);
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(testData)
                ]);

                replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder: pullQueryBuilder
                    },
                    live: false,
                    deletedField: 'deleted'
                });

                await waitUntil(async () => {
                    const ds = await c.find().exec();
                    return ds.length === amount;
                });

                // all of test-data should be in the database
                const docs = await c.find().exec();
                const ids = docs.map((d: any) => d.primary);
                const notInDb = testData.find(doc => !ids.includes(doc.id));
                if (notInDb) throw new Error('not in db: ' + notInDb.id);

                server.close();
                c.database.close();
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

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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

                await waitUntil(async () => {
                    const docs = await c.find().exec();
                    return docs.length === batchSize;
                });

                server.close();
                c.database.close();
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

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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
                c.database.close();
            });
            it('should handle deleted documents', async () => {
                const doc: any = schemaObjects.humanWithTimestampData();
                doc['deleted'] = true;
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn([doc])
                ]);
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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
                c.database.close();
            });
            /**
             * @link https://github.com/pubkey/rxdb/pull/3644
             */
            it('should handle truthy deleted flag values', async () => {
                const doc: any = schemaObjects.humanWithTimestampData();
                doc['deletedAt'] = Math.floor(Date.now());
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
                        operationName: 'FeedForRxDBReplication',
                        variables
                    };
                };

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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
                c.database.close();
            });
            // https://github.com/pubkey/rxdb/blob/d7c3aca4f49d605ceae8997df32f713d0fe21ee2/src/types/plugins/replication.d.ts#L47-L53
            it('#4110 should stop pulling when response returns less documents than the pull.batchSize', async () => {
                const amount = batchSize + 1;
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(getTestData(amount)),
                ]);
                let responseHaveBeenCalledTimes = 0;
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder: pullQueryBuilder,
                        responseModifier: (res: any) => {
                            responseHaveBeenCalledTimes += 1;
                            return res;
                        },
                    },
                    live: false,
                    deletedField: 'deleted',
                });

                // wait until first replication is done
                await replicationState.awaitInitialReplication();

                const docs = await c.find().exec();
                assert.strictEqual(docs.length, amount);

                // do not send a request if the server returned less documents than the batch size
                assert.strictEqual(
                    responseHaveBeenCalledTimes,
                    Math.ceil(amount / batchSize)
                );
                server.close();
                c.database.close();
            });
            it('should retry on errors', async () => {
                const amount = batchSize * 4;
                const testData = getTestData(amount);

                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(testData)
                ]);

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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


                // on the first error, we switch out the url to the correct one
                replicationState.url.http = server.url.http;
                await replicationState.awaitInitialReplication();
                const docs = await c.find().exec();
                assert.strictEqual(docs.length, amount);

                server.close();
                c.database.close();
            });
            it('#4088 should stop retrying when canceled', async () => {
                const amount = batchSize * 4;
                const testData = getTestData(amount);

                let queryBuilderCount = 0;
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(testData)
                ]);
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
                    url: {
                        http: ERROR_URL
                    },
                    pull: {
                        batchSize,
                        queryBuilder: (checkpoint, limit) => {
                            queryBuilderCount++;
                            return pullQueryBuilder(checkpoint, limit);
                        }
                    },
                    deletedField: 'deleted',
                    retryTime: 100
                });
                await firstValueFrom(replicationState.error$);
                await replicationState.cancel();
                const queryBuilderCountAfterCancel = queryBuilderCount;

                await wait(isFastMode() ? 100 : 500);
                assert.deepStrictEqual(
                    queryBuilderCountAfterCancel,
                    queryBuilderCount
                );

                server.close();
                c.database.remove();
            });

        });
        describeParallel('live:true pull only', () => {
            it('should also get documents that come in afterwards', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(getTestData(1))
                ]);
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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
                await c.database.close();

                // replication should be canceled when collection is closed
                assert.ok(replicationState.isStopped());
            });
            it('should overwrite the local doc if the remote gets deleted', async () => {
                const amount = 3;

                const testData = getTestData(amount);
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(testData)
                ]);
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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

                const firstDoc: typeof testData[0] = clone(testData[0]);
                firstDoc.updatedAt = Date.now();
                firstDoc.deleted = true;

                await server.setDocument(firstDoc);

                await replicationState.reSync();
                await replicationState.awaitInSync();

                const docs2 = await c.find().exec();

                assert.strictEqual(docs2.length, amount - 1);

                server.close();
                c.database.close();
            });
            it('should overwrite the client doc if it was deleted locally before synced from the server', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const localDoc: any = schemaObjects.humanWithTimestampData();
                const rxDoc = await c.insert(localDoc);
                await rxDoc.remove();

                const docs = await c.find().exec();
                assert.strictEqual(docs.length, 0);

                const server = await SpawnServer.spawn();
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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
                c.database.close();
            });
            it('should fail because initial replication never resolves', async () => {
                if (isFastMode()) {
                    // this test takes too long, do not run in fast mode
                    return;
                }
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn()
                ]);

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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
                await assertThrows(() => raceProm, Error, 'Timeout');

                server.close();
                c.database.close();
            });
        });

        describeParallel('push only', () => {
            it('should send all documents in one batch', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(batchSize),
                    SpawnServer.spawn()
                ]);

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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
                c.database.close();
            });
            it('should send all documents in multiple batches', async () => {
                const amount = batchSize * 3;
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(amount),
                    SpawnServer.spawn()
                ]);
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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
                c.database.close();
            });
            it('should send deletions', async () => {
                const amount = batchSize;
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(amount),
                    SpawnServer.spawn()
                ]);

                const doc = await c.findOne().exec(true);
                await doc.remove();

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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

                const shouldDeleted = docsOnServer.find((d: any) => d.id === doc.primary);
                assert.strictEqual((shouldDeleted as any).deleted, true);

                server.close();
                await c.database.close();
            });
            it('should trigger push on db-changes that have not resulted from the replication', async () => {
                const amount = batchSize;
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(amount),
                    SpawnServer.spawn()
                ]);

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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
                await c.insert(schemaObjects.humanWithTimestampData());
                await waitUntil(() => {
                    const docsOnServer2 = server.getDocuments();
                    return docsOnServer2.length === amount + 1;
                });

                // check for deletes
                await c.findOne().remove();
                await replicationState.awaitInSync();
                await waitUntil(() => {
                    const docsOnServer2 = server.getDocuments();
                    const oneshouldDeleted = docsOnServer2.find((d: any) => d.deleted === true);
                    return !!oneshouldDeleted;
                }, 1000, 100);

                server.close();
                c.database.close();
            });
            it('should not send index-documents', async () => {
                const server = await SpawnServer.spawn();
                const db = await createRxDatabase({
                    name: randomToken(10),
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

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection,
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
                db.close();
            });
            it('#4088 should stop retrying when canceled', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(batchSize),
                    SpawnServer.spawn()
                ]);

                let queryBuilderCount = 0;
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
                    url: { http: ERROR_URL },
                    push: {
                        batchSize,
                        queryBuilder: (rows) => {
                            queryBuilderCount++;
                            return pushQueryBuilder(rows);
                        }
                    },
                    live: true,
                    retryTime: 100,
                    deletedField: 'deleted'
                });

                await replicationState.error$.pipe(
                    first()
                ).toPromise();
                await replicationState.cancel();
                const queryBuilderCountAfterCancel = queryBuilderCount;

                await wait(isFastMode() ? 100 : 500);
                assert.deepStrictEqual(
                    queryBuilderCountAfterCancel,
                    queryBuilderCount
                );

                server.close();
                c.database.close();
            });
            it('should resend cancelled documents', async () => {
                if (
                    !config.storage.hasPersistence
                ) {
                    return;
                }
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(batchSize),
                    SpawnServer.spawn()
                ]);

                server.requireHeader('Authorization', 'Bearer 1234');

                // start a replication that always errors because it has no Authorization header
                let replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    live: true,
                    retryTime: 100,
                    deletedField: 'deleted'
                });

                await firstValueFrom(replicationState.error$);
                await replicationState.cancel();


                replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
                    url: server.url,
                    headers: { Authorization: 'Bearer 1234' },
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    live: true,
                    retryTime: 1000,
                    deletedField: 'deleted'
                });

                ensureReplicationHasNoErrors(replicationState);
                await replicationState.awaitInitialReplication();

                const docsOnServer = server.getDocuments();
                assert.strictEqual(docsOnServer.length, batchSize);

                server.close();
                c.database.close();
            });
            it('should respect the push.responseModifier', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(batchSize),
                    SpawnServer.spawn()
                ]);

                let responseHaveBeenCalledTimes = 0;
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
                    url: server.url,
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder,
                        responseModifier(
                            originalResponse: ReplicationPushHandlerResult<HumanWithTimestampDocumentType>,
                        ) {
                            responseHaveBeenCalledTimes += 1;
                            return originalResponse;
                        }
                    },
                    live: false,
                    retryTime: 1000,
                    deletedField: 'deleted'
                });
                ensureReplicationHasNoErrors(replicationState);


                await replicationState.awaitInitialReplication();

                const docsOnServer = server.getDocuments();
                assert.strictEqual(docsOnServer.length, batchSize);
                assert.strictEqual(
                    responseHaveBeenCalledTimes,
                    1
                );

                server.close();
                c.database.close();
            });
            it('should push documents from a custom dataPath if one is specified', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(batchSize),
                    SpawnServer.spawn()
                ]);

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
                    url: server.url,
                    push: {
                        batchSize,
                        dataPath: 'data.writeHumans',
                        queryBuilder: pushQueryBuilder,
                    },
                    live: false,
                    retryTime: 1000,
                    deletedField: 'deleted'
                });
                ensureReplicationHasNoErrors(replicationState);
                assert.strictEqual(replicationState.isStopped(), false);

                await waitUntil(async () => {
                    const docs = await c.find().exec();
                    return docs.length === batchSize;
                });

                server.close();
                c.database.close();
            });
        });
        describeParallel('push and pull', () => {
            it('should push and pull all docs; live: false', async () => {
                const amount = batchSize * 4;
                const testData = getTestData(amount);
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(amount),
                    SpawnServer.spawn(testData)
                ]);

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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
                c.database.close();
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

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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
                c.database.close();
            });
            it('should push and pull some docs; live: true', async () => {
                const amount = batchSize;
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(amount),
                    SpawnServer.spawn(getTestData(amount))
                ]);

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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

                let docsOnServer = server.getDocuments();
                assert.strictEqual(docsOnServer.length, amount * 2);

                const docsOnDb = await c.find().exec();
                assert.strictEqual(docsOnDb.length, amount * 2);

                // insert one on local and one on server
                const doc: any = schemaObjects.humanWithTimestampData({
                    id: 'z-some-local'
                });
                doc['deleted'] = false;
                await server.setDocument(doc);

                docsOnServer = server.getDocuments();
                const insertData = schemaObjects.humanWithTimestampData({
                    id: 'z-some-server'
                });
                await c.insert(insertData);

                await replicationState.reSync();
                await replicationState.awaitInSync();

                await waitUntil(async () => {
                    await replicationState.reSync();
                    docsOnServer = server.getDocuments();
                    const should = (amount * 2) + 2;
                    return docsOnServer.length === should;
                });
                await waitUntil(async () => {
                    await replicationState.reSync();
                    const docsOnClient = await c.find().exec();
                    return docsOnClient.length === (amount * 2) + 2;
                });
                await replicationState.awaitInSync();
                server.close();
                c.database.close();
            });
            it('should push and pull many docs; live: true', async () => {
                const amount = batchSize * 4;
                const testData = getTestData(amount);
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(amount),
                    SpawnServer.spawn(testData)
                ]);

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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
                const doc: any = schemaObjects.humanWithTimestampData({
                    name: 'many1local'
                });
                doc['deleted'] = false;
                await server.setDocument(doc);
                await c.insert(schemaObjects.humanWithTimestampData({
                    name: 'many1server'
                }));

                await waitUntil(() => {
                    const docsOnServer2 = server.getDocuments();
                    const should = (amount * 2) + 2;
                    return docsOnServer2.length === should;
                });
                await waitUntil(() => {
                    const docsOnDb2 = server.getDocuments();
                    return docsOnDb2.length === (amount * 2) + 2;
                });

                await replicationState.awaitInSync();
                server.close();
                c.database.close();
            });
            it('should work with multiInstance', async () => {
                if (!config.storage.hasMultiInstance) {
                    return;
                }
                const name = randomToken(10);
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

                replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: collection1,
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
                replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: collection2,
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
                await collection1.insert(schemaObjects.humanWithTimestampData({
                    name: 'mt1'
                }));
                await waitUntil(async () => {
                    const docs = await collection2.find().exec();
                    return docs.length === 1;
                });

                // insert to collection2
                await collection2.insert(schemaObjects.humanWithTimestampData({
                    name: 'mt2'
                }));
                await waitUntil(async () => {
                    const docs = await collection1.find().exec();
                    return docs.length === 2;
                });

                await db1.close();
                await db2.close();
            });
            it('should not do more requests then needed', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn()
                ]);

                let pullCount = 0;
                let pushCount = 0;
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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
                            pullCount++;
                            return pullQueryBuilder(args, limit);
                        }
                    },
                    live: true,
                    deletedField: 'deleted'
                });

                await replicationState.awaitInitialReplication();

                // function getStats() {
                //     return ensureNotFalsy(replicationState.internalReplicationState).stats;
                // }

                // pullCount should be exactly 1 because pull was started on replication start
                assert.strictEqual(pullCount, 1);
                assert.strictEqual(pushCount, 0);

                // insert one document at the client
                await c.insert(schemaObjects.humanWithTimestampData());

                /**
                 * After the insert,
                 * exactly one push must be triggered
                 * and then one pull should have happened afterwards
                 */
                await waitUntil(() => pushCount === 1);
                await waitUntil(() => pullCount === 1);

                /**
                 * Even after some time,
                 * no more requests should have happened
                 */
                await wait(isFastMode() ? 100 : 250);
                assert.strictEqual(pushCount, 1);
                assert.strictEqual(pullCount, 1);


                server.close();
                c.database.close();
            });
        });

        describeParallel('live:true with pull.stream$', () => {
            it('should pull all ongoing document writes from the server', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn()
                ]);
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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
                // delete on remote
                const deleteDocData: typeof testDocData = clone(updateDocData);
                deleteDocData.deleted = true;
                await server.setDocument(deleteDocData);
                await waitUntil(async () => {
                    const doc = await c.findOne().exec();
                    return !doc;
                }, 1000, 200);

                server.close();
                c.database.close();
            });
            it('should respect pull.includeWsHeaders', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn()
                ]);
                server.requireHeader('token', 'Bearer token');
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder: pullQueryBuilder,
                        streamQueryBuilder: pullStreamQueryBuilder,
                        includeWsHeaders: true,
                    },
                    headers: {
                        token: 'Bearer token'
                    },
                    live: true,
                    deletedField: 'deleted'
                });
                ensureReplicationHasNoErrors(replicationState);
                await replicationState.awaitInSync();

                const testDocData = getTestData(1)[0];

                // Test mutation with subscription
                await server.setDocument(testDocData);
                await waitUntil(async () => {
                    const docs = await c.find().exec();
                    return docs.length === 1;
                });
                server.close();
                c.database.close();
            });
            it('should respect pull.wsOptions', async () => {
                const capturedWSStates: string[] = [];
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn()
                ]);

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder: pullQueryBuilder,
                        streamQueryBuilder: pullStreamQueryBuilder,
                        includeWsHeaders: true,
                        wsOptions: {
                            on: {
                                'connected': () => {
                                    capturedWSStates.push('connected');
                                },
                                'connecting': () => {
                                    capturedWSStates.push('connecting');
                                },
                                'closed': () => {
                                    capturedWSStates.push('closed');
                                },
                                'error': () => {
                                    capturedWSStates.push('error');
                                },
                            },
                            connectionParams: () => {
                                capturedWSStates.push('connectionParams');
                                return {
                                    token: 'Bearer token'
                                };
                            },
                        },
                    },
                    headers: {
                        token: 'Bearer token'
                    },
                    live: true,
                    deletedField: 'deleted',
                });

                ensureReplicationHasNoErrors(replicationState);

                await replicationState.awaitInitialReplication();

                await waitUntil(() => {
                    return capturedWSStates.length === 3;
                });

                assert.equal(capturedWSStates.includes('connected'), true);
                assert.equal(capturedWSStates.includes('connecting'), true);
                assert.equal(capturedWSStates.includes('connectionParams'), true);
                assert.equal(capturedWSStates.includes('closed'), false);
                assert.equal(capturedWSStates.includes('error'), false);

                replicationState.cancel();

                await waitUntil(() => {
                    return capturedWSStates.length === 4;
                });

                assert.equal(capturedWSStates.includes('closed'), true);
                assert.equal(capturedWSStates.includes('error'), false);

                server.close();
                c.database.close();
            });
            it('should respect the pull.responseModifier', async () => {
                const checkpointIterationModeAmount = 5;
                const eventObservationModeAmount = 3;
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(getTestData(checkpointIterationModeAmount))
                ]);

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
                    url: server.url,
                    pull: {
                        batchSize: 2,
                        queryBuilder: pullQueryBuilder,
                        streamQueryBuilder: pullStreamQueryBuilder,
                        responseModifier(
                            originalResponse: ReplicationPullHandlerResult<HumanWithTimestampDocumentType, any>,
                            origin,
                            _requestCheckpoint
                        ) {
                            originalResponse.documents = originalResponse.documents.map(doc => {
                                doc.name = doc.name + '-response-modified-' + origin;
                                return doc;
                            });
                            return originalResponse;
                        }
                    },
                    live: true,
                    deletedField: 'deleted'
                });
                ensureReplicationHasNoErrors(replicationState);

                await replicationState.awaitInitialReplication();

                let docsOnLocal = await c.find().exec();
                assert.strictEqual(
                    docsOnLocal.filter(d => d.name.endsWith('response-modified-handler')).length,
                    checkpointIterationModeAmount
                );


                // ensure it also runs on pull.stream$
                await Promise.all(
                    getTestData(3).map(d => server.setDocument(d))
                );
                await waitUntil(async () => {
                    const docs = await c.find().exec();
                    return docs.length === (checkpointIterationModeAmount + eventObservationModeAmount);
                });
                docsOnLocal = await c.find().exec();
                assert.strictEqual(
                    docsOnLocal.filter(d => d.name.endsWith('response-modified-stream')).length,
                    eventObservationModeAmount
                );

                server.close();
                c.database.close();
            });
        });


        describeParallel('observables', () => {
            it('should emit the received documents when pulling', async () => {
                const testData = getTestData(batchSize);
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(testData)
                ]);

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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
                c.database.close();
            });
            it('should emit the send documents when pushing', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(batchSize),
                    SpawnServer.spawn()
                ]);

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
                    url: server.url,
                    push: {
                        queryBuilder: pushQueryBuilder,
                        batchSize
                    },
                    live: false,
                    deletedField: 'deleted'
                });

                const emitted: any[] = [];
                const sub = replicationState.sent$.subscribe((doc: any) => emitted.push(doc));
                await replicationState.awaitInitialReplication();

                assert.strictEqual(emitted.length, batchSize);

                const docs = await c.find().exec();
                assert.deepStrictEqual(
                    emitted.map(d => d.id).sort(),
                    docs.map(d => d.primary).sort()
                );

                sub.unsubscribe();
                server.close();
                c.database.close();
            });
            it('should emit an error when the server is not reachable', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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
                c.database.close();
            });
            it('should contain include replication action data in push request failure', async () => {
                const c = await humansCollection.createHumanWithTimestamp(0);
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
                    url: {
                        http: ERROR_URL
                    },
                    push: {
                        queryBuilder: pushQueryBuilder,
                    },
                    deletedField: 'deleted'
                });

                const localDoc = schemaObjects.humanWithTimestampData();
                await c.insert(localDoc);

                const error = ensureNotFalsy(
                    await replicationState.error$.pipe(
                        first()
                    ).toPromise()
                );
                const firstRow = (error as any).parameters.pushRows[0];
                const newDocState = firstRow.newDocumentState;

                assert.strictEqual(ensureNotFalsy(error).parameters.direction, 'push');
                assert.strictEqual(newDocState.id, localDoc.id);
                assert.strictEqual(newDocState.name, localDoc.name);
                assert.strictEqual(newDocState.age, localDoc.age);
                assert.strictEqual(newDocState.updatedAt, localDoc.updatedAt);

                replicationState.cancel();
                c.database.close();
            });
        });

        describeParallel('.graphQLSchemaFromRxSchema()', () => {
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
                        ],
                        headerFields: [
                            'lol'
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
                    },
                    /**
                     * A schema without header fields must
                     * not create a broken schema.
                     */
                    noHeader: {
                        schema: schemas.humanWithTimestamp,
                        checkpointFields: [
                            'id',
                            'updatedAt'
                        ]
                    },
                });
                assert.strictEqual(
                    output.asString.includes('NoHeaderInputHeaders'),
                    false
                );

                const build = buildSchema(output.asString);
                assert.ok(build);
            });
        });
        describeParallel('.pullQueryBuilderFromRxSchema()', () => {
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
            it('builder should work with nested schemas', async () => {
                const builder = pullQueryBuilderFromRxSchema(
                    'human', {
                    schema: schemas.humanWithTimestampNested,
                    checkpointFields: [
                        'id',
                        'updatedAt'
                    ]
                });

                const output = await builder(null, batchSize);
                const parsed = parseQuery(output.query);
                const want = `query PullHuman($checkpoint: HumanInputCheckpoint, $limit: Int!) {
                    pullHuman(checkpoint: $checkpoint, limit: $limit) {
                        documents {
                            id
                            name
                            age
                            updatedAt
                            deletedAt
                            address {
                                street
                                suite
                                city
                                zipcode
                                geo {
                                    lat
                                    lng
                                }
                            }
                            _deleted
                        }
                        checkpoint {
                            id
                            updatedAt
                        }
                    }
                }
                `;
                assert.ok(parsed);
                assert.equal(normalizeString(output.query), normalizeString(want));
            });
            it('issue #7532 Array type is omitted in GraphQL query builder', async () => {
                const builder = pullQueryBuilderFromRxSchema(
                    'human', {
                    schema: schemas.heroArray,
                    checkpointFields: [
                        'id',
                        'updatedAt'
                    ]
                });

                const output = await builder(null, batchSize);
                assert.ok(output.query.includes('damage'));

                const parsed = parseQuery(output.query);
                assert.ok(parsed);
            });
        });
        describeParallel('.pullStreamBuilderFromRxSchema()', () => {
            it('should create a valid builder', async () => {
                const builder = pullStreamBuilderFromRxSchema(
                    'human', {
                    schema: schemas.humanWithTimestampNested,
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
            it('builder should work with nested schemas', async () => {
                const builder = pullStreamBuilderFromRxSchema(
                    'human', {
                    schema: schemas.humanWithTimestampNested,
                    checkpointFields: [
                        'id',
                        'updatedAt'
                    ]
                });

                const output = await builder({});
                const parsed = parseQuery(output.query);
                const want = `subscription onStream($headers:HumanInputHeaders) {
                    streamHuman(headers:$headers) {
                        documents {
                            id
                            name
                            age
                            updatedAt
                            deletedAt
                            address {
                                street
                                suite
                                city
                                zipcode
                                geo {
                                    lat
                                    lng
                                }
                            }
                            _deleted
                        }
                        checkpoint {
                            id
                            updatedAt
                        }
                    }
                }
                `;
                assert.ok(parsed);
                assert.equal(normalizeString(output.query), normalizeString(want));
            });
        });
        describeParallel('.pushQueryBuilderFromRxSchema()', () => {
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

                const parsed = parseQuery(output.query);
                const firstPushRowDoc: HumanWithTimestampDocumentType = output.variables.humanPushRow[0].newDocumentState;

                // should not have added internal properties
                assert.ok(!Object.prototype.hasOwnProperty.call(firstPushRowDoc, '_rev'));
                assert.ok(!Object.prototype.hasOwnProperty.call(firstPushRowDoc, '_attachments'));
                assert.ok(!Object.prototype.hasOwnProperty.call(firstPushRowDoc, '_deleted'));

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
                assert.ok(!Object.prototype.hasOwnProperty.call(firstPushRowDocDeleted, '_rev'));
                assert.ok(!Object.prototype.hasOwnProperty.call(firstPushRowDocDeleted, '_attachments'));
                assert.ok(!Object.prototype.hasOwnProperty.call(firstPushRowDocDeleted, '_deleted'));

                assert.ok(parsed);
            });
            it('builder should work with nested schemas', async () => {
                const builder = pushQueryBuilderFromRxSchema(
                    'human', {
                    schema: schemas.humanWithTimestampNested,
                    checkpointFields: [
                        'id',
                        'updatedAt'
                    ],
                    deletedField: 'deleted'
                });

                const output = await builder([{
                    newDocumentState: {
                        id: 'foo',
                        name: 'foo',
                        age: 1234,
                        updatedAt: 12343,
                        address: {
                            street: 'street',
                            suite: 'suite',
                            city: 'city',
                            zipcode: 'zipcode',
                            geo: {
                                lat: 1,
                                lng: 2
                            }
                        },
                        _attachments: {},
                        _rev: '1-foobar'
                    }
                }]);

                const parsed = parseQuery(output.query);
                const want = `mutation PushHuman($humanPushRow: [HumanInputPushRow!]) {
                    pushHuman(humanPushRow: $humanPushRow) {
                      id
                      name
                      age
                      updatedAt
                      deletedAt
                      address {
                        street
                        suite
                        city
                        zipcode
                        geo {
                          lat
                          lng
                        }
                      }
                      deleted
                    }
                  }`;

                assert.ok(parsed);
                assert.equal(normalizeString(output.query), normalizeString(want));
            });
            it('should keep the deleted value', async () => {
                const docData = schemaObjects.humanWithTimestampData();
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
                const pushDoc = pushData.variables.humanPushRow[0].newDocumentState;
                assert.ok(pushDoc.deleted);
            });
        });
        describeParallel('integrations', () => {
            it('should work with encryption', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: getEncryptedStorage(),
                    multiInstance: true,
                    eventReduce: true,
                    ignoreDuplicate: true,
                    password: await getPassword()
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

                const replicationState: RxGraphQLReplicationState<HumanWithTimestampDocumentType, any> = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection,
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

                db.close();
            });
            it('pull should work with keyCompression', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: wrappedKeyCompressionStorage({
                        storage: config.storage.getStorage(),
                    }),
                    multiInstance: true,
                    eventReduce: true,
                    ignoreDuplicate: true,
                    password: await getPassword()
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

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection,
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

                server.close();
                db.close();
            });
            it('push should work with keyCompression', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: wrappedKeyCompressionStorage({
                        storage: config.storage.getStorage()
                    }),
                    multiInstance: true,
                    eventReduce: true,
                    ignoreDuplicate: true,
                    password: await getPassword()
                });
                const collections = await db.addCollections({
                    humans: {
                        schema: enableKeyCompression(schemas.humanWithTimestamp)
                    }
                });
                const collection = collections.humans;
                await collection.insert(schemaObjects.humanWithTimestampData());

                const server = await SpawnServer.spawn([]);

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection,
                    url: server.url,
                    push: {
                        batchSize: 1,
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
                db.close();
            });
            it('should pass and change credentials in GraphQL client', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(getTestData(1))
                ]);

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder: pullQueryBuilder
                    },
                    headers: {
                        originalHeader: '1'

                    },
                    credentials: undefined,
                    live: true,
                    deletedField: 'deleted'
                });
                assert.strictEqual(replicationState.clientState.credentials, undefined);

                replicationState.setCredentials('same-origin');

                assert.deepStrictEqual(replicationState.clientState.headers, { originalHeader: '1' });
                assert.strictEqual(replicationState.clientState.credentials, 'same-origin');

                server.close();
                await c.database.close();
            });
            it('should work with headers', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(getTestData(1))
                ]);

                server.requireHeader('Authorization', 'password');
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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
                await c.database.close();
            });
            it('should work after headers change', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(getTestData(1))
                ]);

                server.requireHeader('Authorization', 'password');
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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
                await c.database.close();

                // replication should be canceled when collection is closed
                assert.ok(replicationState.isStopped());
            });
            it('should not lose error information', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(getTestData(1))
                ]);

                server.requireHeader('Authorization', 'password');
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
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
                assert.notStrictEqual(ensureNotFalsy(replicationError).message, '[object Object]');
                server.close();
                await c.database.close();
            });
        });
        describeParallel('issues', () => {
            it('push not working on slow db', async () => {
                if (isBun) {
                    // TODO for somehow bun times out here
                    return;
                }
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: getEncryptedStorage(),
                    multiInstance: true,
                    eventReduce: true,
                    ignoreDuplicate: true,
                    password: await getPassword()
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
                        .map(() => schemaObjects.humanWithTimestampData())
                        .map(d => collection.insert(d))
                );
                const server = await SpawnServer.spawn(getTestData(0));
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection,
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
                await collection.insert(schemaObjects.humanWithTimestampData());

                await waitUntil(async () => {
                    const docs = await server.getDocuments();
                    return docs.length === (amount + 1);
                });

                server.close();
                db.close();
            });
            it('push not working when big amount of docs was pulled before', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: getEncryptedStorage(),
                    multiInstance: true,
                    eventReduce: true,
                    ignoreDuplicate: true,
                    password: await getPassword()
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

                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection,
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
                const insertedDoc = await collection.insert(schemaObjects.humanWithTimestampData());
                assert.ok(insertedDoc);

                await waitUntil(async () => {
                    const docs = await server.getDocuments();
                    if (docs.length > (amount + 1)) {
                        throw new Error('too many docs');
                    }
                    return docs.length === (amount + 1);
                });

                server.close();
                db.close();
            });
            it('#1812 updates fail when graphql is enabled', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: wrappedValidateAjvStorage({
                        storage: config.storage.getStorage()
                    }),
                    multiInstance: false,
                    eventReduce: true,
                    password: await getPassword()
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
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection,
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
                await doc.incrementalPatch({
                    age: newAge,
                    updatedAt: Date.now()
                });

                const docAfter = await collection.findOne().exec(true);
                assert.strictEqual(docAfter.age, newAge);

                // check server
                await replicationState.reSync();
                await replicationState.awaitInSync();

                await waitUntil(() => {
                    const serverDocs = server.getDocuments();
                    const notUpdated = serverDocs.find((d: any) => d.age !== newAge);
                    return !notUpdated;
                }, 1000, 200);

                db.close();
                server.close();
            });
            it('#3856 incrementalUpsert not working', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                    multiInstance: false,
                    eventReduce: true,
                    password: await getPassword()
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
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection,
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
                await collection.incrementalUpsert({
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

                await waitUntil(() => {
                    const serverDocs = server.getDocuments();
                    const notUpdated = serverDocs.find(
                        (d: any) => d.age !== newAge
                    );
                    return !notUpdated;
                });

                db.close();
                server.close();
            });
            it('#4781 GraphQL Replication Cancel With Database Close Bug Report', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn(getTestData(1))
                ]);
                const replicationState = replicateGraphQL({
                    replicationIdentifier: randomToken(10),
                    collection: c,
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder: pullQueryBuilder,
                        streamQueryBuilder: pullStreamQueryBuilder,
                    },
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder
                    },
                    live: true,
                    deletedField: 'deleted'
                });
                ensureReplicationHasNoErrors(replicationState);
                await replicationState.awaitInitialReplication();
                await replicationState.cancel();

                let error;
                const result = await c.database.close().catch(e => error = e);
                assert.strictEqual(error, undefined);
                assert.strictEqual(result, true);
                server.close();
            });
            /**
             * @link https://github.com/pubkey/rxdb/pull/5259#discussion_r1396062635
             */
            it('#5259 document push must be skipped when pushModifier returns null', async () => {
                const [c, server] = await Promise.all([
                    humansCollection.createHumanWithTimestamp(0),
                    SpawnServer.spawn([])
                ]);
                const replicationState = replicateGraphQL<HumanWithTimestampDocumentType, any>({
                    replicationIdentifier: randomToken(10),
                    collection: c,
                    url: server.url,
                    pull: {
                        batchSize,
                        queryBuilder: pullQueryBuilder,
                        streamQueryBuilder: pullStreamQueryBuilder,
                    },
                    push: {
                        batchSize,
                        queryBuilder: pushQueryBuilder,
                        modifier: (docData) => {
                            if (docData.age === 2) {
                                return null;
                            }
                            return docData;
                        }
                    },
                    live: true,
                    deletedField: 'deleted'
                });
                ensureReplicationHasNoErrors(replicationState);
                await replicationState.awaitInitialReplication();

                // should push the original doc
                const doc = await c.insert(schemaObjects.humanWithTimestampData({
                    age: 1
                }));
                await replicationState.awaitInSync();
                assert.strictEqual(server.getDocuments()[0].age, 1);


                // should not push when modifier returns null
                await doc.incrementalPatch({ age: 2 });
                await replicationState.awaitInSync();
                assert.strictEqual(server.getDocuments()[0].age, 1);

                await replicationState.cancel();

                c.database.close();
                server.close();
            });
        });
    });
    describe('browser', () => {
        if (isNode) {
            return;
        }
        describe('issues', () => {
            it('push not working on slow db', async () => {
                if (isBun || isDeno) {
                    // TODO for somehow bun times out here
                    return;
                }
                const dbName = randomToken(10);
                const db = await createRxDatabase({
                    name: dbName,
                    storage: config.storage.getStorage(),
                    multiInstance: true,
                    eventReduce: true,
                    ignoreDuplicate: true
                });
                const collections = await db.addCollections({
                    humans: {
                        schema: schemas.humanWithTimestampAllIndex
                    }
                });
                const collection: RxCollection<HumanWithTimestampDocumentType> = collections.humans;

                // insert data to slow down the db
                const amount = 30;
                await Promise.all(
                    new Array(amount).fill(0)
                        .map(() => schemaObjects.humanWithTimestampData())
                        .map(d => collection.insert(d))
                );

                const replicationState = replicateGraphQL<HumanWithTimestampDocumentType, any>({
                    replicationIdentifier: randomToken(10),
                    collection,
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

                await db.close();

                // insert one in new instance of same db
                // which will trigger an auto push
                const db2 = await createRxDatabase({
                    name: dbName,
                    storage: config.storage.getStorage(),
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
                const replicationState2 = replicateGraphQL<any, any>({
                    replicationIdentifier: randomToken(10),
                    collection: collection2,
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
                const addDoc = schemaObjects.humanWithTimestampData();
                await collection2.insert(addDoc);

                await waitUntil(async () => {
                    const docsEnd = await getDocsOnServer(replicationState);
                    const found = docsEnd.find(d => d.id === addDoc.id);
                    return !!found;
                });
                await db2.close();
            });
        });
    });
});
