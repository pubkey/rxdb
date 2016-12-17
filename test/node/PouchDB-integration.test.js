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

import * as RxDB from '../../dist/lib/index';
import * as util from '../../dist/lib/util';

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
            db.destroy();
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
            db.destroy();
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


    describe('BUGS: pouchdb', () => {
        it('_local documents should not be cached by pouchdb', async() => {
            const name = randomToken(10);
            const _id = '_local/foobar';
            const createPouch = () => {
                return new RxDB.PouchDB(
                    name, {
                        adapter: 'memory'
                    }, {
                        auto_compaction: true,
                        revs_limit: 1
                    }
                );
            };
            const pouch1 = createPouch();
            const pouch2 = createPouch();
            await util.assertThrowsAsync(
                () => pouch2.get(_id),
                Error
            );
            // insert
            await pouch1.put({
                _id,
                value: 'foo'
            });
            const doc2 = await pouch2.get(_id);
            assert.equal(doc2.value, 'foo');

            pouch1.destroy();
            pouch2.destroy();
        });
    });
});
