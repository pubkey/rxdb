import assert from 'assert';
import config from './config';
import AsyncTestUtil from 'async-test-util';

import * as schemas from '../helper/schemas';
import * as humansCollection from '../helper/humans-collection';

import {
    createRxDatabase,
    PouchDB,
    randomCouchString,
    promiseWait,
    _collectionNamePrimary,
    countAllUndeleted,
    RxError,
    clone,
    getHeightOfRevision
} from '../../plugins/core';

import {
    _getOldCollections,
    getBatchOfOldCollection,
    migrateDocumentData,
    _migrateDocument,
    deleteOldCollection,
    migrateOldCollection,
    migratePromise
} from '../../plugins/migration';
import {
    SimpleHumanV3DocumentType,
    HumanDocumentType
} from '../helper/schema-objects';

config.parallel('data-migration.test.js', () => {
    describe('.create() with migrationStrategies', () => {
        describe('positive', () => {
            it('ok to create with strategies', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                await db.collection({
                    name: 'foobar',
                    schema: schemas.simpleHumanV3,
                    autoMigrate: false,
                    migrationStrategies: {
                        1: () => { },
                        2: () => { },
                        3: () => { }
                    }
                });
                db.destroy();
            });
            it('create same collection with different schema-versions', async () => {
                const colName = 'human';
                const name = randomCouchString(10);
                const db = await createRxDatabase({
                    name,
                    adapter: 'memory',
                    ignoreDuplicate: true
                });
                await db.collection({
                    name: colName,
                    schema: schemas.human,
                    autoMigrate: false
                });

                const db2 = await createRxDatabase({
                    name,
                    adapter: 'memory',
                    ignoreDuplicate: true
                });
                await db2.collection({
                    name: colName,
                    schema: schemas.simpleHumanV3,
                    autoMigrate: false,
                    migrationStrategies: {
                        1: () => { },
                        2: () => { },
                        3: () => { }
                    }
                });
                db.destroy();
                db2.destroy();
            });
        });
        describe('negative', () => {
            it('should throw when array', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                await AsyncTestUtil.assertThrows(
                    () => db.collection({
                        name: 'foobar',
                        schema: schemas.human,
                        autoMigrate: false,
                        migrationStrategies: [] as any
                    }),
                    'RxTypeError'
                );
                db.destroy();
            });
            it('should throw when property no number', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                await AsyncTestUtil.assertThrows(
                    () => db.collection({
                        name: 'foobar',
                        schema: schemas.human,
                        autoMigrate: false,
                        migrationStrategies: {
                            foo: function () { }
                        }
                    } as any),
                    'RxError'
                );
                db.destroy();
            });
            it('should throw when property no non-float-number', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                await AsyncTestUtil.assertThrows(
                    () => db.collection({
                        name: 'foobar',
                        schema: schemas.human,
                        autoMigrate: false,
                        migrationStrategies: {
                            '1.1': function () { }
                        }
                    }),
                    'RxError'
                );
                db.destroy();
            });
            it('should throw when property-value no function', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                await AsyncTestUtil.assertThrows(
                    () => db.collection({
                        name: 'foobar',
                        schema: schemas.human,
                        autoMigrate: false,
                        migrationStrategies: {
                            1: 'foobar'
                        }
                    } as any),
                    'RxError'
                );
                db.destroy();
            });
            it('throw when strategy missing', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                await AsyncTestUtil.assertThrows(
                    () => db.collection({
                        name: 'foobar',
                        schema: schemas.simpleHumanV3,
                        autoMigrate: false,
                        migrationStrategies: {
                            1: () => { },
                            3: () => { }
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
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                const col = await db.collection({
                    name: colName,
                    schema: schemas.simpleHumanV3,
                    autoMigrate: false,
                    migrationStrategies: {
                        1: () => { },
                        2: () => { },
                        3: () => { }
                    }
                });
                const old = await _getOldCollections(col.getDataMigrator());
                assert.deepStrictEqual(old, []);
                db.destroy();
            });
            it('should get an older version', async () => {
                const name = randomCouchString(10);
                const colName = 'human';
                const db = await createRxDatabase({
                    name,
                    adapter: 'memory',
                    ignoreDuplicate: true
                });
                await db.collection({
                    name: colName,
                    schema: schemas.simpleHuman,
                    autoMigrate: false
                });

                const db2 = await createRxDatabase({
                    name,
                    adapter: 'memory',
                    ignoreDuplicate: true
                });
                const col2 = await db2.collection({
                    name: colName,
                    schema: schemas.simpleHumanV3,
                    autoMigrate: false,
                    migrationStrategies: {
                        1: () => { },
                        2: () => { },
                        3: () => { }
                    }
                });
                const old = await _getOldCollections(col2.getDataMigrator());
                assert.ok(Array.isArray(old));
                assert.strictEqual(old.length, 1);

                // ensure it is an OldCollection
                assert.ok(old[0].newestCollection);

                db.destroy();
                db2.destroy();
            });
        });
        describe('OldCollection', () => {
            describe('create', () => {
                it('create', async () => {
                    const col = await humansCollection.createMigrationCollection();

                    const old = await _getOldCollections(col.getDataMigrator());
                    const oldCol: any = old.pop();

                    assert.strictEqual(oldCol.schema.constructor.name, 'RxSchema');
                    assert.strictEqual(oldCol.version, 0);
                    assert.strictEqual(oldCol._crypter.constructor.name, 'Crypter');
                    assert.strictEqual(oldCol._keyCompressor.constructor.name, 'KeyCompressor');
                    assert.ok(oldCol.pouchdb.constructor.name.includes('PouchDB'));
                    col.database.destroy();
                });
            });
            describe('.migrateDocumentData()', () => {
                it('get a valid migrated document', async () => {
                    const col = await humansCollection.createMigrationCollection(1, {
                        3: (doc: any) => {
                            doc.age = parseInt(doc.age, 10);
                            return doc;
                        }
                    });

                    const old = await _getOldCollections(col.getDataMigrator());
                    const oldCol: any = old.pop();

                    const oldDocs = await getBatchOfOldCollection(oldCol, 10);
                    const newDoc = await migrateDocumentData(oldCol, oldDocs[0]);
                    assert.deepStrictEqual(newDoc.age, parseInt(oldDocs[0].age, 10));
                    col.database.destroy();
                });
                it('get a valid migrated document from async strategy', async () => {
                    const col = await humansCollection.createMigrationCollection(1, {
                        3: async (doc: any) => {
                            await promiseWait(10);
                            doc.age = parseInt(doc.age, 10);
                            return doc;
                        }
                    });

                    const old = await _getOldCollections(col.getDataMigrator());
                    const oldCol: any = old.pop();

                    const oldDocs = await getBatchOfOldCollection(oldCol, 10);
                    const newDoc = await migrateDocumentData(oldCol, oldDocs[0]);
                    assert.deepStrictEqual(newDoc.age, parseInt(oldDocs[0].age, 10));
                    col.database.destroy();
                });
            });
            describe('.remove()', () => {
                it('should delete the pouchdb with all its content', async () => {
                    const dbName = randomCouchString(10);
                    const col = await humansCollection.createMigrationCollection(10, {}, dbName);
                    const olds = await _getOldCollections(col.getDataMigrator());
                    const old: any = olds.pop();

                    const amount = await countAllUndeleted(old.pouchdb);
                    assert.strictEqual(amount, 10);

                    const pouchLocation = old.pouchdb.name;
                    const checkPouch = new PouchDB(pouchLocation, {
                        adapter: 'memory'
                    });
                    const amountPlain = await countAllUndeleted(checkPouch as any);
                    assert.strictEqual(amountPlain, 10);

                    // check that internal doc exists
                    let docId = _collectionNamePrimary(col.name, old.schema.jsonSchema);
                    let iDoc = await old.database.internalStore.get(docId);
                    assert.strictEqual(typeof iDoc.schemaHash, 'string');


                    await deleteOldCollection(old);

                    // check that all docs deleted
                    const checkPouch2 = new PouchDB(pouchLocation, {
                        adapter: 'memory'
                    });
                    const amountPlain2 = await countAllUndeleted(checkPouch2 as any);
                    assert.strictEqual(amountPlain2, 0);

                    // check that internal doc deleted
                    let has = true;
                    docId = _collectionNamePrimary(col.name, old.schema.jsonSchema);
                    try {
                        iDoc = await (old as any).database.internalStore.get(docId);
                    } catch (e) {
                        has = false;
                    }
                    assert.strictEqual(has, false);
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
                        3: (doc: any) => {
                            doc.age = parseInt(doc.age, 10);
                            return doc;
                        }
                    });
                    const olds = await _getOldCollections(col.getDataMigrator());
                    const oldCol = olds.pop();

                    // simluate prerun of migrate()
                    const oldDocs = await getBatchOfOldCollection(oldCol as any, 10);
                    const tryDoc = oldDocs.shift();
                    const action = await _migrateDocument(oldCol as any, tryDoc);
                    assert.strictEqual(action.type, 'success');

                    // this should no crash because existing doc will be overwritten
                    await _migrateDocument(oldCol as any, tryDoc);
                    col.database.destroy();
                });
            });
            describe('.migrate()', () => {
                it('should resolve finished when no docs', async () => {
                    const col = await humansCollection.createMigrationCollection(0);
                    const olds = await _getOldCollections(col.getDataMigrator());
                    const oldCol = olds.pop();

                    await migratePromise(oldCol as any);
                    col.database.destroy();
                });
                it('should resolve finished when some docs', async () => {
                    const col = await humansCollection.createMigrationCollection(10, {
                        3: (doc: any) => {
                            doc.age = parseInt(doc.age, 10);
                            return doc;
                        }
                    });
                    const olds = await _getOldCollections(col.getDataMigrator());
                    const oldCol = olds.pop();

                    const docsPrev = await col.pouch.allDocs({
                        include_docs: false,
                        attachments: false
                    });
                    const preFiltered = docsPrev.rows.filter((doc: any) => !doc.id.startsWith('_design'));
                    assert.strictEqual(preFiltered.length, 0);

                    await migratePromise(oldCol as any);

                    // check if in new collection
                    const docs = await col.find().exec();
                    assert.strictEqual(docs.length, 10);
                    col.database.destroy();
                });
                it('should emit status for every handled document', async () => {
                    const col = await humansCollection.createMigrationCollection(10, {
                        3: async (doc: any) => {
                            await promiseWait(10);
                            doc.age = parseInt(doc.age, 10);
                            return doc;
                        }
                    });
                    const olds = await _getOldCollections(col.getDataMigrator());
                    const oldCol = olds.pop();

                    const pw8 = AsyncTestUtil.waitResolveable(1000);

                    // batchSize is doc.length / 2 to make sure it takes a bit
                    const state$ = migrateOldCollection(oldCol as any, 5);
                    const states = [];
                    state$.subscribe((state: any) => {
                        assert.strictEqual(state.type, 'success');
                        assert.ok(state.doc._id);
                        states.push(state);
                    }, () => {
                        throw new Error('this test should not call error');
                    }, () => pw8.resolve());

                    await pw8.promise;
                    assert.strictEqual(states.length, 10);
                    col.database.destroy();
                });

                it('should emit "deleted" when migration-strategy returns null', async () => {
                    const col = await humansCollection.createMigrationCollection(10, {
                        3: async () => {
                            return null;
                        }
                    });
                    const olds = await _getOldCollections(col.getDataMigrator());
                    const oldCol = olds.pop();

                    // batchSize is doc.length / 2 to make sure it takes a bit
                    const state$ = migrateOldCollection(oldCol as any, 5);
                    const states = [];
                    state$.subscribe((state: any) => {
                        assert.strictEqual(state.type, 'deleted');
                        states.push(state);
                    });

                    await AsyncTestUtil.waitUntil(() => states.length === 10);
                    col.database.destroy();
                });
                it('should throw when document cannot be migrated', async () => {
                    const col = await humansCollection.createMigrationCollection(10, {
                        3: () => {
                            throw new Error('foobar');
                        }
                    });
                    const olds = await _getOldCollections(col.getDataMigrator());
                    const oldCol = olds.pop();
                    await AsyncTestUtil.assertThrows(
                        () => migratePromise(oldCol as any),
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
                    const states: any[] = [];
                    const state$ = col.migrate();
                    state$['subscribe'](s => {
                        states.push(s);
                    }, null, pw8.resolve as any);

                    await pw8.promise;
                    assert.strictEqual(states[0].done, false);
                    assert.strictEqual(states[0].percent, 0);
                    assert.strictEqual(states[0].total, 0);

                    assert.strictEqual(states[1].done, true);
                    assert.strictEqual(states[1].percent, 100);
                    assert.strictEqual(states[1].total, 0);
                    col.database.destroy();
                });

                it('should not crash when migrating data', async () => {
                    const col = await humansCollection.createMigrationCollection(5, {
                        3: (doc: any) => {
                            doc.age = parseInt(doc.age, 10);
                            return doc;
                        }
                    });
                    const pw8 = AsyncTestUtil.waitResolveable(5000); // higher than test-timeout
                    const states: any[] = [];
                    const state$ = col.migrate();
                    state$['subscribe'](s => {
                        states.push(s);
                    }, null, pw8.resolve as any);

                    await pw8.promise;

                    assert.strictEqual(states.length, 7);

                    assert.strictEqual(states[0].done, false);
                    assert.strictEqual(states[0].percent, 0);
                    assert.strictEqual(states[0].total, 5);

                    const midState = states[4];
                    assert.strictEqual(midState.done, false);
                    assert.strictEqual(midState.percent, 80);
                    assert.strictEqual(midState.handled, 4);
                    assert.strictEqual(midState.success, 4);

                    const lastState = states.pop();
                    assert.strictEqual(lastState.done, true);
                    assert.strictEqual(lastState.percent, 100);
                    assert.strictEqual(lastState.total, 5);
                    assert.strictEqual(lastState.success, 5);
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
                    state$.subscribe(undefined, pw8.resolve as any, undefined);

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
                        3: (doc: any) => {
                            doc.age = parseInt(doc.age, 10);
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
                it('should contain the schema validation error in the thrown object', async () => {
                    const col = await humansCollection.createMigrationCollection(5, {
                        3: (docData: SimpleHumanV3DocumentType) => {
                            /**
                             * Delete required age-field
                             * to provoke schema validation error
                             */
                            delete (docData as any).age;
                            return docData;
                        }
                    });

                    let hasThrown = false;
                    try {
                        await col.migratePromise();
                    } catch (err) {
                        hasThrown = true;
                        /**
                         * Should contain the validation errors
                         */
                        assert.ok(JSON.stringify((err as RxError).parameters.errors).includes('data.age'));
                    }
                    assert.ok(hasThrown);

                    col.database.destroy();
                });
            });
        });
    });
    describe('integration into collection', () => {
        describe('run', () => {
            it('should auto-run on creation', async () => {
                const col = await humansCollection.createMigrationCollection(
                    10,
                    {
                        3: (doc: any) => {
                            doc.age = parseInt(doc.age, 10);
                            return doc;
                        }
                    },
                    randomCouchString(10),
                    true
                );
                const docs = await col.find().exec();
                assert.strictEqual(docs.length, 10);
                assert.strictEqual(typeof (docs.pop() as any).age, 'number');
                col.database.destroy();
            });
            it('should be able to change the primary key during migration', async () => {
                const dbName = randomCouchString(10);
                const schema0 = {
                    version: 0,
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            primary: true
                        }
                    },
                    required: ['id']
                };
                const schema1 = {
                    version: 1,
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string'
                        },
                        name: {
                            type: 'string',
                            primary: true
                        }
                    },
                    required: ['id', 'name']
                };
                const db = await createRxDatabase({
                    name: dbName,
                    adapter: 'memory'
                });
                const col = await db.collection({
                    name: 'heroes',
                    schema: schema0
                });
                await col.insert({
                    id: 'niven'
                });
                await db.destroy();

                const db2 = await createRxDatabase({
                    name: dbName,
                    adapter: 'memory'
                });
                const col2 = await db2.collection({
                    name: 'heroes',
                    schema: schema1,
                    migrationStrategies: {
                        1: (oldDoc: any) => {
                            oldDoc.name = (oldDoc.id as string).toUpperCase();
                            return oldDoc;
                        }
                    }
                });

                const doc = await col2.findOne().exec();
                assert.ok(doc);
                assert.strictEqual(doc.id, 'niven');
                assert.strictEqual(doc.name, 'NIVEN');
                db2.destroy();
            });

            it('should auto-run on creation (async)', async () => {
                const col = await humansCollection.createMigrationCollection(
                    10, {
                    3: async (doc: any) => {
                        promiseWait(10);
                        doc.age = parseInt(doc.age, 10);
                        return doc;
                    }
                },
                    randomCouchString(10),
                    true
                );
                const docs = await col.find().exec();
                assert.strictEqual(docs.length, 10);
                assert.strictEqual(typeof (docs.pop() as any).age, 'number');
                col.database.destroy();
            });
            it('should increase revision height when the strategy changed the documents data', async () => {
                const dbName = randomCouchString(10);

                const nonChangedKey = 'not-changed-data';
                const changedKey = 'changed-data';

                const db = await createRxDatabase({
                    name: dbName,
                    adapter: 'memory'
                });
                const col = await db.collection<HumanDocumentType>({
                    name: 'humans',
                    schema: schemas.humanFinal
                });
                await col.bulkInsert([
                    {
                        passportId: changedKey,
                        firstName: 'foo',
                        lastName: 'bar',
                        age: 20
                    },
                    {
                        passportId: nonChangedKey,
                        firstName: 'foo',
                        lastName: 'bar',
                        age: 21
                    }
                ]);

                const revBeforeMigration = (await col.findOne(nonChangedKey).exec(true)).toJSON(true)._rev;
                await db.destroy();

                const db2 = await createRxDatabase({
                    name: dbName,
                    adapter: 'memory'
                });
                const schema2 = clone(schemas.humanFinal);
                schema2.version = 1;

                const col2 = await db2.collection<HumanDocumentType>({
                    name: 'humans',
                    schema: schema2,
                    migrationStrategies: {
                        1: function (docData: HumanDocumentType) {
                            if (docData.passportId === changedKey) {
                                docData.age = 100;
                            }
                            return docData;
                        }
                    }
                });

                /**
                 * If document data was not changed by migration, it should have kept the same revision
                 */
                const revAfterMigration = (await col2.findOne(nonChangedKey).exec(true)).toJSON(true)._rev;
                assert.strictEqual(revBeforeMigration, revAfterMigration);

                /**
                 * If document was changed, we should have an increased revision height
                 * to ensure that replicated instances use our new data.
                 */
                const revChangedAfterMigration = (await col2.findOne(changedKey).exec(true)).toJSON(true)._rev;
                const afterHeight = getHeightOfRevision(revChangedAfterMigration);
                assert.strictEqual(afterHeight, 2);

                db2.destroy();
            });
        });
        describe('.migrationNeeded()', () => {
            it('return true if schema-version is 0', async () => {
                const col = await humansCollection.create();
                const needed = await col.migrationNeeded();
                assert.strictEqual(needed, false);
                col.database.destroy();
            });
            it('return false if nothing to migrate', async () => {
                const col = await humansCollection.createMigrationCollection(5, {
                    3: (doc: any) => {
                        doc.age = parseInt(doc.age, 10);
                        return doc;
                    }
                });
                await col.migratePromise();
                const needed = await col.migrationNeeded();
                assert.strictEqual(needed, false);
                col.database.destroy();
            });
            it('return true if something to migrate', async () => {
                const col = await humansCollection.createMigrationCollection(5, {
                    3: (doc: any) => {
                        doc.age = parseInt(doc.age, 10);
                        return doc;
                    }
                });
                const needed = await col.migrationNeeded();
                assert.strictEqual(needed, true);
                col.database.destroy();
            });
        });
    });
    describe('RxDatabase.migrationStates()', () => {
        it('should emit the ongoing migration state', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                adapter: 'memory'
            });
            const migrationStrategies = {
                1: () => { },
                2: () => { },
                3: () => { }
            };

            const emitted: any[] = [];
            db.migrationStates().subscribe(x => emitted.push(x));

            await db.addCollections({
                foobar: {
                    schema: schemas.simpleHumanV3,
                    autoMigrate: false,
                    migrationStrategies
                },
                foobar2: {
                    schema: schemas.simpleHumanV3,
                    autoMigrate: false,
                    migrationStrategies
                }
            });

            await Promise.all([
                db.foobar.migrate().toPromise(),
                db.foobar2.migrate().toPromise()
            ]);

            assert.ok(emitted.length >= 2);

            const endStates = emitted.map(list => list.map((i: any) => i.state)).pop();
            if (!endStates) {
                throw new Error('endStates missing');
            }
            assert.strictEqual(endStates.length, 2);
            endStates.forEach((s: any) => {
                assert.strictEqual(s.done, true);
            });

            db.destroy();
        });
    });
    describe('issues', () => {
        describe('#212 migration runs into infinity-loop', () => {
            it('reproduce and fix', async () => {
                const dbName = randomCouchString(10);
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
                const db = await createRxDatabase({
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

                const db2 = await createRxDatabase({
                    name: dbName,
                    adapter: 'memory'
                });
                const col2 = await db2.collection({
                    name: 'heroes',
                    schema: schema1,
                    migrationStrategies: {
                        1: (oldDoc: any) => {
                            // console.log('migrate from 0 to 1...' + oldDoc.name);
                            oldDoc.level = 'ss';
                            return oldDoc;
                        }
                    }
                });

                const docs = await col2.find().exec();
                assert.strictEqual(docs.length, 1);
                assert.strictEqual(docs[0].level, 'ss');
                assert.strictEqual(docs[0].name, 'Niven');
                assert.strictEqual(docs[0].color, 'black');
                db2.destroy();
            });
        });
    });
});
