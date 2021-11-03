import assert from 'assert';

import config from './config';
import {
    addRxPlugin,
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

//            process.exit();
        });
    });

});
