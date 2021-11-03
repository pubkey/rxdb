import assert from 'assert';

import config from './config';
import {
    addRxPlugin,
    ensureNotFalsy,
    getPseudoSchemaForVersion,
    randomCouchString
} from '../../plugins/core';

import {
    getRxStorageLoki
} from '../../plugins/lokijs';

import * as humansCollections from '../helper/humans-collection';

import { RxDBKeyCompressionPlugin } from '../../plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);
import { RxDBValidatePlugin } from '../../plugins/validate';
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
            await collection.database.destroy();

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
