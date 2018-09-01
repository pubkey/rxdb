import config from './config';
import assert from 'assert';
import memdown from 'memdown';

let leveldb;
if (config.platform.isNode())
    leveldb = require('pouchdb-adapter-leveldb');

import * as RxDB from '../../dist/lib/index';
import * as util from '../../dist/lib/util';
import * as schemaObjects from './../helper/schema-objects';
import AsyncTestUtil from 'async-test-util';

config.parallel('pouch-db-integration.test.js', () => {
    describe('init', () => {
        it('should export the pouchDB-module', async () => {
            assert.equal(typeof RxDB.PouchDB, 'function');
        });
    });
    describe('memdown', () => {
        it('should not allow leveldown-adapters without the plugin', async () => {
            await AsyncTestUtil.assertThrows(
                () => RxDB.create({
                    name: util.randomCouchString(10),
                    adapter: memdown
                }),
                'RxError',
                'leveldb-plugin'
            );
        });
        it('should work after adding the leveldb-plugin', async () => {
            if (!config.platform.isNode()) return;
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
        it('should not create a db without adding the adapter', async () => {
            await AsyncTestUtil.assertThrows(
                () => RxDB.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                }),
                'RxError',
                'Adapter'
            );
        });
        it('should work when adapter was added', async () => {
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
        it('should crash because nodejs has no localstorage', async () => {
            if (!config.platform.isNode()) return;
            RxDB.PouchDB.plugin(require('pouchdb-adapter-localstorage'));
            await AsyncTestUtil.assertThrows(
                () => RxDB.create({
                    name: util.randomCouchString(10),
                    adapter: 'localstorage'
                }),
                'RxError',
                'Adapter'
            );
        });
    });
    describe('websql', () => {
        describe('negative', () => {
            it('should fail when no adapter was added', async () => {
                await AsyncTestUtil.assertThrows(
                    () => RxDB.create({
                        name: util.randomCouchString(10),
                        adapter: 'websql'
                    }),
                    'RxError',
                    'Adapter'
                );
            });
        });
        describe('positive', () => {
            it('should work after adding the adapter', async () => {
                // test websql on chrome only
                if (config.platform.name !== 'chrome') return;

                RxDB.plugin(require('pouchdb-adapter-websql'));
                const db = await RxDB.create({
                    name: util.randomCouchString(10),
                    adapter: 'websql'
                });
                assert.equal(db.constructor.name, 'RxDatabase');
                await util.promiseWait(10);
                db.destroy();
            });
        });
    });
    describe('own pouchdb functions', () => {
        describe('.countAllUndeleted()', () => {
            it('should return 0', async () => {
                const name = util.randomCouchString(10);
                const pouchdb = new RxDB.PouchDB(
                    name, {
                        adapter: 'memory'
                    }
                );
                const count = await RxDB.PouchDB.countAllUndeleted(pouchdb);
                assert.deepEqual(count, 0);
            });
            it('should return 1', async () => {
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
            it('should not count deleted docs', async () => {
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
            it('should count a big amount with one deleted doc', async () => {
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
            it('should return empty array', async () => {
                const name = util.randomCouchString(10);
                const pouchdb = new RxDB.PouchDB(
                    name, {
                        adapter: 'memory'
                    }
                );
                const docs = await RxDB.PouchDB.getBatch(pouchdb, 10);
                assert.deepEqual(docs, []);
            });
            it('should not return deleted', async () => {
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
            it('should return one document in array', async () => {
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

            it('should max return batchSize', async () => {
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
        it('_local documents should not be cached by pouchdb', async () => {
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
            await AsyncTestUtil.assertThrows(
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
        /**
         * @link https://github.com/pouchdb/pouchdb/issues/6733
         */
        it('pouchdb.find() should not return design-docs', async () => {
            const pouch = new RxDB.PouchDB(
                util.randomCouchString(10), {
                    adapter: 'memory'
                }, {
                    auto_compaction: true,
                    revs_limit: 1
                }
            );

            await pouch.createIndex({
                index: {
                    fields: ['foo']
                }
            });

            // add one doc
            await pouch.put({
                _id: 'asdf',
                foo: 'bar'
            });

            // get docs
            const docs = await pouch.find({
                selector: {
                    foo: {
                        $gt: null
                    }
                },
                sort: ['foo']
            });

            assert.equal(docs.docs.length, 1);

            pouch.destroy();
        });
        it('removing via bulkDocs does not work', async () => {
            const pouch = new RxDB.PouchDB(
                util.randomCouchString(10), {
                    adapter: 'memory'
                }, {
                    auto_compaction: true,
                    revs_limit: 1
                }
            );

            // add one doc
            await pouch.put({
                _id: 'foobar',
                foo: 'bar'
            });

            // overwrite via bulkDocs
            await pouch.bulkDocs([{
                _id: 'foobar',
                foo: 'bar',
                _rev: '2-6c5d4399ffe848f395069eab42630eee'
            }], {
                new_edits: false
            });

            // find again
            const foundAfter = await pouch.find({
                selector: {}
            });
            assert.ok(foundAfter.docs[0]._rev.startsWith('2-')); // ok

            // delete via bulkDocs
            const x = await pouch.put({
                _id: 'foobar',
                foo: 'bar',
                _rev: '3-13af8c9a835820969a8a273b18783a70',
                _deleted: true
            }, {
                new_edits: false
            });
            assert.equal(x.length, 0);

            /**
             * If this test ever throws, it means we can remove the hacky workarround in
             * src/plugins/in-memory.js
             * Where we add the emitFlag to 'doNotEmitSet'
             */
            await AsyncTestUtil.assertThrows(
                async () => {
                    const foundAfter2 = await pouch.find({
                        selector: {}
                    });
                    assert.ok(foundAfter2.docs[0]._rev.startsWith('3-'));
                },
                'AssertionError'
            );

            pouch.destroy();
        });
        it('putting with _deleted does not work', async () => {
            const pouch = new RxDB.PouchDB(
                util.randomCouchString(10), {
                    adapter: 'memory'
                }, {
                    auto_compaction: true,
                    revs_limit: 1
                }
            );
            const bulkOptions = {
                new_edits: false
            };

            // subscribe to changes 2 times
            pouch.changes({
                since: 'now',
                live: true,
                include_docs: true
            });
            pouch.changes({
                since: 'now',
                live: true,
                include_docs: true
            });

            // insert doc via bulkDocs
            await pouch.bulkDocs({
                docs: [{
                    '|c': '0waqyh2xjwtu',
                    '|a': 'foo123',
                    '|b': 'King',
                    age: 1,
                    _id: 'myid',
                    _rev: '1-62080c42d471e3d2625e49dcca3b8e3e'
                }]
            }, bulkOptions);

            let foundAfter = await pouch.find({
                selector: {}
            });
            assert.equal(foundAfter.docs.length, 1);


            // update via bulkDocs
            const updateMe = foundAfter.docs[0];
            updateMe.firstName = 'foobar';
            await pouch.bulkDocs({
                docs: [updateMe]
            }, bulkOptions);

            // remove
            foundAfter = await pouch.find({
                selector: {}
            });
            const removeMe = foundAfter.docs[0];
            removeMe._deleted = true;
            await pouch.get('myid').catch(() => null);
            await pouch.put(removeMe);

            await AsyncTestUtil.wait(100);

            foundAfter = await pouch.find({
                selector: {}
            });
            assert.equal(foundAfter.docs.length, 0);


            pouch.destroy();
        });
        it('put->delete-put will find the previous document', async () => {
            const pouch = new RxDB.PouchDB(
                util.randomCouchString(10), {
                    adapter: 'memory'
                }
            );
            const BULK_DOC_OPTIONS = {
                new_edits: false
            };

            const docData = schemaObjects.human();
            docData._id = 'foobar1';
            const ret = await pouch.put(docData);

            await AsyncTestUtil.wait(100);

            const docData2 = util.clone(docData);
            docData2._rev = ret.rev;
            docData2._deleted = true;

            await pouch.bulkDocs({
                docs: [docData2]
            }, BULK_DOC_OPTIONS);

            await AsyncTestUtil.wait(100);

            /**
             * If this test ever throws, it means we can remove the hacky workarround in
             * src/plugins/in-memory.js
             * Where we add the emitFlag to 'doNotEmitSet'
             */
            await AsyncTestUtil.assertThrows(
                async () => {
                    const foundAfter2 = await pouch.find({
                        selector: {}
                    });
                    assert.equal(foundAfter2.docs.length, 0);
                },
                'AssertionError'
            );

            // process.exit();
            pouch.destroy();
        });
    });
});
