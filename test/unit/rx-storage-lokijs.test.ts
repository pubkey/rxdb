import assert from 'assert';

import config from './config';
import {
    addRxPlugin,
    ensureNotFalsy,
    getPseudoSchemaForVersion,
    now,
    randomCouchString
} from '../../plugins/core';

import {
    getRxStorageLoki,
    RxStorageInstanceLoki,
    RxStorageKeyObjectInstanceLoki
} from '../../plugins/lokijs';

import * as humansCollections from '../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as schemas from '../helper/schemas';

import { RxDBKeyCompressionPlugin } from '../../plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);
import { RxDBValidatePlugin } from '../../plugins/validate';
import { waitUntil } from 'async-test-util';
addRxPlugin(RxDBValidatePlugin);
import * as path from 'path';
import * as fs from 'fs';
import { LeaderElector } from 'broadcast-channel';
import { HumanDocumentType } from '../helper/schemas';

/**
 * RxStorageLokiJS specific tests
 */
describe('rx-storage-lokijs.test.js', () => {
    if (config.storage.name !== 'lokijs') {
        return;
    }
    config.parallel('RxDatabase', () => {
        it('create/write/remove', async () => {
            const collection = await humansCollections.create(
                10,
                randomCouchString(10),
                true,
                true,
                getRxStorageLoki()
            );
            const doc = await collection.findOne().exec(true);
            assert.ok(doc);

            const storageInstance: RxStorageInstanceLoki<HumanDocumentType> = collection.storageInstance as any;
            const localStorageInstance: RxStorageKeyObjectInstanceLoki = collection.localDocumentsStore as any;

            assert.ok(localStorageInstance.internals.leaderElector);
            assert.ok(storageInstance.internals.leaderElector);

            await collection.database.destroy();
        });
        it('should work with 2 instances', async () => {
            const databaseName = randomCouchString(12);
            const col1 = await humansCollections.createMultiInstance(
                databaseName,
                0,
                null,
                getRxStorageLoki()
            );
            await col1.database.waitForLeadership();
            const col2 = await humansCollections.createMultiInstance(
                databaseName,
                0,
                null,
                getRxStorageLoki()
            );
            await col1.insert(schemaObjects.human());
            const doc2 = await col2.findOne().exec(true);
            assert.ok(doc2);
            const doc3 = await col1.findOne().exec(true);
            assert.ok(doc3);

            // the database storage of col2 should not have internal localState
            assert.ok(col1.database.internalStore.internals.localState);
            assert.ok(col1.database.localDocumentsStore.internals.localState);
            assert.ok(!col2.database.internalStore.internals.localState);
            assert.ok(!col2.database.localDocumentsStore.internals.localState);

            /**
             * Only col1 should be leader
             * and so only col1 should have a localState.
             */
            assert.ok(col1.storageInstance.internals.localState);
            assert.ok(!col2.storageInstance.internals.localState);

            /**
             * The query on the non-leading instance
             * must return the correct query results.
             */
            await col2.insert(schemaObjects.human());
            await col1.insert(schemaObjects.human());
            await waitUntil(async () => {
                const res = await col2.find().exec();
                if (res.length > 3) {
                    throw new Error('got too much docs');
                }
                return res.length === 3;
            });

            col1.database.destroy();
            col2.database.destroy();
        });
        it('should not have localState if not leader', async () => {
            const databaseName = randomCouchString(12);
            const amount = 5;
            const cols = await Promise.all(
                new Array(amount).fill(0)
                    .map(() => humansCollections.createMultiInstance(
                        databaseName,
                        0,
                        null,
                        getRxStorageLoki()
                    ))
            );
            const getLeaders = () => {
                return cols.filter(col => {
                    const storageInstance = col.storageInstance;
                    const leaderElector: LeaderElector = storageInstance.internals.leaderElector;
                    return leaderElector.isLeader;
                });
            }


            // wait until one is leader
            await waitUntil(() => {
                const leaderAmount = getLeaders().length;
                if (leaderAmount > 1) {
                    throw new Error('duplicate leaders detected');
                } else if (leaderAmount === 1) {
                    return true;
                } else {
                    return false;
                }
            }, 50 * 1000, 200);

            // add some collections after leader is elected
            await Promise.all(
                new Array(amount).fill(0)
                    .map(async () => {
                        const col = await humansCollections.createMultiInstance(
                            databaseName,
                            0,
                            null,
                            getRxStorageLoki()
                        );
                        cols.push(col);
                    })
            );

            /**
             * Run some operations on non-leading instance
             * to emulate real world usage
             */
            const firstNonLeading = cols.find(col => !col.database.isLeader());
            if (!firstNonLeading) {
                throw new Error('no non leading instance');
            }
            await firstNonLeading.insert({
                passportId: randomCouchString(10),
                firstName: 'foo',
                lastName: 'bar',
                age: 10,
            });
            await firstNonLeading.insertLocal(
                randomCouchString(10),
                { foo: 'bar' }
            );


            /**
             * The non-leading instances should not
             * have localState set in its storage instances.
             */
            cols.forEach(col => {
                const mustHaveLocal = col.storageInstance.internals.leaderElector.isLeader;
                assert.strictEqual(mustHaveLocal, !!col.database.internalStore.internals.localState);
                assert.strictEqual(mustHaveLocal, !!col.database.localDocumentsStore.internals.localState);
                assert.strictEqual(mustHaveLocal, !!col.storageInstance.internals.localState);
                assert.strictEqual(mustHaveLocal, !!col.localDocumentsStore.internals.localState);
            });

            cols.forEach(col => col.database.destroy());
        });
        it('listening to queries must work', async () => {
            const databaseName = randomCouchString(12);
            const col1 = await humansCollections.createMultiInstance(
                databaseName,
                0,
                null,
                getRxStorageLoki()
            );
            await col1.database.waitForLeadership();
            const col2 = await humansCollections.createMultiInstance(
                databaseName,
                0,
                null,
                getRxStorageLoki()
            );
            let lastResult1: any[];
            let lastResult2: any[];

            const sub1 = col1.find().$.subscribe(res => lastResult1 = res);
            const sub2 = col1.find().$.subscribe(res => lastResult2 = res);

            await waitUntil(() => !!lastResult1 && !!lastResult2);

            await col2.insert(schemaObjects.human());
            await waitUntil(() => lastResult1.length === 1 && lastResult2.length === 1);

            sub1.unsubscribe();
            sub2.unsubscribe();
            col1.database.destroy();
            col2.database.destroy();
        });
        it('should use the given adapter', async () => {
            if (!config.platform.isNode()) {
                return;
            }
            /**
             * @link https://github.com/techfort/LokiJS/blob/master/tutorials/Persistence%20Adapters.md#an-example-using-fastest-and-most-scalable-lokifsstructuredadapter-for-nodejs-might-look-like-
             */
            const lfsa = require('lokijs/src/loki-fs-structured-adapter.js');
            const adapter = new lfsa();
            const storage = getRxStorageLoki({
                adapter
            });

            const databaseName = 'lokijs-fs-adapter-test-' + randomCouchString(12);
            const dbLocation = path.join(
                __dirname,
                '../',
                databaseName
            );

            const storageInstance = await storage.createStorageInstance<{ key: string }>({
                databaseName: dbLocation,
                collectionName: randomCouchString(12),
                schema: getPseudoSchemaForVersion(0, 'key'),
                options: {},
                multiInstance: false
            });

            const localState = await ensureNotFalsy(storageInstance.internals.localState);
            assert.ok(localState.databaseState.database.persistenceAdapter === adapter);
            await storageInstance.bulkWrite([{ document: { key: 'foobar', _attachments: {} } }]);

            /**
             * It should have written the file to the filesystem
             * on the next autosave which is called on close()
             */
            await storageInstance.close();
            const exists = fs.existsSync(dbLocation + '.db');
            assert.ok(exists);
        });
        it('should have called the autosaveCallback', async () => {
            if (!config.platform.isNode()) {
                return;
            }
            const lfsa = require('lokijs/src/loki-fs-structured-adapter.js');
            const adapter = new lfsa();

            let callbackCalledCount = 0;
            const storage = getRxStorageLoki({
                adapter,
                autosaveCallback: () => callbackCalledCount = callbackCalledCount + 1
            });
            const databaseName = 'lokijs-fs-adapter-test-' + randomCouchString(12);
            const dbLocation = path.join(
                __dirname,
                '../',
                databaseName
            );
            const storageInstance = await storage.createStorageInstance<{ key: string }>({
                databaseName: dbLocation,
                collectionName: randomCouchString(12),
                schema: getPseudoSchemaForVersion(0, 'key'),
                options: {},
                multiInstance: false
            });

            await storageInstance.bulkWrite([{ document: { key: 'foobar', _attachments: {} } }]);

            await waitUntil(() => callbackCalledCount === 1);
            await storageInstance.close();
        });
        /**
         * All stored documents need a $lastWriteAt flag,
         * so we can later implement an auto_compaction that
         * removes tombstones of deleted documents.
         */
        it('should add the $lastWriteAt flag to all documents', async () => {
            const startTime = now();
            const collection = await humansCollections.create(
                1,
                randomCouchString(10),
                false,
                true,
                getRxStorageLoki()
            );
            const doc = await collection.findOne().exec(true);
            await doc.atomicPatch({ age: 100 });
            const docId = doc.primary;

            const localState = await collection.storageInstance.internals.localState;
            const documentInDb = localState.collection.by(doc.primaryPath, docId);

            assert.ok(documentInDb.$lastWriteAt);
            assert.ok(documentInDb.$lastWriteAt > startTime);

            collection.database.destroy();
        });
    });
    config.parallel('issues', () => {
        /**
         * When the leading tab is set to cpu throttling mode by the browsers,
         * running setTimeout takes way longer then the given time.
         * Because LokiJS is in-memory, we elect a leader and all requests go to that leader.
         * This means when the leader is cpu-throttled, we have a realy slow response.
         * 
         * So in this test we assure that the internals of the LokiJS RxStorage
         * do not use any setTimeout call.
         * 
         * @link https://github.com/pubkey/rxdb/issues/3666#issuecomment-1027801805
         */
        describe('#3666 RxDB with lokijs works bad in Safari and FF when using multiple tabs', () => {
            it('must not use setTimeout internally', async () => {
                if (
                    // run only on node to ensure that rewriting the setTimeout works properly.
                    !config.platform.isNode() ||
                    // do not run in fast mode because we overwrite global.setTimeout which break parallel tests.
                    config.isFastMode()
                ) {
                    return;
                }

                const oldSetTimeout = global.setTimeout;
                (global as any).setTimeout = (fn: Function, time: number) => {
                    throw new Error('LokiJS must not use setTimeout(' + fn.toString() + ', ' + time + ')');
                }

                const storage = getRxStorageLoki({
                    /**
                     * Do not set a persistence adapter.
                     * It is allowed to use setTimeout in the persistence
                     * because it is required to have it to determine when the database is isdle.
                     * Also the persistence happens in the background so it is not that bad
                     * if the setTimeout takes longer because the browser throttled the tab.
                     */
                });

                const storageInstance = await storage.createStorageInstance({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    multiInstance: false,
                    options: {},
                    schema: schemas.human
                });

                const firstDocData = Object.assign(schemaObjects.human(), {
                    _deleted: false,
                    _attachments: {}
                });
                await storageInstance.bulkWrite([
                    {
                        document: firstDocData
                    }
                ]);

                await storageInstance.bulkAddRevisions([
                    Object.assign(schemaObjects.human(), {
                        _deleted: false,
                        _attachments: {},
                        _rev: '1-51b2fae5721cc4d3cf7392f19e6cc118'
                    })
                ]);
                const preparedQuery = storage.statics.prepareQuery(
                    schemas.human,
                    {
                        selector: {}
                    }
                );
                await storageInstance.query(preparedQuery);

                await storageInstance.findDocumentsById([firstDocData.passportId], false);

                const keyObjectStorageInstance = await storage.createKeyObjectStorageInstance({
                    databaseName: randomCouchString(12),
                    collectionName: randomCouchString(12),
                    multiInstance: false,
                    options: {}
                });

                await keyObjectStorageInstance.bulkWrite([{
                    document: {
                        _id: 'foobar',
                        _attachments: {},
                        _deleted: false
                    }
                }]);
                await keyObjectStorageInstance.findLocalDocumentsById(['foobar'], false);

                await storageInstance.close();
                await keyObjectStorageInstance.close();

                // reset the global.setTimeout so the following tests work properly.
                global.setTimeout = oldSetTimeout;
            });
        });
    });

});
