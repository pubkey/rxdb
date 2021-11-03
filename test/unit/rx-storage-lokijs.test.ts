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
addRxPlugin(RxDBValidatePlugin);

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
            const storageInstance = await storage.createStorageInstance<{ key: string }>({
                databaseName: randomCouchString(12),
                collectionName: randomCouchString(12),
                schema: getPseudoSchemaForVersion(0, 'key'),
                options: {
                    database: {}
                }
            });

            const localState = await storageInstance.internals.localState;

            assert.ok(ensureNotFalsy(localState).database.persistenceAdapter === adapter);
            await storageInstance.bulkWrite([{ document: { key: 'foobar', _attachments: {} } }]);
            storageInstance.close();
        });
    });

});
