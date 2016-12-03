import assert from 'assert';
import {
    default as randomToken
} from 'random-token';

import {
    default as memdown
} from 'memdown';
import {
    default as leveldown
} from 'leveldown';

import * as RxDB from '../../lib/index';
import * as util from '../../lib/util';

process.on('unhandledRejection', function(err) {
    throw err;
});

describe('PouchDB-integration.test.js', () => {

    describe('init', () => {
        it('should export the pouchDB-module', async() => {
            assert.equal(typeof RxDB.PouchDB, 'function');
        });
    });

    describe('memdown', () => {
        it('should not allow leveldown-adapters without the plugin', async() => {
            await util.assertThrowsAsync(
                () => RxDB.create(randomToken(10), memdown),
                Error
            );
        });
        it('should work after adding the leveldb-plugin', async() => {
            RxDB.PouchDB.plugin(require('pouchdb-adapter-leveldb'));
            const db = await RxDB.create(randomToken(10), memdown);
            assert.equal(db.constructor.name, 'RxDatabase');
        });
    });

    describe('pouchdb-adapter-memory', () => {
        it('should not create a db without adding the adapter', async() => {
            await util.assertThrowsAsync(
                () => RxDB.create(randomToken(10), 'memory'),
                Error
            );
        });
        it('should work when adapter was added', async() => {
            RxDB.plugin(require('pouchdb-adapter-memory'));
            const db = await RxDB.create(randomToken(10), 'memory');
            assert.equal(db.constructor.name, 'RxDatabase');
        });
    });

    describe('localstorage', () => {
        it('should crash because nodejs has no localstorage', async() => {
            RxDB.PouchDB.plugin(require('pouchdb-adapter-localstorage'));
            await util.assertThrowsAsync(
                () => RxDB.create(randomToken(10), 'localstorage'),
                Error
            );
        });
    });
});
