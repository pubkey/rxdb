/**
 * this tests some basic behavior and then exits with zero-code
 * this is run in a seperate node-process via in-memory.test.js
 */

import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import PouchAdapterMemory from 'pouchdb-adapter-memory';
const leveldown = require('leveldown');

import * as util from '../../dist/lib/util';


const RxDB = require('../../plugins/core/');
RxDB.plugin(require('../../plugins/in-memory'));
RxDB.plugin(require('../../plugins/error-messages'));
RxDB.plugin(require('../../plugins/watch-for-changes'));

RxDB.plugin(require('pouchdb-adapter-leveldb'));

const schema = {
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: false,
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            index: true
        },
        firstName: {
            type: 'string'
        },
        lastName: {
            type: 'string'
        }
    },
    required: ['firstName', 'lastName']
};

describe('in-memory.node.js', () => {
    it('should throw when used without memory-adapter', async () => {
        const db = await RxDB.create({
            name: '../test_tmp/' + util.randomCouchString(10),
            adapter: leveldown
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
        RxDB.plugin(PouchAdapterMemory);
        const db = await RxDB.create({
            name: '../test_tmp/' + util.randomCouchString(10),
            adapter: leveldown
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
