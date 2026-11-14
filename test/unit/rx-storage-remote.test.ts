
import assert from 'assert';

import config from './config.ts';
import {
    createRxDatabase,
    fillWithDefaultSettings,
    randomToken
} from '../../plugins/core/index.mjs';
import {
    schemaObjects,
    schemas,
    humansCollection,
    isNode
} from '../../plugins/test-utils/index.mjs';
import {
    getRxStorageRemoteWebsocket,
    startRxStorageRemoteWebsocketServer
} from '../../plugins/storage-remote-websocket/index.mjs';
import { getRxStorageMemory } from '../../plugins/storage-memory/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
import { assertThrows } from 'async-test-util';
import { nextPort } from '../helper/port-manager.ts';
import { Subject } from 'rxjs';
import {
    exposeRxStorageRemote,
    getRxStorageRemote
} from '../../plugins/storage-remote/index.mjs';
import type {
    MessageFromRemote,
    MessageToRemote
} from '../../plugins/storage-remote/index.mjs';
import type { RxStorage } from '../../plugins/core/index.mjs';
import { getRxStorageDexie } from '../../plugins/storage-dexie/index.mjs';
import {
    indexedDB as fakeIndexedDB,
    IDBKeyRange as fakeIDBKeyRange
} from 'fake-indexeddb';

describe('rx-storage-remote.test.ts', () => {
    /**
     * Uses an in-process message channel and its own base storage
     * that rejects calls to a closed instance,
     * so it runs with each config.storage.
     */
    describe('close() in parallel to a create of another connection', () => {
        it('should give a usable instance to a client that opens the collection while another client closes it', async () => {
            const baseStorage = getRxStorageDexie({
                indexedDB: fakeIndexedDB,
                IDBKeyRange: fakeIDBKeyRange
            });
            let closeRunning = false;
            let onCloseStarted: () => void = () => { };
            const closeStarted = new Promise<void>(res => onCloseStarted = res);
            let finishClose: () => void = () => { };
            const closeCanFinish = new Promise<void>(res => finishClose = res);
            /**
             * The close() of the collection instance stays pending
             * until the remote has received the next create message.
             */
            const slowCloseStorage: RxStorage<any, any> = {
                name: baseStorage.name,
                rxdbVersion: baseStorage.rxdbVersion,
                async createStorageInstance(params) {
                    const instance = await baseStorage.createStorageInstance(params);
                    if (params.collectionName === 'humans') {
                        const closeInstance = instance.close.bind(instance);
                        instance.close = async () => {
                            closeRunning = true;
                            onCloseStarted();
                            await closeCanFinish;
                            return closeInstance();
                        };
                    }
                    return instance;
                }
            };
            const toRemote$ = new Subject<MessageToRemote>();
            const fromRemote$ = new Subject<MessageFromRemote>();
            exposeRxStorageRemote({
                storage: slowCloseStorage,
                messages$: toRemote$,
                send(msg) {
                    fromRemote$.next(msg);
                }
            });
            function getClientStorage() {
                return wrappedValidateAjvStorage({
                    storage: getRxStorageRemote({
                        identifier: 'in-process-' + randomToken(10),
                        mode: 'storage',
                        messageChannelCreator: () => Promise.resolve({
                            messages$: fromRemote$,
                            send(msg) {
                                toRemote$.next(msg);
                                if (closeRunning && msg.method === 'create') {
                                    finishClose();
                                }
                            },
                            close() {
                                return Promise.resolve();
                            }
                        })
                    })
                });
            }
            const name = randomToken(10);
            const databaseA = await createRxDatabase({
                name,
                storage: getClientStorage(),
                multiInstance: false,
                ignoreDuplicate: true
            });
            await databaseA.addCollections({
                humans: {
                    schema: schemas.human
                }
            });
            const databaseB = await createRxDatabase({
                name,
                storage: getClientStorage(),
                multiInstance: false,
                ignoreDuplicate: true
            });

            const closePromise = databaseA.humans.close();
            await closeStarted;
            const collectionsB = await databaseB.addCollections({
                humans: {
                    schema: schemas.human
                }
            });
            await closePromise;

            await collectionsB.humans.insert(schemaObjects.humanData());
            const docs = await collectionsB.humans.find().exec();
            assert.strictEqual(docs.length, 1);

            await databaseA.close();
            await databaseB.close();
        });
    });
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
    describe('remove()', () => {
        it('should complete the changeStream observable when remove() is called', async () => {
            const port = await nextPort();
            const server = await startRxStorageRemoteWebsocketServer({
                port,
                storage: memoryStorageWithValidation
            });
            assert.ok(server);

            const storage = getRxStorageRemoteWebsocket({
                url: 'ws://localhost:' + port,
                mode: 'storage'
            });
            const storageInstance = await storage.createStorageInstance({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(10),
                collectionName: randomToken(10),
                devMode: true,
                multiInstance: false,
                options: {},
                schema: fillWithDefaultSettings(schemas.human)
            });

            let completed = false;
            storageInstance.changeStream().subscribe({
                complete() {
                    completed = true;
                }
            });

            await storageInstance.remove();

            /**
             * The changeStream() observable must complete
             * after calling remove(), just like it does after close().
             */
            assert.strictEqual(completed, true);
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
