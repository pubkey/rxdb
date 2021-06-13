/**
 * this tests some basic behavior and then exits with zero-code
 * this is run in a seperate node-process via in-memory.test.js
 */

import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import PouchAdapterMemory from 'pouchdb-adapter-memory';
const leveldown = require('leveldown');

import {
    RxJsonSchema
} from '../../plugins/core';

import {
    getRxStoragePouch,
    addPouchPlugin
} from '../../plugins/pouchdb';

import config from './config';

const {
    addRxPlugin,
    createRxDatabase,
    randomCouchString
} = require('../../plugins/core/');

import { RxDBInMemoryPlugin } from '../../plugins/in-memory';
addRxPlugin(RxDBInMemoryPlugin);

import { RxDBDevModePlugin } from '../../plugins/dev-mode';
addRxPlugin(RxDBDevModePlugin);

addPouchPlugin(require('pouchdb-adapter-leveldb'));

const schema: RxJsonSchema<{ passportId: string; firstName: string; lastName: string; }> = {
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    primaryKey: 'passportId',
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
    indexes: [],
    required: ['firstName', 'lastName']
};

describe('in-memory.node.js', () => {
    it('should throw when used without memory-adapter', async () => {
        const db = await createRxDatabase({
            name: (config as any).rootPath + 'test_tmp/' + randomCouchString(10),
            storage: getRxStoragePouch(leveldown)
        });
        const col = await db.collection({
            name: 'humans',
            schema
        });

        await AsyncTestUtil.assertThrows(
            () => col.inMemory(),
            'RxError',
            'adapter-memory'
        );

        db.destroy();
    });
    it('should work again when memory-adapter was added', async () => {
        addPouchPlugin(PouchAdapterMemory);
        const db = await createRxDatabase({
            name: (config as any).rootPath + 'test_tmp/' + randomCouchString(10),
            storage: getRxStoragePouch(leveldown)
        });
        const col = await db.collection({
            name: 'humans',
            schema
        });

        const memCol = await col.inMemory();
        assert.ok(memCol);

        db.destroy();
    });
});
