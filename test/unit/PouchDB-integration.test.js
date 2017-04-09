const platform = require('platform');
import assert from 'assert';
import {
    default as memdown
} from 'memdown';

let leveldown;
let leveldb;
if (platform.isNode()) {
    leveldown = require('leveldown');
    leveldb = require('pouchdb-adapter-leveldb');
}
import * as RxDB from '../../dist/lib/index';
import * as util from '../../dist/lib/util';

describe('PouchDB-integration.test.js', () => {
    describe('init', () => {
        it('should export the pouchDB-module', async() => {
            assert.equal(typeof RxDB.PouchDB, 'function');
        });
    });
    describe('memdown', () => {
        it('should not allow leveldown-adapters without the plugin', async() => {
            await util.assertThrowsAsync(
                () => RxDB.create({
                    name: util.randomCouchString(10),
                    adapter: memdown
                }),
                Error
            );
        });
        it('should work after adding the leveldb-plugin', async() => {
            if (!platform.isNode()) return;
            RxDB.PouchDB.plugin(leveldb);
            const db = await RxDB.create({
                name: util.randomCouchString(10),
                adapter: memdown
            });
            assert.equal(db.constructor.name, 'RxDatabase');
            db.destroy();
        });
    });

    describe('pouchdb-adapter-memory', () => {
        it('should not create a db without adding the adapter', async() => {
            await util.assertThrowsAsync(
                () => RxDB.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                }),
                Error
            );
        });
        it('should work when adapter was added', async() => {
            RxDB.plugin(require('pouchdb-adapter-memory'));
            const db = await RxDB.create({
                name: util.randomCouchString(10),
                adapter: 'memory'
            });
            assert.equal(db.constructor.name, 'RxDatabase');
            db.destroy();
        });
    });
    describe('localstorage', () => {
        it('should crash because nodejs has no localstorage', async() => {
            if (!platform.isNode()) return;
            RxDB.PouchDB.plugin(require('pouchdb-adapter-localstorage'));
            await util.assertThrowsAsync(
                () => RxDB.create({
                    name: util.randomCouchString(10),
                    adapter: 'localstorage'
                }),
                Error
            );
        });
    });
    describe('websql', () => {
        describe('negative', () => {
            it('should fail when no adapter was added', async() => {
                await util.assertThrowsAsync(
                    () => RxDB.create({
                        name: util.randomCouchString(10),
                        adapter: 'websql'
                    }),
                    Error
                );
            });
        });
        describe('positive', () => {
            it('should work after adding the adapter', async() => {
                if (platform.isNode()) return;
                if (/Firefox/.test(window.navigator.userAgent)) return;

                // no websql in internet explorer nor Edge
                if (platform.name == 'IE') return;
                if (platform.name == 'Microsoft Edge') return;

                RxDB.plugin(require('pouchdb-adapter-websql'));
                const db = await RxDB.create({
                    name: util.randomCouchString(10),
                    adapter: 'websql'
                });
                assert.equal(db.constructor.name, 'RxDatabase');
                await util.promiseWait(1000);
                db.destroy();
            });
        });
    });


    describe('own pouchdb functions', () => {
        describe('.countAllUndeleted()', () => {
            it('should return 0', async() => {
                const name = util.randomCouchString(10);
                const pouchdb = new RxDB.PouchDB(
                    name, {
                        adapter: 'memory'
                    }
                );
                const count = await RxDB.PouchDB.countAllUndeleted(pouchdb);
                assert.deepEqual(count, 0);
            });
            it('should return 1', async() => {
                const name = util.randomCouchString(10);
                const pouchdb = new RxDB.PouchDB(
                    name, {
                        adapter: 'memory'
                    }
                );
                await pouchdb.put({
                    _id: util.randomCouchString(10)
                });
                const count = await RxDB.PouchDB.countAllUndeleted(pouchdb);
                assert.deepEqual(count, 1);
            });
            it('should not count deleted docs', async() => {
                const name = util.randomCouchString(10);
                const pouchdb = new RxDB.PouchDB(
                    name, {
                        adapter: 'memory'
                    }
                );
                const _id = util.randomCouchString(10);
                await pouchdb.put({
                    _id,
                    x: 1
                });

                const countBefore = await RxDB.PouchDB.countAllUndeleted(pouchdb);
                assert.deepEqual(countBefore, 1);

                const doc = await pouchdb.get(_id);
                await pouchdb.remove(doc);
                const count = await RxDB.PouchDB.countAllUndeleted(pouchdb);
                assert.deepEqual(count, 0);
            });
            it('should count a big amount with one deleted doc', async() => {
                const name = util.randomCouchString(10);
                const pouchdb = new RxDB.PouchDB(
                    name, {
                        adapter: 'memory'
                    }
                );

                const _id = util.randomCouchString(10);
                await pouchdb.put({
                    _id,
                    x: 1
                });
                const countBefore = await RxDB.PouchDB.countAllUndeleted(pouchdb);
                assert.deepEqual(countBefore, 1);
                const doc = await pouchdb.get(_id);
                await pouchdb.remove(doc);

                let t = 42;
                while (t > 0) {
                    await pouchdb.put({
                        _id: util.randomCouchString(10),
                        x: 1
                    });
                    t--;
                }
                const count = await RxDB.PouchDB.countAllUndeleted(pouchdb);
                assert.deepEqual(count, 42);
            });
        });
        describe('.getBatch()', () => {
            it('should return empty array', async() => {
                const name = util.randomCouchString(10);
                const pouchdb = new RxDB.PouchDB(
                    name, {
                        adapter: 'memory'
                    }
                );
                const docs = await RxDB.PouchDB.getBatch(pouchdb, 10);
                assert.deepEqual(docs, []);
            });
            it('should not return deleted', async() => {
                const name = util.randomCouchString(10);
                const pouchdb = new RxDB.PouchDB(
                    name, {
                        adapter: 'memory'
                    }
                );

                const _id = util.randomCouchString(10);
                await pouchdb.put({
                    _id,
                    x: 1
                });

                const countBefore = await RxDB.PouchDB.countAllUndeleted(pouchdb);
                assert.deepEqual(countBefore, 1);

                const doc = await pouchdb.get(_id);
                await pouchdb.remove(doc);

                const docs = await RxDB.PouchDB.getBatch(pouchdb, 10);
                assert.deepEqual(docs, []);
            });
            it('should return one document in array', async() => {
                const name = util.randomCouchString(10);
                const pouchdb = new RxDB.PouchDB(
                    name, {
                        adapter: 'memory'
                    }
                );
                const _id = util.randomCouchString(10);
                await pouchdb.put({
                    _id,
                    x: 1
                });
                const docs = await RxDB.PouchDB.getBatch(pouchdb, 10);
                assert.equal(docs.length, 1);
                assert.equal(docs[0].x, 1);
                assert.equal(docs[0]._id, _id);
            });

            it('should max return batchSize', async() => {
                const name = util.randomCouchString(10);
                const pouchdb = new RxDB.PouchDB(
                    name, {
                        adapter: 'memory'
                    }
                );

                let t = 42;
                while (t > 0) {
                    await pouchdb.put({
                        _id: util.randomCouchString(10),
                        x: 1
                    });
                    t--;
                }
                const batchSize = 13;
                const docs = await RxDB.PouchDB.getBatch(pouchdb, batchSize);
                assert.equal(docs.length, batchSize);
                docs.forEach(doc => {
                    assert.equal(doc.x, 1);
                });
            });
        });
    });

    describe('BUGS: pouchdb', () => {
        it('_local documents should not be cached by pouchdb', async() => {
            const name = util.randomCouchString(10);
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
                'PouchError'
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
