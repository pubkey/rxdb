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
                    schema
                });

                const db2 = await RxDatabase.create({
                    name,
                    adapter: memdown
                });
                const schema2 = RxSchema.create(schemas.simpleHumanV3);
                const col2 = await db2.collection({
                    name: colName,
                    schema: schema2,
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
    describe('RxCollection._getOldCollections()', () => {
        it('should NOT get an older version', async() => {
            const colName = 'human';
            const db = await RxDatabase.create({
                name: util.randomCouchString(10),
                adapter: memdown
            });
            const col = await db.collection({
                name: colName,
                schema: schemas.simpleHumanV3,
                migrationStrategies: {
                    1: () => {},
                    2: () => {},
                    3: () => {}
                }
            });
            const old = await col._getOldCollections();
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
                schema
            });

            const db2 = await RxDatabase.create({
                name,
                adapter: memdown
            });
            const schema2 = RxSchema.create(schemas.simpleHumanV3);
            const col2 = await db2.collection({
                name: colName,
                schema: schema2,
                migrationStrategies: {
                    1: () => {},
                    2: () => {},
                    3: () => {}
                }
            });
            const old = await col2._getOldCollections();
            assert.ok(Array.isArray(old));
            assert.equal(old.length, 1);
            assert.ok(old[0].pouch.constructor.name.includes('PouchDB'));
            assert.equal(typeof old[0].schema, 'object');
            assert.equal(old[0].version, 0);
        });
    });

    describe('._migrateDocumentData()', () => {
        describe('positive', () => {
            it('should not do anything when doc is newest schema', async() => {
                const colName = 'human';
                const db = await RxDatabase.create({
                    name: util.randomCouchString(10),
                    adapter: memdown
                });
                const col = await db.collection({
                    name: colName,
                    schema: schemas.simpleHuman
                });
                await col.insert(schemaObjects.simpleHumanAge());
                const doc = await col.findOne().exec();
                assert.equal(doc.constructor.name, 'RxDocument');
                const docBefore = doc.toJSON();
                const docAfter = await col._migrateDocumentData(docBefore, 0);
                assert.deepEqual(docBefore, docAfter);
            });
            it('should migrate the doc', async() => {
                const name = util.randomCouchString(10);
                const colName = 'human';
                const db = await RxDatabase.create({
                    name,
                    adapter: memdown
                });
                const col = await db.collection({
                    name: colName,
                    schema: schemas.simpleHuman
                });
                const docData = schemaObjects.simpleHumanAge();
                await col.insert(docData);
                const doc = await col.findOne().exec();
                const docBefore = doc.toJSON();

                const db2 = await RxDatabase.create({
                    name,
                    adapter: memdown
                });
                const schema2 = RxSchema.create(schemas.simpleHumanV3);
                const col2 = await db2.collection({
                    name: colName,
                    schema: schema2,
                    migrationStrategies: {
                        1: async function(doc) {
                            return doc;
                        },
                        2: async function(doc) {
                            return doc;
                        },
                        3: async function(doc) {
                            doc.age = parseInt(doc.age);
                            return doc;
                        }
                    }
                });

                const docAfter = await col2._migrateDocumentData(docBefore, 0);
                assert.equal(typeof docAfter.age, 'number');
            });
        });
        describe('negative', () => {
            it('throw if migrationStrategy destroy schema-validation', async() => {
                const name = util.randomCouchString(10);
                const colName = 'human';
                const db = await RxDatabase.create({
                    name,
                    adapter: memdown
                });
                const col = await db.collection({
                    name: colName,
                    schema: schemas.simpleHuman
                });
                const docData = schemaObjects.simpleHumanAge();
                await col.insert(docData);
                const doc = await col.findOne().exec();
                const docBefore = doc.toJSON();

                const db2 = await RxDatabase.create({
                    name,
                    adapter: memdown
                });
                const schema2 = RxSchema.create(schemas.simpleHumanV3);
                const col2 = await db2.collection({
                    name: colName,
                    schema: schema2,
                    migrationStrategies: {
                        1: async function(doc) {
                            return doc;
                        },
                        2: async function(doc) {
                            return doc;
                        },
                        3: async function(doc) {
                            doc.age = 'foobar';
                            return doc;
                        }
                    }
                });
                await util.assertThrowsAsync(
                    () => col2._migrateDocumentData(docBefore, 0),
                    Error,
                    'final document does not match final schema'
                );
            });
        });
    });

    describe('migrate on .prepare()', () => {
        describe('positive', () => {
            it('should not crash when nothing to migrate', () => {

            });

        });
        describe('negative', () => {
            //    it('e', () => process.exit());
        });
    });

});
