import assert from 'assert';

import config from './config';
import {
    addRxPlugin,
    ensureNotFalsy,
    getPseudoSchemaForVersion,
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
import { HumanDocumentType } from '../helper/schema-objects';
import { waitUntil } from 'async-test-util';
addRxPlugin(RxDBValidatePlugin);
import * as path from 'path';
import * as fs from 'fs';

/**
 * RxStoragePouch specific tests
 */
config.parallel('rx-storage-lokijs.test.js', () => {
    describe('RxDatabase', () => {
        it('create write remove', async () => {
            const collection = await humansCollections.create(
                10,
                randomCouchString(10),
                true,
                true,
                getRxStorageLoki()
            );
            const doc = await collection.findOne().exec(true);
            assert.ok(doc);

            // should have the same broadcastChannel as the database
            const databaseBc = collection.database.broadcastChannel;
            const storageInstance: RxStorageInstanceLoki<HumanDocumentType> = collection.storageInstance as any;
            const localStorageInstance: RxStorageKeyObjectInstanceLoki = collection.localDocumentsStore as any;
            const storageBc = storageInstance.broadcastChannel;
            assert.ok(databaseBc);
            assert.ok(storageBc);
            assert.ok(localStorageInstance.broadcastChannel);

            assert.ok(databaseBc === storageBc);
            assert.ok(databaseBc === localStorageInstance.broadcastChannel);
            assert.ok(storageInstance.leaderElector);

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
                options: {}
            });

            const localState = await storageInstance.internals.localState;

            assert.ok(ensureNotFalsy(localState).database.persistenceAdapter === adapter);
            await storageInstance.bulkWrite([{ document: { key: 'foobar', _attachments: {} } }]);
            await storageInstance.close();

            // it should have written the file to the filesystem
            const exists = fs.existsSync(dbLocation + '.db');
            assert.ok(exists);
        });
    });

});
