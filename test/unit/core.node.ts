/**
 * this test checks if the core-module is usable without any plugins
 * this is run in a separate node-process via plugin.test.js
 */

import assert from 'assert';
import config from './config';
import {
    createRxDatabase,
    isRxDocument,
    randomCouchString,
    RxJsonSchema,
    addRxPlugin
} from '../../';

import {
    addPouchPlugin,
    getRxStoragePouch
} from '../../plugins/pouchdb';

addPouchPlugin(require('pouchdb-adapter-memory'));

const schema: RxJsonSchema<{ passportId: string; firstName: string; lastName: string }> = {
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: false,
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        firstName: {
            type: 'string'
        },
        lastName: {
            type: 'string'
        }
    },
    indexes: [],
    required: ['firstName', 'lastName']
};

config.parallel('core.node.js', () => {
    describe('creation', () => {
        it('create database', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                storage: getRxStoragePouch('memory'),
            });
            db.destroy();
        });
        it('create collection', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                storage: getRxStoragePouch('memory'),
            });
            await db.addCollections({
                humans: {
                    schema
                }
            });
            db.destroy();
        });
    });
    describe('document interaction', () => {
        it('insert and find a document', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                storage: getRxStoragePouch('memory'),
            });
            await db.addCollections({
                humans: {
                    schema
                }
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
        it('should throw error-codes instead of messages', () => {
            let error;
            try {
                addRxPlugin({
                    foo: 'bar'
                } as any);
            } catch (e) {
                error = e;
            }
            assert.ok(error);
            assert.strictEqual((error as any).code, 'PL1');
        });
    });
});
