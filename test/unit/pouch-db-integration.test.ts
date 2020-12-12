import assert from 'assert';
import memdown from 'memdown';
import AsyncTestUtil from 'async-test-util';
import config from './config';

let leveldb: any;
if (config.platform.isNode())
    leveldb = require('pouchdb-adapter-leveldb');

import {
    createRxDatabase,
    addRxPlugin,
    randomCouchString,
    promiseWait,
    clone,
    countAllUndeleted,
    getBatch,
    PouchDB,
    isRxDatabase,
    PouchDBInstance
} from '../../plugins/core';
import * as schemaObjects from './../helper/schema-objects';

config.parallel('pouch-db-integration.test.js', () => {
    describe('init', () => {
        it('should export the pouchDB-module', () => {
            assert.strictEqual(typeof PouchDB, 'function');
        });
    });
    describe('memdown', () => {
        it('should not allow leveldown-adapters without the plugin', async () => {
            await AsyncTestUtil.assertThrows(
                () => createRxDatabase({
                    name: randomCouchString(10),
                    adapter: memdown
                }),
                'RxError',
                'leveldb-plugin'
            );
        });
        it('should work after adding the leveldb-plugin', async () => {
            if (!config.platform.isNode()) return;
            PouchDB.plugin(leveldb);
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: memdown
            });
            assert.ok(isRxDatabase(db));
            db.destroy();
        });
    });
    describe('pouchdb-adapter-memory', () => {
        it('should not create a db without adding the adapter', async () => {
            await AsyncTestUtil.assertThrows(
                () => createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                }),
                'RxError',
                'Adapter'
            );
        });
        it('should work when adapter was added', async () => {
            addRxPlugin(require('pouchdb-adapter-memory'));
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
            });
            assert.ok(isRxDatabase(db));
            db.destroy();
        });
    });
    describe('localstorage', () => {
        it('should crash because nodejs has no localstorage', async () => {
            if (!config.platform.isNode()) return;
            PouchDB.plugin(require('pouchdb-adapter-localstorage'));
            await AsyncTestUtil.assertThrows(
                () => createRxDatabase({
                    name: randomCouchString(10),
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
                    () => createRxDatabase({
                        name: randomCouchString(10),
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

                addRxPlugin(require('pouchdb-adapter-websql'));
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'websql'
                });
                assert.ok(isRxDatabase(db));
                await promiseWait(10);
                db.destroy();
            });
        });
    });
    describe('own pouchdb functions', () => {
        describe('.countAllUndeleted()', () => {
            it('should return 0', async () => {
                const name = randomCouchString(10);
                const pouchdb = new PouchDB(
                    name, {
                    adapter: 'memory'
                }
                );
                const count = await countAllUndeleted(pouchdb as any);
                assert.deepStrictEqual(count, 0);
            });
            it('should return 1', async () => {
                const name = randomCouchString(10);
                const pouchdb = new PouchDB(
                    name, {
                    adapter: 'memory'
                }
                );
                await pouchdb.put({
                    _id: randomCouchString(10)
                });
                const count = await countAllUndeleted(pouchdb as any);
                assert.deepStrictEqual(count, 1);
            });
            it('should not count deleted docs', async () => {
                const name = randomCouchString(10);
                const pouchdb = new PouchDB(
                    name, {
                    adapter: 'memory'
                }
                );
                const _id = randomCouchString(10);
                await pouchdb.put({
                    _id,
                    x: 1
                });

                const countBefore = await countAllUndeleted(pouchdb as any);
                assert.deepStrictEqual(countBefore, 1);

                const doc = await pouchdb.get(_id);
                await pouchdb.remove(doc);
                const count = await countAllUndeleted(pouchdb as any);
                assert.deepStrictEqual(count, 0);
            });
            it('should count a big amount with one deleted doc', async () => {
                const name = randomCouchString(10);
                const pouchdb = new PouchDB(
                    name, {
                    adapter: 'memory'
                }
                );

                const _id = randomCouchString(10);
                await pouchdb.put({
                    _id,
                    x: 1
                });
                const countBefore = await countAllUndeleted(pouchdb as any);
                assert.deepStrictEqual(countBefore, 1);
                const doc = await pouchdb.get(_id);
                await pouchdb.remove(doc);

                let t = 42;
                while (t > 0) {
                    await pouchdb.put({
                        _id: randomCouchString(10),
                        x: 1
                    });
                    t--;
                }
                const count = await countAllUndeleted(pouchdb as any);
                assert.deepStrictEqual(count, 42);
            });
        });
        describe('.getBatch()', () => {
            it('should return empty array', async () => {
                const name = randomCouchString(10);
                const pouchdb = new PouchDB(
                    name, {
                    adapter: 'memory'
                }
                );
                const docs = await getBatch(pouchdb as any, 10);
                assert.deepStrictEqual(docs, []);
            });
            it('should not return deleted', async () => {
                const name = randomCouchString(10);
                const pouchdb = new PouchDB(
                    name, {
                    adapter: 'memory'
                }
                );

                const _id = randomCouchString(10);
                await pouchdb.put({
                    _id,
                    x: 1
                });

                const countBefore = await countAllUndeleted(pouchdb as any);
                assert.deepStrictEqual(countBefore, 1);

                const doc = await pouchdb.get(_id);
                await pouchdb.remove(doc);

                const docs = await getBatch(pouchdb as any, 10);
                assert.deepStrictEqual(docs, []);
            });
            it('should return one document in array', async () => {
                const name = randomCouchString(10);
                const pouchdb = new PouchDB(
                    name, {
                    adapter: 'memory'
                }
                );
                const _id = randomCouchString(10);
                await pouchdb.put({
                    _id,
                    x: 1
                });
                const docs: any[] = await getBatch(pouchdb as any, 10);
                assert.strictEqual(docs.length, 1);
                assert.strictEqual(docs[0].x, 1);
                assert.strictEqual(docs[0]._id, _id);
            });
            it('should max return batchSize', async () => {
                const name = randomCouchString(10);
                const pouchdb = new PouchDB(
                    name, {
                    adapter: 'memory'
                }
                );

                let t = 42;
                while (t > 0) {
                    await pouchdb.put({
                        _id: randomCouchString(10),
                        x: 1
                    });
                    t--;
                }
                const batchSize = 13;
                const docs: any[] = await getBatch(pouchdb as any, batchSize);
                assert.strictEqual(docs.length, batchSize);
                docs.forEach(doc => {
                    assert.strictEqual(doc.x, 1);
                });
            });
        });
    });
    describe('BUGS: pouchdb', () => {
        it('_local documents should not be cached by pouchdb', async () => {
            const name = randomCouchString(10);
            const _id = '_local/foobar';
            function createPouch(): PouchDBInstance {
                const pouch = new PouchDB(
                    name, {
                    adapter: 'memory',
                    auto_compaction: true,
                    revs_limit: 1
                }
                ) as any;
                return pouch;
            }
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
            assert.strictEqual(doc2.value, 'foo');

            pouch1.destroy();
            pouch2.destroy();
        });
        /**
         * @link https://github.com/pouchdb/pouchdb/issues/6733
         */
        it('pouchdb.find() should not return design-docs', async () => {
            const pouch = new PouchDB(
                randomCouchString(10), {
                adapter: 'memory',
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

            assert.strictEqual(docs.docs.length, 1);

            pouch.destroy();
        });
        it('removing via bulkDocs does not work', async () => {
            const pouch: PouchDBInstance = new PouchDB(
                randomCouchString(10), {
                adapter: 'memory',
                auto_compaction: true,
                revs_limit: 1
            }
            ) as any;

            // add one doc
            await pouch.put({
                _id: 'foobar',
                foo: 'bar'
            });

            // overwrite via bulkDocs
            const bulkOptions = {
                new_edits: false
            };
            await pouch.bulkDocs({
                docs: [{
                    _id: 'foobar',
                    foo: 'bar',
                    _rev: '2-6c5d4399ffe848f395069eab42630eee'
                }]
            }, bulkOptions);

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
            }, bulkOptions);
            assert.strictEqual((x as any).length, 0);

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
            const pouch: PouchDBInstance = new PouchDB(
                randomCouchString(10), {
                adapter: 'memory',
                auto_compaction: true,
                revs_limit: 1
            }
            ) as any;
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
            const docs = [{
                '|c': '0waqyh2xjwtu',
                '|a': 'foo123',
                '|b': 'King',
                age: 1,
                _id: 'myid',
                _rev: '1-62080c42d471e3d2625e49dcca3b8e3e'
            }];
            await pouch.bulkDocs({
                docs
            }, bulkOptions);

            let foundAfter = await pouch.find({
                selector: {}
            });
            assert.strictEqual(foundAfter.docs.length, 1);


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
            assert.strictEqual(foundAfter.docs.length, 0);


            pouch.destroy();
        });
        it('put->delete-put will find the previous document', async () => {
            const pouch: PouchDBInstance = new PouchDB(
                randomCouchString(10), {
                adapter: 'memory'
            }
            ) as any;
            const BULK_DOC_OPTIONS = {
                new_edits: false
            };

            const docData: any = schemaObjects.human();
            docData['_id'] = 'foobar1';
            const ret = await pouch.put(docData);

            await AsyncTestUtil.wait(100);

            const docData2: any = clone(docData);
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
                    assert.strictEqual(foundAfter2.docs.length, 0);
                },
                'AssertionError'
            );

            // process.exit();
            pouch.destroy();
        });
        it('should handle writes before reads (first insert then find)', async () => {
            const amount = 20;
            const pouches: PouchDBInstance[] = [];
            const results: any[] = [];

            let t = 0;
            while (t < amount) {
                t++;
                const pouch: PouchDBInstance = new PouchDB(
                    randomCouchString(10), {
                    adapter: 'memory'
                }) as any;
                pouches.push(pouch);

                // do not await
                pouch.put({
                    _id: 'foobar',
                    passportId: 'z3i7q29g4yr1',
                    firstName: 'Edison',
                    lastName: 'Keebler',
                    age: 24
                });
                const res = await pouch.find({
                    selector: {}
                });
                results.push(res);
            }

            results.forEach(res => {
                assert.strictEqual(res.docs.length, 1);
            });

            pouches.forEach(pouch => pouch.destroy());
        });
        it('should handle writes before reads (first find then insert)', async () => {
            const amount = 20;
            const promises: Promise<any>[] = [];
            const pouches: PouchDBInstance[] = [];

            while (promises.length < amount) {
                const pouch: PouchDBInstance = new PouchDB(
                    randomCouchString(10), {
                    adapter: 'memory'
                }) as any;
                pouches.push(pouch);

                promises.push(pouch.find({
                    selector: {}
                }));
                await pouch.put({
                    _id: 'foobar',
                    passportId: 'z3i7q29g4yr1',
                    firstName: 'Edison',
                    lastName: 'Keebler',
                    age: 24
                });
            }

            const results = await Promise.all(promises);

            results.forEach(res => {
                assert.strictEqual(res.docs.length, 1);
            });
            pouches.forEach(pouch => pouch.destroy());
        });
    });
});
