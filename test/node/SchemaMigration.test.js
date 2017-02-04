import assert from 'assert';
import {
    default as randomToken
} from 'random-token';
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
                const db = await RxDatabase.create(randomToken(10), memdown);
                const schema = RxSchema.create(schemas.simpleHumanV3);
                await RxCollection.create(db, 'foobar', schema, null, {
                    1: () => {},
                    2: () => {},
                    3: () => {}
                });
            });
            it('create same collection with different schema-versions', async() => {
                const colName = 'human';
                const dbName = randomToken(10);
                const db = await RxDatabase.create(dbName, memdown);
                const schema = RxSchema.create(schemas.human);
                const col = await db.collection(colName, schema);

                const db2 = await RxDatabase.create(dbName, memdown);
                const schema2 = RxSchema.create(schemas.simpleHumanV3);
                const col2 = await db2.collection(colName, schema2, null, {
                    1: () => {},
                    2: () => {},
                    3: () => {}
                });
            });
        });
        describe('negative', () => {
            it('should throw when array', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown);
                const schema = RxSchema.create(schemas.human);
                await util.assertThrowsAsync(
                    () => RxCollection.create(db, 'foobar', schema, null, []),
                    TypeError
                );
            });
            it('should throw when property no number', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown);
                const schema = RxSchema.create(schemas.human);
                await util.assertThrowsAsync(
                    () => RxCollection.create(db, 'foobar', schema, null, {
                        foo: function() {}
                    }),
                    Error
                );
            });
            it('should throw when property no non-float-number', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown);
                const schema = RxSchema.create(schemas.human);
                await util.assertThrowsAsync(
                    () => RxCollection.create(db, 'foobar', schema, null, {
                        '1.1': function() {}
                    }),
                    Error
                );
            });
            it('should throw when property-value no function', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown);
                const schema = RxSchema.create(schemas.human);
                await util.assertThrowsAsync(
                    () => RxCollection.create(db, 'foobar', schema, null, {
                        1: 'foobar'
                    }),
                    Error
                );
            });
            it('throw when strategy missing', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown);
                const schema = RxSchema.create(schemas.simpleHumanV3);
                await util.assertThrowsAsync(
                    () => RxCollection.create(db, 'foobar', schema, null, {
                        1: () => {},
                        3: () => {}
                    }),
                    Error
                );
            });
        });


    });
    describe('RxCollection._getOldCollections()', () => {
        it('should NOT get an older version', async() => {
            const colName = 'human';
            const db = await RxDatabase.create(randomToken(10), memdown);
            const col = await db.collection(colName, schemas.simpleHumanV3, null, {
                1: () => {},
                2: () => {},
                3: () => {}
            });
            const old = await col._getOldCollections();
            assert.deepEqual(old, {});
        });

        it('should get an older version', async() => {
            const dbName = randomToken(10);
            const colName = 'human';
            const db = await RxDatabase.create(dbName, memdown);
            const schema = RxSchema.create(schemas.human);
            const col = await db.collection(colName, schema);

            const db2 = await RxDatabase.create(dbName, memdown);
            const schema2 = RxSchema.create(schemas.simpleHumanV3);
            const col2 = await db2.collection(colName, schema2, null, {
                1: () => {},
                2: () => {},
                3: () => {}
            });
            const old = await col2._getOldCollections();
            assert.notDeepEqual(old, {});
            assert.ok(old[0]);
            assert.ok(old[0].constructor.name.includes('PouchDB'));
            assert.equal(Object.keys(old).length, 1);
        });




        it('e', () => process.exit());
    });

});
