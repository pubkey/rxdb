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
 * RxStoragePouch specific tests
 */
config.parallel('rx-storage-lokijs.test.js', () => {
    describe('RxDatabase', () => {
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

            const insertedHuman = await collection.insert({
                passportId: 'aatspywninca',
                firstName: 'Tester',
                lastName: 'Test',
                age: 10
            })

            const newHuman = await collection.findOne('aatspywninca').exec()

            assert.strictEqual(newHuman?.toJSON(), {
                passportId: 'aatspywninca',
                firstName: 'Tester',
                lastName: 'Test',
                age: 10,
            })

            assert.strictEqual(insertedHuman.toJSON(), {
                passportId: 'aatspywninca',
                firstName: 'Tester',
                lastName: 'Test',
                age: 10,
            })

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

});
