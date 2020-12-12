/**
 * this test checks if the core-module is useable without any plugins
 * this is run in a seperate node-process via plugin.test.js
 */

import assert from 'assert';
import AsyncTestUtil from 'async-test-util';

import config from './config';
import {
    addRxPlugin,
    createRxDatabase,
    isRxDocument,
    randomCouchString,
    RxJsonSchema
} from '../../plugins/core';

addRxPlugin(require('../../plugins/validate'));
addRxPlugin(require('pouchdb-adapter-memory'));

const schema: RxJsonSchema = {
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: false,
    type: 'object',
    properties: {
        passportId: {
            type: 'string'
        },
        firstName: {
            type: 'string'
        },
        lastName: {
            type: 'string'
        }
    },
    indexes: ['passportId'],
    required: ['firstName', 'lastName']
};

config.parallel('core.node.js', () => {
    describe('creation', () => {
        it('create database', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
            });
            db.destroy();
        });
        it('should not be able to create a encrypted database', async () => {
            await AsyncTestUtil.assertThrows(
                () => createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory',
                    password: 'myLongAndStupidPassword'
                }),
                Error,
                'plugin'
            );
        });
        it('create collection', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
            });
            await db.collection({
                name: 'humans',
                schema
            });
            db.destroy();
        });
    });
    describe('document interaction', () => {
        it('insert and find a document', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
            });
            await db.collection({
                name: 'humans',
                schema
            });

            await db.humans.insert({
                passportId: 'mypw',
                firstName: 'steve',
                lastName: 'piotr'
            });

            const doc = await db.humans.findOne({
                selector: {
                    firstName: {
                        $ne: 'foobar'
                    }
                }
            }).exec();
            assert.ok(isRxDocument(doc));

            db.destroy();
        });
    });
    describe('error-codes', () => {
        it('should throw error-codes instead of messages', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
            });
            const col = await db.collection({
                name: 'humans',
                schema
            });
            let error;
            try {
                await col.insert({
                    foo: 'bar'
                });
            } catch (e) {
                error = e;
            }
            assert.ok(error);
            assert.strictEqual(error.code, 'VD2');
            db.destroy();
        });
    });
});
