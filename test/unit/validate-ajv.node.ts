import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import config from './config';

import * as schemaObjects from '../helper/schema-objects';
import * as schemas from '../helper/schemas';

import {
    addRxPlugin,
    createRxDatabase,
    randomCouchString,
} from '../../';

import {
    addPouchPlugin,
    getRxStoragePouch
} from '../../plugins/pouchdb';

import { RxDBValidateAjvPlugin } from '../../plugins/validate-ajv';
addRxPlugin(RxDBValidateAjvPlugin);

import { RxDBKeyCompressionPlugin } from '../../plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);

import { RxDBDevModePlugin } from '../../plugins/dev-mode';
addRxPlugin(RxDBDevModePlugin);

addPouchPlugin(require('pouchdb-adapter-memory'));

config.parallel('validate-ajv.node.js', () => {
    describe('validation', () => {
        describe('positive', () => {
            it('should not throw', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: getRxStoragePouch('memory'),
                });
                const cols = await db.addCollections({
                    humans: {
                        schema: schemas.human
                    }
                });

                const doc = await cols.humans.insert(schemaObjects.human());
                assert.ok(doc);

                db.destroy();
            });
        });
        describe('negative', () => {
            it('should not validate wrong data', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: getRxStoragePouch('memory'),
                });
                const cols = await db.addCollections({
                    humans: {
                        schema: schemas.human
                    }
                });

                await AsyncTestUtil.assertThrows(
                    () => cols.humans.insert({
                        foo: 'bar'
                    }),
                    'RxError'
                );

                db.destroy();
            });
            it('should have the correct params in error', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: getRxStoragePouch('memory'),
                });
                const cols = await db.addCollections({
                    humans: {
                        schema: schemas.human
                    }
                });

                let error = null;
                try {
                    await cols.humans.insert({
                        foo: 'bar'
                    });
                } catch (e) {
                    error = e;
                }

                assert.ok(error);
                assert.ok((error as any).parameters.errors.length > 0);
                db.destroy();
            });
        });
    });
});
