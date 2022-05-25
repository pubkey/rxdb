import assert from 'assert';
import memdown from 'memdown';
import AsyncTestUtil from 'async-test-util';
import config from './config';

let leveldb: any;
if (config.platform.isNode())
    leveldb = require('pouchdb-adapter-leveldb');

import {
    createRxDatabase,
    randomCouchString,
    promiseWait,
    clone,
    isRxDatabase,
    blobBufferUtil,
} from '../../';

import {
    PouchDB,
    PouchDBInstance,
    addPouchPlugin,
    getRxStoragePouch
} from '../../plugins/pouchdb';
import PouchDBFind from 'pouchdb-find';
import PouchReplicationPlugin from 'pouchdb-replication';

import * as schemaObjects from './../helper/schema-objects';

config.parallel('pouch-db-integration.test.js', () => {
    if (config.storage.name !== 'pouchdb') {
        return;
    }


    describe('init', () => {
        it('should export the pouchDB-module', () => {
            addPouchPlugin(PouchReplicationPlugin);
            assert.strictEqual(typeof PouchDB, 'function');
        });
    });
    describe('assumptions', () => {
        it('must be able to insert->update->delete via replication', async () => {
            addPouchPlugin(require('pouchdb-adapter-memory'));
            addPouchPlugin(PouchDBFind);

            const pouch1: PouchDBInstance = new PouchDB('foobar1' + randomCouchString(10), {
                adapter: 'memory'
            });
            const pouch2: PouchDBInstance = new PouchDB('foobar2' + randomCouchString(10), {
                adapter: 'memory'
            });
            const syncHandler = pouch1.sync(pouch2, {
                live: true
            });

            const docData: any = {
                _id: 'syncMe',
                value: 1
            };
            async function getDocsFromPouch2() {
                const allDocs = await pouch2.find({
                    selector: {}
                });
                return allDocs.docs;
            }

            // insert
            const insertResult = await pouch1.put(clone(docData));
            docData._rev = insertResult.rev;

            await AsyncTestUtil.waitUntil(async () => {
                const allDocs = await getDocsFromPouch2();
                return allDocs.length === 1;
            });

            // update
            docData.value = 2;
            const updateResult = await pouch1.put(clone(docData));
            docData._rev = updateResult.rev;

            await AsyncTestUtil.waitUntil(async () => {
                const allDocs = await getDocsFromPouch2();
                return allDocs.length === 1 && (allDocs[0] as any).value === 2;
            });

            // delete
            docData._deleted = true;
            const deleteResult = await pouch1.put(clone(docData));
            assert.ok(deleteResult);
            await AsyncTestUtil.waitUntil(async () => {
                const allDocs = await getDocsFromPouch2();
                return allDocs.length === 0;
            });

            // undelete via insert
            const undeleteResult = await pouch1.put({
                _id: 'syncMe',
                value: 5
            });
            assert.ok(undeleteResult);
            await AsyncTestUtil.waitUntil(async () => {
                const allDocs = await getDocsFromPouch2();
                return allDocs.length === 1 && (allDocs[0] as any).value === 5;
            });

            await syncHandler.cancel();
            await promiseWait(100);
            await pouch1.close();
            await pouch2.close();
        });
        it('must be able to insert->update->delete via new_edits:false', async () => {
            const pouch: PouchDBInstance = new PouchDB('foobar' + randomCouchString(10), {
                adapter: 'memory'
            });
            const docId = 'foobar';

            // insert
            await pouch.bulkDocs({
                docs: [{
                    _id: docId,
                    value: 1,
                    _rev: '1-51b2fae5721cc4d3cf7392f19e6cc118'
                }]
            }, {
                new_edits: false
            });

            // update
            let getDocs = await pouch.bulkGet({
                docs: [{ id: docId }],
                revs: true,
                latest: true
            });
            let useRevs = (getDocs as any).results[0].docs[0].ok._revisions;
            useRevs.start = useRevs.start + 1;
            useRevs.ids.unshift('a723631364fbfa906c5ffa8203ac9725');

            await pouch.bulkDocs({
                docs: [{
                    _id: docId,
                    value: 2,
                    _rev: '2-a723631364fbfa906c5ffa8203ac9725',
                    _revisions: useRevs
                }]
            }, {
                new_edits: false
            });

            // delete
            getDocs = await pouch.bulkGet({
                docs: [{ id: docId }],
                revs: true,
                latest: true
            });
            useRevs = (getDocs as any).results[0].docs[0].ok._revisions;
            useRevs.start = useRevs.start + 1;
            useRevs.ids.unshift('13af8c9a835820969a8a273b18783a70');

            await pouch.bulkDocs({
                docs: [{
                    _id: docId,
                    value: 2,
                    _deleted: true,
                    _rev: '3-13af8c9a835820969a8a273b18783a70',
                    _revisions: useRevs
                }]
            }, {
                new_edits: false
            });

            let allDocs = await pouch.find({
                selector: {}
            });
            assert.strictEqual(allDocs.docs.length, 0);

            // undelete via insert
            getDocs = await pouch.bulkGet({
                docs: [{ id: docId }],
                revs: true,
                latest: true
            });

            const getDocs2 = await pouch.bulkGet({
                docs: [{ id: docId, rev: '3-13af8c9a835820969a8a273b18783a70' }],
                revs: true,
                latest: true
            });

            useRevs = (getDocs2 as any).results[0].docs[0].ok._revisions;
            useRevs.start = 1;
            useRevs.ids.unshift('14af8c9a835820969a8a273b18783a70');
            await pouch.bulkDocs({
                docs: [{
                    _id: docId,
                    value: 5,
                    _deleted: false,
                    _rev: '1-14af8c9a835820969a8a273b18783a70',
                    _revisions: useRevs
                }]
            }, {
                new_edits: false
            });


            // must be found via query
            allDocs = await pouch.find({
                selector: {
                    _id: docId
                },
                limit: 1
            });
            assert.strictEqual(allDocs.docs.length, 1);
            assert.strictEqual((allDocs.docs[0] as any).value, 5);

            // same via .get
            const getDoc = await pouch.get(docId);
            assert.strictEqual(getDoc.value, 5);

            pouch.close();
        });
    });
    describe('memdown', () => {
        it('should not allow leveldown-adapters without the plugin', async () => {
            await AsyncTestUtil.assertThrows(
                () => createRxDatabase({
                    name: randomCouchString(10),
                    storage: getRxStoragePouch(memdown)
                }),
                'RxError',
                'leveldb-plugin'
            );
        });
        it('should work after adding the leveldb-plugin', async () => {
            if (!config.platform.isNode()) {
                return;
            }
            PouchDB.plugin(leveldb);
            const db = await createRxDatabase({
                name: randomCouchString(10),
                storage: getRxStoragePouch(memdown)
            });
            assert.ok(isRxDatabase(db));
            db.destroy();
        });
    });
    describe('pouchdb-adapter-memory', () => {
        it('should work when adapter was added', async () => {
            addPouchPlugin(require('pouchdb-adapter-memory'));
            const db = await createRxDatabase({
                name: randomCouchString(10),
                storage: getRxStoragePouch('memory')
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
                    storage: getRxStoragePouch('localstorage')
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
                        storage: getRxStoragePouch('websql')
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

                addPouchPlugin(require('pouchdb-adapter-websql'));
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: getRxStoragePouch('websql')
                });
                assert.ok(isRxDatabase(db));
                await promiseWait(10);
                db.destroy();
            });
        });
    });
    describe('BUGS: pouchdb', () => {
        it('Race condition initially discovered with PouchDB in-memory-adapter 7.3.0', async () => {
            const func1 = async() => {
                const pouch1: PouchDBInstance = new PouchDB('func1db', {
                    adapter: 'memory'
                });
                const docId = 'func1doc1';

                // insert
                await pouch1.bulkDocs({
                    docs: [{
                        _id: docId,
                        value: 1,
                        _rev: '1-51b2fae5721cc4d3cf7392f19e6cc118'
                    }]
                }, {
                    new_edits: false
                });

                // update
                let getDocs = await pouch1.bulkGet({
                    docs: [{id: docId}],
                    revs: true,
                    latest: true
                });
                const useRevs = (getDocs as any).results[0].docs[0].ok._revisions;
                useRevs.start = useRevs.start + 1;
                useRevs.ids.unshift('a723631364fbfa906c5ffa8203ac9725');

                await pouch1.bulkDocs({
                    docs: [{
                        _id: docId,
                        value: 2,
                        _rev: '2-a723631364fbfa906c5ffa8203ac9725',
                        _revisions: useRevs
                    }]
                }, {
                    new_edits: false
                });

                // delete
                getDocs = await pouch1.bulkGet({
                    docs: [{id: docId}],
                    revs: true,
                    latest: true
                });

                // same via .get
                const getDoc = await pouch1.get(docId);
                assert.strictEqual(getDoc.value, 2);
                // if this is switched to pouch1.destroy(); ... this test will pass.
                pouch1.close();
            }

            const func2 = async () => {
                const pouch2 = new PouchDB(
                    'func2db', {
                        adapter: 'memory',
                    });

                await pouch2.createIndex({
                    index: {
                        fields: ['foo']
                    }
                });
                pouch2.destroy();
            }

            // func1 succeeds when run alone.
            // func2 succeeds when run alone.
            // As of PouchDB 7.3.0, when running these functions in parallel, there is a race condition where func2 gets
            // impacted by func1. The result: func2 will hang and the test will timeout.
            await Promise.all([func1(), func2()]);
        });
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
                        $ne: null
                    }
                }
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

            let foundAfter = await pouch.find<{ firstName: string, _deleted: boolean }>({
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
                randomCouchString(10),
                {
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
        it('re-saving an attachment fails in browsers', async () => {
            const pouch1: PouchDBInstance = new PouchDB(
                randomCouchString(10),
                {
                    adapter: 'memory'
                }
            );

            const text = 'lorem ipsum dolor';
            const mimeType = 'text/plain';
            const blobBuffer = blobBufferUtil.createBlobBuffer(text, {
                type: mimeType
            } as any);

            // insert a document with attachment
            const docId = 'foobar';
            const attachmentId = 'myattachment';
            const putRes = await pouch1.put({ _id: docId });
            await pouch1.putAttachment(
                docId,
                attachmentId,
                putRes.rev,
                blobBuffer,
                mimeType
            );


            const rawAttachmentData = await pouch1.getAttachment(docId, attachmentId);

            const pouch2: PouchDBInstance = new PouchDB(
                randomCouchString(10),
                {
                    adapter: 'memory'
                }
            );
            await pouch2.bulkDocs([
                {
                    _attachments: {
                        [attachmentId]: {
                            content_type: 'text/plain',
                            data: rawAttachmentData
                        }
                    },
                    _rev: '2-7a51240884063593468f396a29db001f',
                    _id: 'foobar2',
                }
            ], {
                new_edits: false
            });

            pouch1.destroy();
            pouch2.destroy();
        });
    });
});
