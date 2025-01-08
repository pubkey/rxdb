
import assert from 'assert';

import config, { describeParallel } from './config.ts';
import {
    createRxDatabase,
    fillWithDefaultSettings,
    randomToken
} from '../../plugins/core/index.mjs';
import {
    schemaObjects,
    schemas,
    humansCollection,
    isNode,
    nextPort
} from '../../plugins/test-utils/index.mjs';
import {
    getRxStorageRemoteWebsocket,
    startRxStorageRemoteWebsocketServer
} from '../../plugins/storage-remote-websocket/index.mjs';
import { getRxStorageMemory } from '../../plugins/storage-memory/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
import { assertThrows } from 'async-test-util';

describeParallel('rx-storage-remote.test.ts', () => {
    /**
     * Notice: Most use cases for the remote storage
     * are tests by having a full unit-test run where all
     * tests are run with the remote websocket storage.
     * This is defined in the unit/config.ts
     *
     * In this while we only add additional tests
     * that are specific to the remote storage plugin.
     */
    if (
        !isNode ||
        config.storage.name !== 'remote'
    ) {
        return;
    }
    const memoryStorageWithValidation = wrappedValidateAjvStorage({ storage: getRxStorageMemory() });
    describe('remote RxDatabase', () => {
        it('should have the same data on both sides', async () => {
            const port = await nextPort();
            const colServer = await humansCollection.create(0, undefined, false, false, memoryStorageWithValidation);
            const server = await startRxStorageRemoteWebsocketServer({
                port,
                database: colServer.database
            });
            assert.ok(server);

            const colClient = await humansCollection.create(
                0, undefined, false, false,
                wrappedValidateAjvStorage({
                    storage: getRxStorageRemoteWebsocket({
                        url: 'ws://localhost:' + port,
                        mode: 'storage'
                    })
                })
            );
            const cols = [colServer, colClient];

            await colServer.insert(schemaObjects.humanData());
            await colClient.insert(schemaObjects.humanData());

            await Promise.all(
                cols.map(async (col) => {
                    const docs = await col.find().exec();
                    assert.strictEqual(docs.length, 2);
                })
            );

            await colClient.database.close();
            await colServer.database.close();
        });
        /**
         * Often it makes sense to have the same database twice.
         * Once in the webworker via remote and once locally.
         * So this should not throw an error.
         */
        it('should not throw when the same database is created on remote and local', async () => {
            const port = await nextPort();
            const colServer = await humansCollection.create(0, undefined, false, false, memoryStorageWithValidation);
            const server = await startRxStorageRemoteWebsocketServer({
                port,
                database: colServer.database
            });
            assert.ok(server);
            const name = randomToken(10);

            const dbRemote = await createRxDatabase({
                name,
                storage: wrappedValidateAjvStorage({
                    storage: getRxStorageRemoteWebsocket({
                        url: 'ws://localhost:' + port,
                        mode: 'storage'
                    })
                })
            });
            const dbLocal = await createRxDatabase({
                name,
                storage: memoryStorageWithValidation
            });

            await dbRemote.close();
            await dbLocal.close();
            await colServer.database.close();
        });
    });
    describe('mode setting with RemoteMessageChannel reuse', () => {
        const getStorage = (port: number) => wrappedValidateAjvStorage({
            storage: getRxStorageRemoteWebsocket({
                url: 'ws://localhost:' + port,
                mode: 'one'
            })
        });
        it('mode: one', async () => {
            const port = await nextPort();
            const colServer = await humansCollection.create(0, undefined, false, false, memoryStorageWithValidation);
            const server = await startRxStorageRemoteWebsocketServer({
                port,
                database: colServer.database
            });
            assert.ok(server);

            const storageInstanceA = await getStorage(port).createStorageInstance({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(10),
                collectionName: 'human',
                devMode: true,
                multiInstance: false,
                options: {},
                schema: fillWithDefaultSettings(schemas.human)
            });
            const storageInstanceB = await getStorage(port).createStorageInstance({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(10),
                collectionName: 'human',
                devMode: true,
                multiInstance: false,
                options: {},
                schema: fillWithDefaultSettings(schemas.human)
            });

            assert.strictEqual(
                storageInstanceA.internals.messageChannel,
                storageInstanceB.internals.messageChannel
            );


            await storageInstanceA.close();
            await storageInstanceB.close();

            // even after closing all and reopnening a new one, it must be the same instance.
            const storageInstanceC = await getStorage(port).createStorageInstance({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(10),
                collectionName: 'human',
                devMode: true,
                multiInstance: false,
                options: {},
                schema: fillWithDefaultSettings(schemas.human)
            });
            assert.strictEqual(
                storageInstanceA.internals.messageChannel,
                storageInstanceC.internals.messageChannel
            );

            await storageInstanceC.close();
            await colServer.database.close();
        });
        it('mode: storage', async () => {
            const port = await nextPort();
            const colServer = await humansCollection.create(0, undefined, false, false, memoryStorageWithValidation);
            const server = await startRxStorageRemoteWebsocketServer({
                port,
                database: colServer.database
            });
            assert.ok(server);

            const storage = wrappedValidateAjvStorage({
                storage: getRxStorageRemoteWebsocket({
                    url: 'ws://localhost:' + port,
                    mode: 'storage'
                })
            });
            const storageInstanceA = await storage.createStorageInstance({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(10),
                collectionName: 'human',
                devMode: true,
                multiInstance: false,
                options: {},
                schema: fillWithDefaultSettings(schemas.human)
            });
            const storageInstanceB = await storage.createStorageInstance({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(10),
                collectionName: 'human',
                devMode: true,
                multiInstance: false,
                options: {},
                schema: fillWithDefaultSettings(schemas.human)
            });
            const storageInstanceOther = await getStorage(port).createStorageInstance({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(10),
                collectionName: 'human',
                devMode: true,
                multiInstance: false,
                options: {},
                schema: fillWithDefaultSettings(schemas.human)
            });

            assert.strictEqual(
                storageInstanceA.internals.messageChannel,
                storageInstanceB.internals.messageChannel
            );
            assert.notStrictEqual(
                storageInstanceA.internals.messageChannel,
                storageInstanceOther.internals.messageChannel
            );

            await storageInstanceA.close();
            await storageInstanceB.close();
            await storageInstanceOther.close();
            await colServer.database.close();
        });
        it('mode: database', async () => {
            const port = await nextPort();
            const colServer = await humansCollection.create(0, undefined, false, false, memoryStorageWithValidation);
            const server = await startRxStorageRemoteWebsocketServer({
                port,
                database: colServer.database
            });
            assert.ok(server);

            const storage = getRxStorageRemoteWebsocket({
                url: 'ws://localhost:' + port,
                mode: 'database'
            });
            const databaseName = randomToken(10);
            const storageInstanceA = await storage.createStorageInstance({
                databaseInstanceToken: randomToken(10),
                databaseName,
                collectionName: 'human',
                devMode: true,
                multiInstance: false,
                options: {},
                schema: fillWithDefaultSettings(schemas.human)
            });
            const storageInstanceB = await storage.createStorageInstance({
                databaseInstanceToken: randomToken(10),
                databaseName,
                collectionName: 'human',
                devMode: true,
                multiInstance: false,
                options: {},
                schema: fillWithDefaultSettings(schemas.human)
            });
            const storageInstanceOther = await storage.createStorageInstance({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(10),
                collectionName: 'human',
                devMode: true,
                multiInstance: false,
                options: {},
                schema: fillWithDefaultSettings(schemas.human)
            });

            assert.strictEqual(
                storageInstanceA.internals.messageChannel,
                storageInstanceB.internals.messageChannel
            );
            assert.notStrictEqual(
                storageInstanceA.internals.messageChannel,
                storageInstanceOther.internals.messageChannel
            );

            await storageInstanceA.close();
            await storageInstanceB.close();
            await storageInstanceOther.close();
            await colServer.database.close();
        });
        it('mode: collection', async () => {
            const port = await nextPort();

            const database = await createRxDatabase({
                name: randomToken(10),
                storage: memoryStorageWithValidation
            });
            await database.addCollections({
                one: {
                    schema: schemas.human
                },
                two: {
                    schema: schemas.human
                }
            });
            const server = await startRxStorageRemoteWebsocketServer({
                port,
                database
            });
            assert.ok(server);

            const storage = getRxStorageRemoteWebsocket({
                url: 'ws://localhost:' + port,
                mode: 'collection'
            });
            const databaseName = randomToken(10);
            const storageInstanceA = await storage.createStorageInstance({
                databaseInstanceToken: randomToken(10),
                databaseName,
                collectionName: 'one',
                devMode: true,
                multiInstance: false,
                options: {},
                schema: fillWithDefaultSettings(schemas.human)
            });
            const storageInstanceB = await storage.createStorageInstance({
                databaseInstanceToken: randomToken(10),
                databaseName,
                collectionName: 'one',
                devMode: true,
                multiInstance: false,
                options: {},
                schema: fillWithDefaultSettings(schemas.human)
            });
            const storageInstanceOther = await storage.createStorageInstance({
                databaseInstanceToken: randomToken(10),
                databaseName,
                collectionName: 'two',
                devMode: true,
                multiInstance: false,
                options: {},
                schema: fillWithDefaultSettings(schemas.human)
            });

            assert.strictEqual(
                storageInstanceA.internals.messageChannel,
                storageInstanceB.internals.messageChannel
            );
            assert.notStrictEqual(
                storageInstanceA.internals.messageChannel,
                storageInstanceOther.internals.messageChannel
            );

            await storageInstanceA.close();
            await storageInstanceB.close();
            await storageInstanceOther.close();
            await database.close();
        });
    });
    describe('other', () => {
        /**
         * Many people forgot to rebuild their webworkers and shared workers when updating
         * RxDB which lead to strange bugs.
         * To prevent this, the remote storage itself should ensure that it only communicates
         * with remote instances that have the same RxDB version.
         */
        it('should throw when the remote was build on a different RxDB version', async () => {
            const port = await nextPort();

            const database = await createRxDatabase({
                name: randomToken(10),
                storage: memoryStorageWithValidation
            });
            await database.addCollections({
                one: {
                    schema: schemas.human
                },
                two: {
                    schema: schemas.human
                }
            });
            const server = await startRxStorageRemoteWebsocketServer({
                port,
                database,
                fakeVersion: 'wrong-version'
            });
            assert.ok(server);

            const storage = getRxStorageRemoteWebsocket({
                url: 'ws://localhost:' + port,
                mode: 'collection'
            });

            await assertThrows(
                () => storage.createStorageInstance({
                    databaseInstanceToken: randomToken(10),
                    databaseName: randomToken(10),
                    collectionName: 'one',
                    devMode: true,
                    multiInstance: false,
                    options: {},
                    schema: fillWithDefaultSettings(schemas.human)
                }),
                Error,
                ['RM1', 'wrong-version']
            );

            await database.close();
        });
    });
    describe('custom requests', () => {
        it('should send the message and get the answer', async () => {
            const port = await nextPort();
            const server = await startRxStorageRemoteWebsocketServer({
                port,
                storage: memoryStorageWithValidation,
                customRequestHandler: (input: any) => {
                    if (input === 'foobar') {
                        return 'barfoo';
                    } else {
                        throw new Error('input not matching');
                    }
                }
            });
            assert.ok(server);
            const clientStorage = getRxStorageRemoteWebsocket({
                url: 'ws://localhost:' + port,
                mode: 'storage'
            });

            const result = await clientStorage.customRequest('foobar');
            assert.strictEqual(result, 'barfoo');
        });
        it('should work with multiple clients doing custom requests', async () => {
            const port = await nextPort();
            type Message = {
                identifier: string;
            };
            type Response = {
                response: true;
                identifier: string;
            };
            const server = await startRxStorageRemoteWebsocketServer({
                port,
                storage: memoryStorageWithValidation,
                customRequestHandler(input: Message) {
                    return {
                        response: true,
                        identifier: input.identifier
                    };
                }
            });
            assert.ok(server);
            const clientsAmount = 5;
            await Promise.all(
                new Array(clientsAmount).fill(0).map(async (_v, idx) => {
                    const clientStorage = getRxStorageRemoteWebsocket({
                        url: 'ws://localhost:' + port,
                        mode: 'storage'
                    });
                    const result = await clientStorage.customRequest<Message, Response>({
                        identifier: 'idx-' + idx
                    });
                    assert.strictEqual(result.identifier, 'idx-' + idx);
                })
            );
        });
    });
});
