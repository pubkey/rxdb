import assert from 'assert';
import {
    default as memdown
} from 'memdown';
import * as _ from 'lodash';


import {
    default as PouchDB
} from '../../dist/lib/PouchDB';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as RxDatabase from '../../dist/lib/RxDatabase';
import * as RxCollection from '../../dist/lib/RxCollection';
import * as RxSchema from '../../dist/lib/RxSchema';
import * as Crypter from '../../dist/lib/Crypter';
import * as util from '../../dist/lib/util';

process.on('unhandledRejection', function(err) {
    throw err;
});

describe('SchemaMigration.test.js', () => {
    describe('.create() with migrationStrategies', () => {
        describe('positive', () => {
            it('ok to create with strategies', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: memdown
                });
                const schema = RxSchema.create(schemas.simpleHumanV3);
                await RxCollection.create({
                    database: db,
                    name: 'foobar',
                    schema,
                    autoMigrate: false,
                    migrationStrategies: {
                        1: () => {},
                        2: () => {},
                        3: () => {}
                    }
                });
            });
            it('create same collection with different schema-versions', async() => {
                const colName = 'human';
                const name = util.randomCouchString(10);
                const db = await RxDatabase.create({
                    name,
                    adapter: memdown
                });
                const schema = RxSchema.create(schemas.human);
                const col = await db.collection({
                    name: colName,
                    schema,
                    autoMigrate: false
                });

                const db2 = await RxDatabase.create({
                    name,
                    adapter: memdown
                });
                const schema2 = RxSchema.create(schemas.simpleHumanV3);
                const col2 = await db2.collection({
                    name: colName,
                    schema: schema2,
                    autoMigrate: false,
                    migrationStrategies: {
                        1: () => {},
                        2: () => {},
                        3: () => {}
                    }
                });
            });
        });
        describe('negative', () => {
            it('should throw when array', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: memdown
                });
                const schema = RxSchema.create(schemas.human);
                await util.assertThrowsAsync(
                    () => RxCollection.create({
                        database: db,
                        name: 'foobar',
                        schema,
                        autoMigrate: false,
                        migrationStrategies: []
                    }),
                    TypeError
                );
            });
            it('should throw when property no number', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: memdown
                });
                const schema = RxSchema.create(schemas.human);
                await util.assertThrowsAsync(
                    () => RxCollection.create({
                        database: db,
                        name: 'foobar',
                        schema,
                        autoMigrate: false,
                        migrationStrategies: {
                            foo: function() {}
                        }
                    }),
                    Error
                );
            });
            it('should throw when property no non-float-number', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: memdown
                });
                const schema = RxSchema.create(schemas.human);
                await util.assertThrowsAsync(
                    () => RxCollection.create({
                        database: db,
                        name: 'foobar',
                        schema,
                        autoMigrate: false,
                        migrationStrategies: {
                            '1.1': function() {}
                        }
                    }),
                    Error
                );
            });
            it('should throw when property-value no function', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: memdown
                });
                const schema = RxSchema.create(schemas.human);
                await util.assertThrowsAsync(
                    () => RxCollection.create({
                        database: db,
                        name: 'foobar',
                        schema,
                        autoMigrate: false,
                        migrationStrategies: {
                            1: 'foobar'
                        }
                    }),
                    Error
                );
            });
            it('throw when strategy missing', async() => {
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: memdown
                });
                const schema = RxSchema.create(schemas.simpleHumanV3);
                await util.assertThrowsAsync(
                    () => RxCollection.create({
                        database: db,
                        name: 'foobar',
                        schema,
                        autoMigrate: false,
                        migrationStrategies: {
                            1: () => {},
                            3: () => {}
                        }
                    }),
                    Error
                );
            });
        });
    });

    describe('DataMigrator.js', () => {
        describe('._getOldCollections()', () => {
            it('should NOT get an older version', async() => {
                const colName = 'human';
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: memdown
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
                const old = await col._dataMigrator._getOldCollections();
                assert.deepEqual(old, []);
            });
            it('should get an older version', async() => {
                const name = util.randomCouchString(10);
                const colName = 'human';
                const db = await RxDatabase.create({
                    name,
                    adapter: memdown
                });
                const schema = RxSchema.create(schemas.simpleHuman);
                const col = await db.collection({
                    name: colName,
                    schema,
                    autoMigrate: false
                });

                const db2 = await RxDatabase.create({
                    name,
                    adapter: memdown
                });
                const schema2 = RxSchema.create(schemas.simpleHumanV3);
                const col2 = await db2.collection({
                    name: colName,
                    schema: schema2,
                    autoMigrate: false,
                    migrationStrategies: {
                        1: () => {},
                        2: () => {},
                        3: () => {}
                    }
                });
                const old = await col2._dataMigrator._getOldCollections();
                assert.ok(Array.isArray(old));
                assert.equal(old.length, 1);
                assert.equal(old[0].constructor.name, 'OldCollection');
            });
        });
        describe('OldCollection', () => {
            describe('create', () => {
                it('create', async() => {

                    const col = await humansCollection.createMigrationCollection();

                    const migrator = await col._dataMigrator;
                    const old = await col._dataMigrator._getOldCollections();
                    const oldCol = old.pop();

                    assert.equal(oldCol.schema.constructor.name, 'RxSchema');
                    assert.equal(oldCol.version, 0);
                    assert.equal(oldCol.crypter.constructor.name, 'Crypter');
                    assert.equal(oldCol.keyCompressor.constructor.name, 'KeyCompressor');
                    assert.ok(oldCol.pouchdb.constructor.name.includes('PouchDB'));
                });
            });
            describe('.migrateDocumentData()', () => {
                it('get a valid migrated document', async() => {
                    const col = await humansCollection.createMigrationCollection(1, {
                        3: doc => {
                            doc.age = parseInt(doc.age);
                            return doc;
                        }
                    });

                    const migrator = col._dataMigrator;
                    const old = await col._dataMigrator._getOldCollections();
                    const oldCol = old.pop();

                    const oldDocs = await oldCol.getBatch(10);
                    const newDoc = await oldCol.migrateDocumentData(oldDocs[0]);
                    assert.deepEqual(newDoc.age, parseInt(oldDocs[0].age));
                });
                it('get a valid migrated document from async strategy', async() => {
                    const col = await humansCollection.createMigrationCollection(1, {
                        3: async(doc) => {
                            await util.promiseWait(10);
                            doc.age = parseInt(doc.age);
                            return doc;
                        }
                    });

                    const migrator = col._dataMigrator;
                    const old = await col._dataMigrator._getOldCollections();
                    const oldCol = old.pop();

                    const oldDocs = await oldCol.getBatch(10);
                    const newDoc = await oldCol.migrateDocumentData(oldDocs[0]);
                    assert.deepEqual(newDoc.age, parseInt(oldDocs[0].age));
                });
            });
            describe('.delete()', () => {
                it('should delete the pouchdb with all its content', async() => {
                    const dbName = util.randomCouchString(10);
                    const col = await humansCollection.createMigrationCollection(10, {}, dbName);
                    const migrator = col._dataMigrator;
                    const olds = await col._dataMigrator._getOldCollections();
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
                    let docId = old.database._collectionNamePrimary(col.name, old.schema);
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
                    docId = old.database._collectionNamePrimary(col.name, old.schema);
                    try {
                        iDoc = await old.database._collectionsPouch.get(docId);
                    } catch (e) {
                        has = false;
                    }
                    assert.equal(has, false);
                });
            });
            describe('.migrate()', () => {
                it('should resolve finished when no docs', async() => {
                    const col = await humansCollection.createMigrationCollection(0);
                    const olds = await col._dataMigrator._getOldCollections();
                    const oldCol = olds.pop();

                    await oldCol.migratePromise();
                });
                it('should resolve finished when some docs', async() => {
                    const col = await humansCollection.createMigrationCollection(10, {
                        3: doc => {
                            doc.age = parseInt(doc.age);
                            return doc;
                        }
                    });
                    const olds = await col._dataMigrator._getOldCollections();
                    const oldCol = olds.pop();

                    const docsPrev = await col.pouch.allDocs({
                        include_docs: false,
                        attachments: false
                    });
                    assert.equal(docsPrev.total_rows, 0);

                    await oldCol.migratePromise();

                    // check if in new collection
                    const docs = await col.find().exec();
                    assert.equal(docs.length, 10);
                });
                it('should emit status for every handled document', async() => {
                    const col = await humansCollection.createMigrationCollection(10, {
                        3: async(doc) => {
                            await util.promiseWait(50);
                            doc.age = parseInt(doc.age);
                            return doc;
                        }
                    });
                    const olds = await col._dataMigrator._getOldCollections();
                    const oldCol = olds.pop();

                    const pw8 = util.promiseWaitResolveable(1000);

                    // batchSize is doc.length / 2 to make sure it takes a bit
                    const state$ = oldCol.migrate(5);
                    const states = [];
                    state$.subscribe(state => {
                        assert.equal(state.type, 'success');
                        assert.ok(state.doc.id);
                        states.push(state);
                    }, () => {}, pw8.resolve);

                    await pw8.promise;
                    assert.equal(states.length, 10);
                });

                it('should emit "deleted" when migration-strategy returns null', async() => {
                    const col = await humansCollection.createMigrationCollection(10, {
                        3: async(doc) => {
                            return null;
                        }
                    });
                    const olds = await col._dataMigrator._getOldCollections();
                    const oldCol = olds.pop();

                    const pw8 = util.promiseWaitResolveable(1000);

                    // batchSize is doc.length / 2 to make sure it takes a bit
                    const state$ = oldCol.migrate(5);
                    const states = [];
                    state$.subscribe(state => {
                        assert.equal(state.type, 'deleted');
                        states.push(state);
                    }, () => {}, pw8.resolve);

                    await pw8.promise;
                    assert.equal(states.length, 10);
                });
                it('should throw when document cannot be migrated', async() => {
                    const col = await humansCollection.createMigrationCollection(10, {
                        3: async(doc) => {
                            throw new Error('foobar');
                        }
                    });
                    const olds = await col._dataMigrator._getOldCollections();
                    const oldCol = olds.pop();
                    await util.assertThrowsAsync(
                        () => oldCol.migratePromise(),
                        Error
                    );
                });




                it('w8', async() => {
                    // TODO remove this
                    await util.promiseWait(500);
                    process.exit();
                });
            });
        });
    });
});
