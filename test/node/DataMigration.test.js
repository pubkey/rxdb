import assert from 'assert';
import {
    default as memdown
} from 'memdown';
import * as _ from 'lodash';


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
            it('create', async() => {

                const cols = await humansCollection.create2MigrationCollections();

                const migrator = await cols.new._dataMigrator;
                const old = await cols.new._dataMigrator._getOldCollections();
                const oldCol = old.pop();

                assert.equal(oldCol.schema.constructor.name, 'RxSchema');
                assert.equal(oldCol.version, 0);
                assert.equal(oldCol.crypter.constructor.name, 'Crypter');
                assert.equal(oldCol.keyCompressor.constructor.name, 'KeyCompressor');
                assert.ok(oldCol.pouchdb.constructor.name.includes('PouchDB'));
            });

            it('.migrateDocumentData()', async() => {
                const cols = await humansCollection.create2MigrationCollections(1, {
                    3: doc => {
                        doc.age = parseInt(doc.age);
                        return doc;
                    }
                });

                const migrator = await cols.new._dataMigrator;
                const old = await cols.new._dataMigrator._getOldCollections();
                const oldCol = old.pop();

                const oldDocs = await oldCol.getBatch(10);
                const newDoc = await oldCol.migrateDocumentData(oldDocs[0]);
                assert.deepEqual(newDoc.age, parseInt(oldDocs[0].age));
            });
        });
    });
});
