import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import config from './config';

import * as schemaObjects from '../helper/schema-objects';
import * as schemas from '../helper/schemas';

import {
    randomCouchString,
    addRxPlugin,
    createRxDatabase
} from '../../plugins/core';

import { RxDBValidateZSchemaPlugin } from '../../plugins/validate-z-schema';
addRxPlugin(RxDBValidateZSchemaPlugin);

import { RxDBKeyCompressionPlugin } from '../../plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);

import { RxDBDevModePlugin } from '../../plugins/dev-mode';
addRxPlugin(RxDBDevModePlugin);

addRxPlugin(require('pouchdb-adapter-memory'));

config.parallel('validate-z-schema.node.js', () => {
    describe('validation', () => {
        describe('positive', () => {
            it('should not throw', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                const col = await db.collection({
                    name: 'humans',
                    schema: schemas.human
                });

                const doc = await col.insert(schemaObjects.human());
                assert.ok(doc);

                db.destroy();
            });
        });
        describe('negative', () => {
            it('should not validate wrong data', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                const col = await db.collection({
                    name: 'humans',
                    schema: schemas.human
                });

                await AsyncTestUtil.assertThrows(
                    () => col.insert({
                        foo: 'bar'
                    }),
                    'RxError'
                );

                db.destroy();
            });
            it('should have the correct params in error', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                const col = await db.collection({
                    name: 'humans',
                    schema: schemas.human
                });

                let error = null;
                try {
                    await col.insert({
                        foo: 'bar'
                    });
                } catch (e) {
                    error = e;
                }

                assert.ok(error);
                assert.ok(error.parameters.errors.length > 0);
                db.destroy();
            });
        });
    });
});
