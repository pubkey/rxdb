import assert from 'assert';
import config from './config';
import PouchDB from '../../dist/lib/pouch-db';
import * as schemas from '../helper/schemas';
import * as humansCollection from '../helper/humans-collection';

import * as RxDatabase from '../../dist/lib/rx-database';
import * as RxCollection from '../../dist/lib/rx-collection';
import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';

import * as DataMigrator from '../../dist/lib/data-migrator';

config.parallel('data-migration.test.js', () => {
    describe('.create() with migrationStrategies', () => {
        describe('positive', () => {
            it('ok to create with strategies', async () => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                await RxCollection.create({
                    database: db,
                    name: 'foobar',
                    schema: schemas.simpleHumanV3,
                    autoMigrate: false,
                    migrationStrategies: {
                        1: () => {},
                        2: () => {},
                        3: () => {}
                    }
                });
                db.destroy();
            });
            it('create same collection with different schema-versions', async () => {
                const colName = 'human';
                const name = util.randomCouchString(10);
                const db = await RxDatabase.create({
                    name,
                    adapter: 'memory',
                    ignoreDuplicate: true
                });
                await db.collection({
                    name: colName,
                    schema: schemas.human,
                    autoMigrate: false
                });

                const db2 = await RxDatabase.create({
                    name,
                    adapter: 'memory',
                    ignoreDuplicate: true
                });
                await db2.collection({
                    name: colName,
                    schema: schemas.simpleHumanV3,
                    autoMigrate: false,
                    migrationStrategies: {
                        1: () => {},
                        2: () => {},
                        3: () => {}
                    }
                });
                db.destroy();
                db2.destroy();
            });
        });
        describe('negative', () => {
            it('should throw when array', async () => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                await AsyncTestUtil.assertThrows(
                    () => RxCollection.create({
                        database: db,
                        name: 'foobar',
                        schema: schemas.human,
                        autoMigrate: false,
                        migrationStrategies: []
                    }),
                    'RxTypeError'
                );
                db.destroy();
            });
            it('should throw when property no number', async () => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                await AsyncTestUtil.assertThrows(
                    () => RxCollection.create({
                        database: db,
                        name: 'foobar',
                        schema: schemas.human,
                        autoMigrate: false,
                        migrationStrategies: {
                            foo: function() {}
                        }
                    }),
                    'RxError'
                );
                db.destroy();
            });
            it('should throw when property no non-float-number', async () => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                await AsyncTestUtil.assertThrows(
                    () => RxCollection.create({
                        database: db,
                        name: 'foobar',
                        schema: schemas.human,
                        autoMigrate: false,
                        migrationStrategies: {
                            '1.1': function() {}
                        }
                    }),
                    'RxError'
                );
                db.destroy();
            });
            it('should throw when property-value no function', async () => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                await AsyncTestUtil.assertThrows(
                    () => RxCollection.create({
                        database: db,
                        name: 'foobar',
                        schema: schemas.human,
                        autoMigrate: false,
                        migrationStrategies: {
                            1: 'foobar'
                        }
                    }),
                    'RxError'
                );
                db.destroy();
            });
            it('throw when strategy missing', async () => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                await AsyncTestUtil.assertThrows(
                    () => RxCollection.create({
                        database: db,
                        name: 'foobar',
                        schema: schemas.simpleHumanV3,
                        autoMigrate: false,
                        migrationStrategies: {
                            1: () => {},
                            3: () => {}
                        }
                    }),
                    'RxError'
                );
                db.destroy();
            });
        });
    });
    describe('DataMigrator.js', () => {
        describe('_getOldCollections()', () => {
            it('should NOT get an older version', async () => {
                const colName = 'human';
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const col = await db.collection({
                    name: colName,
                    schema: schemas.simpleHumanV3,
                    autoMigrate: false,
                    migrationStrategies: {
                        1: () => {},
                        2: () => {},
                        3: () => {}
                    }
                });
                const old = await DataMigrator._getOldCollections(col._dataMigrator);
                assert.deepEqual(old, []);
                db.destroy();
            });
            it('should get an older version', async () => {
                const name = util.randomCouchString(10);
                const colName = 'human';
                const db = await RxDatabase.create({
                    name,
                    adapter: 'memory',
                    ignoreDuplicate: true
                });
                await db.collection({
                    name: colName,
                    schema: schemas.simpleHuman,
                    autoMigrate: false
                });

                const db2 = await RxDatabase.create({
                    name,
                    adapter: 'memory',
                    ignoreDuplicate: true
                });
                const col2 = await db2.collection({
                    name: colName,
                    schema: schemas.simpleHumanV3,
                    autoMigrate: false,
                    migrationStrategies: {
                        1: () => {},
                        2: () => {},
                        3: () => {}
                    }
                });
                const old = await DataMigrator._getOldCollections(col2._dataMigrator);
                assert.ok(Array.isArray(old));
                assert.equal(old.length, 1);
                assert.equal(old[0].constructor.name, 'OldCollection');
                db.destroy();
                db2.destroy();
            });
        });
        describe('OldCollection', () => {
            describe('create', () => {
                it('create', async () => {
                    const col = await humansCollection.createMigrationCollection();

                    const old = await DataMigrator._getOldCollections(col._dataMigrator);
                    const oldCol = old.pop();

                    assert.equal(oldCol.schema.constructor.name, 'RxSchema');
                    assert.equal(oldCol.version, 0);
                    assert.equal(oldCol.crypter.constructor.name, 'Crypter');
                    assert.equal(oldCol.keyCompressor.constructor.name, 'KeyCompressor');
                    assert.ok(oldCol.pouchdb.constructor.name.includes('PouchDB'));
                    col.database.destroy();
                });
            });
            describe('.migrateDocumentData()', () => {
                it('get a valid migrated document', async () => {
                    const col = await humansCollection.createMigrationCollection(1, {
                        3: doc => {
                            doc.age = parseInt(doc.age);
                            return doc;
                        }
                    });

                    const old = await DataMigrator._getOldCollections(col._dataMigrator);
                    const oldCol = old.pop();

                    const oldDocs = await oldCol.getBatch(10);
                    const newDoc = await oldCol.migrateDocumentData(oldDocs[0]);
                    assert.deepEqual(newDoc.age, parseInt(oldDocs[0].age));
                    col.database.destroy();
                });
                it('get a valid migrated document from async strategy', async () => {
                    const col = await humansCollection.createMigrationCollection(1, {
                        3: async (doc) => {
                            await util.promiseWait(10);
                            doc.age = parseInt(doc.age);
                            return doc;
                        }
                    });

                    const old = await DataMigrator._getOldCollections(col._dataMigrator);
                    const oldCol = old.pop();

                    const oldDocs = await oldCol.getBatch(10);
                    const newDoc = await oldCol.migrateDocumentData(oldDocs[0]);
                    assert.deepEqual(newDoc.age, parseInt(oldDocs[0].age));
                    col.database.destroy();
                });
            });
            describe('.delete()', () => {
                it('should delete the pouchdb with all its content', async () => {
                    const dbName = util.randomCouchString(10);
                    const col = await humansCollection.createMigrationCollection(10, {}, dbName);
                    const olds = await DataMigrator._getOldCollections(col._dataMigrator);
                    const old = olds.pop();

                    const amount = await old.countAllUndeleted();
                    assert.equal(amount, 10);

                    const pouchLocation = old.pouchdb.name;
                    const checkPouch = new PouchDB(pouchLocation, {
                        adapter: 'memory'
                    });
                    const amountPlain = await PouchDB.countAllUndeleted(checkPouch);
                    assert.equal(amountPlain, 10);

                    // check that internal doc exists
                    let docId = RxDatabase._collectionNamePrimary(col.name, old.schema);
                    let iDoc = await old.database._collectionsPouch.get(docId);
                    assert.equal(typeof iDoc.schemaHash, 'string');


                    await old.delete();

                    // check that all docs deleted
                    const checkPouch2 = new PouchDB(pouchLocation, {
                        adapter: 'memory'
                    });
                    const amountPlain2 = await PouchDB.countAllUndeleted(checkPouch2);
                    assert.equal(amountPlain2, 0);

                    // check that internal doc deleted
                    let has = true;
                    docId = RxDatabase._collectionNamePrimary(col.name, old.schema);
                    try {
                        iDoc = await old.database._collectionsPouch.get(docId);
                    } catch (e) {
                        has = false;
                    }
                    assert.equal(has, false);
                    col.database.destroy();
                });
            });
            describe('._migrateDocument()', () => {
                /**
                 * this test is to handle the following case:
                 * 1. user starts migration
                 * 2. user quits process while migration is running
                 * 3. user starts migration again
                 * 4. it will throw since a document is inserted in to new collection, but not deleted from old
                 * 5. it should not do this
                 */
                it('should not crash when doc already at new collection', async () => {
                    const col = await humansCollection.createMigrationCollection(10, {
                        3: doc => {
                            doc.age = parseInt(doc.age);
                            return doc;
                        }
                    });
                    const olds = await DataMigrator._getOldCollections(col._dataMigrator);
                    const oldCol = olds.pop();

                    // simluate prerun of migrate()
                    const oldDocs = await oldCol.getBatch(10);
                    const tryDoc = oldDocs.shift();
                    const action = await oldCol._migrateDocument(tryDoc);
                    assert.equal(action.type, 'success');

                    // this should no crash because existing doc will be overwritten
                    await oldCol._migrateDocument(tryDoc);
                    col.database.destroy();
                });
            });
            describe('.migrate()', () => {
                it('should resolve finished when no docs', async () => {
                    const col = await humansCollection.createMigrationCollection(0);
                    const olds = await DataMigrator._getOldCollections(col._dataMigrator);
                    const oldCol = olds.pop();

                    await oldCol.migratePromise();
                    col.database.destroy();
                });
                it('should resolve finished when some docs', async () => {
                    const col = await humansCollection.createMigrationCollection(10, {
                        3: doc => {
                            doc.age = parseInt(doc.age);
                            return doc;
                        }
                    });
                    const olds = await DataMigrator._getOldCollections(col._dataMigrator);
                    const oldCol = olds.pop();

                    const docsPrev = await col.pouch.allDocs({
                        include_docs: false,
                        attachments: false
                    });
                    const preFiltered = docsPrev.rows.filter(doc => !doc.id.startsWith('_design'));
                    assert.equal(preFiltered.length, 0);

                    await oldCol.migratePromise();

                    // check if in new collection
                    const docs = await col.find().exec();
                    assert.equal(docs.length, 10);
                    col.database.destroy();
                });
                it('should emit status for every handled document', async () => {
                    const col = await humansCollection.createMigrationCollection(10, {
                        3: async (doc) => {
                            await util.promiseWait(10);
                            doc.age = parseInt(doc.age);
                            return doc;
                        }
                    });
                    const olds = await DataMigrator._getOldCollections(col._dataMigrator);
                    const oldCol = olds.pop();

                    const pw8 = AsyncTestUtil.waitResolveable(1000);

                    // batchSize is doc.length / 2 to make sure it takes a bit
                    const state$ = oldCol.migrate(5);
                    const states = [];
                    state$.subscribe(state => {
                        assert.equal(state.type, 'success');
                        assert.ok(state.doc._id);
                        states.push(state);
                    }, () => {
                        throw new Error('this test should not call error');
                    }, pw8.resolve);

                    await pw8.promise;
                    assert.equal(states.length, 10);
                    col.database.destroy();
                });

                it('should emit "deleted" when migration-strategy returns null', async () => {
                    const col = await humansCollection.createMigrationCollection(10, {
                        3: async () => {
                            return null;
                        }
                    });
                    const olds = await DataMigrator._getOldCollections(col._dataMigrator);
                    const oldCol = olds.pop();

                    const pw8 = AsyncTestUtil.waitResolveable(1000);

                    // batchSize is doc.length / 2 to make sure it takes a bit
                    const state$ = oldCol.migrate(5);
                    const states = [];
                    state$.subscribe(state => {
                        assert.equal(state.type, 'deleted');
                        states.push(state);
                    }, () => {}, pw8.resolve);

                    await pw8.promise;
                    assert.equal(states.length, 10);
                    col.database.destroy();
                });
                it('should throw when document cannot be migrated', async () => {
                    const col = await humansCollection.createMigrationCollection(10, {
                        3: async () => {
                            throw new Error('foobar');
                        }
                    });
                    const olds = await DataMigrator._getOldCollections(col._dataMigrator);
                    const oldCol = olds.pop();
                    await AsyncTestUtil.assertThrows(
                        () => oldCol.migratePromise(),
                        Error
                    );
                    col.database.destroy();
                });
            });
        });

        describe('.migrate()', () => {
            describe('positive', () => {
                it('should not crash when nothing to migrate', async () => {
                    const col = await humansCollection.createMigrationCollection(0, {});
                    const pw8 = AsyncTestUtil.waitResolveable(5000); // higher than test-timeout
                    const states = [];
                    const state$ = col.migrate();
                    state$.subscribe(s => {
                        states.push(s);
                    }, null, pw8.resolve);

                    await pw8.promise;
                    assert.equal(states[0].done, false);
                    assert.equal(states[0].percent, 0);
                    assert.equal(states[0].total, 0);

                    assert.equal(states[1].done, true);
                    assert.equal(states[1].percent, 100);
                    assert.equal(states[1].total, 0);
                    col.database.destroy();
                });

                it('should not crash when migrating data', async () => {
                    const col = await humansCollection.createMigrationCollection(5, {
                        3: doc => {
                            doc.age = parseInt(doc.age);
                            return doc;
                        }
                    });
                    const pw8 = AsyncTestUtil.waitResolveable(5000); // higher than test-timeout
                    const states = [];
                    const state$ = col.migrate();
                    state$.subscribe(s => {
                        states.push(s);
                    }, null, pw8.resolve);

                    await pw8.promise;

                    assert.equal(states.length, 7);

                    assert.equal(states[0].done, false);
                    assert.equal(states[0].percent, 0);
                    assert.equal(states[0].total, 5);

                    const midState = states[4];
                    assert.equal(midState.done, false);
                    assert.equal(midState.percent, 80);
                    assert.equal(midState.handled, 4);
                    assert.equal(midState.success, 4);

                    const lastState = states.pop();
                    assert.equal(lastState.done, true);
                    assert.equal(lastState.percent, 100);
                    assert.equal(lastState.total, 5);
                    assert.equal(lastState.success, 5);
                    col.database.destroy();
                });
            });
            describe('negative', () => {
                it('should .error when strategy fails', async () => {
                    const col = await humansCollection.createMigrationCollection(5, {
                        3: () => {
                            throw new Error('foobar');
                        }
                    });
                    const pw8 = AsyncTestUtil.waitResolveable(5000); // higher than test-timeout
                    const state$ = col.migrate();
                    state$.subscribe(null, pw8.resolve, null);

                    await pw8.promise;
                    col.database.destroy();
                });
            });
        });
        describe('.migratePromise()', () => {
            describe('positive', () => {
                it('should resolve when nothing to migrate', async () => {
                    const col = await humansCollection.createMigrationCollection(0, {});
                    await col.migratePromise();
                    col.database.destroy();
                });

                it('should resolve when migrating data', async () => {
                    const col = await humansCollection.createMigrationCollection(5, {
                        3: doc => {
                            doc.age = parseInt(doc.age);
                            return doc;
                        }
                    });
                    await col.migratePromise();
                    col.database.destroy();
                });
            });
            describe('negative', () => {
                it('should reject when migration fails', async () => {
                    const col = await humansCollection.createMigrationCollection(5, {
                        3: () => {
                            throw new Error('foobar');
                        }
                    });
                    let failed = false;
                    await col.migratePromise().catch(() => failed = true);
                    assert.ok(failed);
                    col.database.destroy();
                });
            });
        });
    });
    describe('integration into collection', () => {
        describe('run', () => {
            it('should auto-run on creation', async () => {
                const col = await humansCollection.createMigrationCollection(
                    10, {
                        3: doc => {
                            doc.age = parseInt(doc.age);
                            return doc;
                        }
                    },
                    util.randomCouchString(10),
                    true
                );
                const docs = await col.find().exec();
                assert.equal(docs.length, 10);
                assert.equal(typeof docs.pop().age, 'number');
                col.database.destroy();
            });
            it('should auto-run on creation (async)', async () => {
                const col = await humansCollection.createMigrationCollection(
                    10, {
                        3: async (doc) => {
                            util.promiseWait(10);
                            doc.age = parseInt(doc.age);
                            return doc;
                        }
                    },
                    util.randomCouchString(10),
                    true
                );
                const docs = await col.find().exec();
                assert.equal(docs.length, 10);
                assert.equal(typeof docs.pop().age, 'number');
                col.database.destroy();
            });
        });

        describe('.migrationNeeded()', () => {
            it('return true if schema-version is 0', async () => {
                const col = await humansCollection.create();
                const needed = await col.migrationNeeded();
                assert.equal(needed, false);
                col.database.destroy();
            });
            it('return false if nothing to migrate', async () => {
                const col = await humansCollection.createMigrationCollection(5, {
                    3: doc => {
                        doc.age = parseInt(doc.age);
                        return doc;
                    }
                });
                await col.migratePromise();
                const needed = await col.migrationNeeded();
                assert.equal(needed, false);
                col.database.destroy();
            });
            it('return true if something to migrate', async () => {
                const col = await humansCollection.createMigrationCollection(5, {
                    3: doc => {
                        doc.age = parseInt(doc.age);
                        return doc;
                    }
                });
                const needed = await col.migrationNeeded();
                assert.equal(needed, true);
                col.database.destroy();
            });
        });
    });
    describe('issues', () => {
        describe('#212 migration runs into infinity-loop', () => {
            it('reproduce and fix', async () => {
                const dbName = util.randomCouchString(10);
                const schema0 = {
                    title: 'hero schema',
                    description: 'describes a simple hero',
                    version: 0,
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            primary: true
                        },
                        color: {
                            type: 'string'
                        }
                    },
                    required: ['color']
                };
                const schema1 = {
                    title: 'hero schema',
                    description: 'describes a simple hero',
                    version: 1,
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            primary: true
                        },
                        color: {
                            type: 'string'
                        },
                        level: {
                            type: 'string'
                        }
                    },
                    required: ['color']
                };
                const db = await RxDatabase.create({
                    name: dbName,
                    adapter: 'memory'
                });
                const col = await db.collection({
                    name: 'heroes',
                    schema: schema0
                });
                await col.insert({
                    name: 'Niven',
                    color: 'black'
                });
                await db.destroy();

                const db2 = await RxDatabase.create({
                    name: dbName,
                    adapter: 'memory'
                });
                const col2 = await db2.collection({
                    name: 'heroes',
                    schema: schema1,
                    migrationStrategies: {
                        1: (oldDoc) => {
                            // console.log('migrate from 0 to 1...' + oldDoc.name);
                            oldDoc.level = 'ss';
                            return oldDoc;
                        }
                    }
                });

                const docs = await col2.find().exec();
                assert.equal(docs.length, 1);
                assert.equal(docs[0].level, 'ss');
                assert.equal(docs[0].name, 'Niven');
                assert.equal(docs[0].color, 'black');
                db2.destroy();
            });
        });
    });
});
