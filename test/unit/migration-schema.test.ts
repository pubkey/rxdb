import assert from 'assert';
import config, { describeParallel } from './config.ts';
import AsyncTestUtil, { waitUntil } from 'async-test-util';

import { humansCollection, schemaObjects, schemas } from '../../plugins/test-utils/index.mjs';

import {
    createRxDatabase,
    randomCouchString,
    promiseWait,
    clone,
    getHeightOfRevision,
    lastOfArray,
    RxStorageInstance,
    now,
    addRxPlugin,
    RxCollection,
    createBlob,
    ensureNotFalsy,
    MigrationStrategies,
    MigrationStrategy,
    STORAGE_TOKEN_DOCUMENT_ID,
    RxDocumentData,
    InternalStoreStorageTokenDocType,
    rxStorageInstanceToReplicationHandler
} from '../../plugins/core/index.mjs';

import {
    RxMigrationState,
    RxMigrationStatus,
    getOldCollectionMeta
} from '../../plugins/migration-schema/index.mjs';
import { HumanDocumentType } from '../../plugins/test-utils/index.mjs';
import { EXAMPLE_REVISION_1 } from '../../plugins/test-utils/index.mjs';

import { RxDBMigrationPlugin } from '../../plugins/migration-schema/index.mjs';
import { RxDBAttachmentsPlugin } from '../../plugins/attachments/index.mjs';
import { replicateRxCollection } from '../../plugins/replication/index.mjs';
import { ensureReplicationHasNoErrors } from '../../plugins/test-utils/index.mjs';
import { SimpleHumanAgeDocumentType } from '../../src/plugins/test-utils/schema-objects.ts';


describeParallel('migration-schema.test.ts', function () {
    this.timeout(1000 * 10);
    if (
        !config.storage.hasPersistence ||
        !config.storage.hasReplication
    ) {
        return;
    }
    addRxPlugin(RxDBMigrationPlugin);

    if (config.storage.hasAttachments) {
        addRxPlugin(RxDBAttachmentsPlugin);
    }

    describe('.create() with migrationStrategies', () => {
        describe('positive', () => {
            it('ok to create with strategies', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: config.storage.getStorage(),
                });
                await db.addCollections({
                    foobar: {
                        schema: schemas.simpleHumanV3,
                        autoMigrate: false,
                        migrationStrategies: {
                            1: () => { },
                            2: () => { },
                            3: () => { }
                        }
                    }
                });
                db.destroy();
            });
            it('create same collection with different schema-versions', async () => {
                const colName = 'human';
                const name = randomCouchString(10);
                const db = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    ignoreDuplicate: true
                });
                await db.addCollections({
                    [colName]: {
                        schema: schemas.human,
                        autoMigrate: false
                    }
                });

                const db2 = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    ignoreDuplicate: true
                });
                await db2.addCollections({
                    [colName]: {
                        schema: schemas.simpleHumanV3,
                        autoMigrate: false,
                        migrationStrategies: {
                            1: () => { },
                            2: () => { },
                            3: () => { }
                        }
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
                    storage: config.storage.getStorage(),
                });
                await AsyncTestUtil.assertThrows(
                    () => db.addCollections({
                        foobar: {
                            schema: schemas.human,
                            autoMigrate: false,
                            migrationStrategies: [] as any
                        }
                    }),
                    'RxTypeError'
                );
                db.destroy();
            });
            it('should throw when property no number', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: config.storage.getStorage(),
                });
                await AsyncTestUtil.assertThrows(
                    () => db.addCollections({
                        foobar: {
                            schema: schemas.human,
                            autoMigrate: false,
                            migrationStrategies: {
                                foo: function () { }
                            }
                        }
                    } as any),
                    'RxError'
                );
                db.destroy();
            });
            it('should throw when property no non-float-number', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: config.storage.getStorage(),
                });
                await AsyncTestUtil.assertThrows(
                    () => db.addCollections({
                        foobar: {
                            schema: schemas.human,
                            autoMigrate: false,
                            migrationStrategies: {
                                '1.1': function () { }
                            }
                        }
                    }),
                    'RxError'
                );
                db.destroy();
            });
            it('should throw when property-value no function', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: config.storage.getStorage(),
                });
                await AsyncTestUtil.assertThrows(
                    () => db.addCollections({
                        foobar: {
                            schema: schemas.human,
                            autoMigrate: false,
                            migrationStrategies: {
                                1: 'foobar'
                            }
                        }
                    } as any),
                    'RxError'
                );
                db.destroy();
            });
            it('throw when strategy missing', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: config.storage.getStorage(),
                });
                await AsyncTestUtil.assertThrows(
                    () => db.addCollections({
                        foobar: {
                            schema: schemas.simpleHumanV3,
                            autoMigrate: false,
                            migrationStrategies: {
                                1: () => { },
                                3: () => { }
                            }
                        }
                    }),
                    'RxError'
                );
                db.destroy();
            });
        });
    });
    describe('getOldCollectionMeta()', () => {
        it('should NOT get an older version', async () => {
            const colName = 'human';
            const db = await createRxDatabase({
                name: randomCouchString(10),
                storage: config.storage.getStorage(),
            });
            const cols = await db.addCollections({
                [colName]: {
                    schema: schemas.simpleHumanV3,
                    autoMigrate: false,
                    migrationStrategies: {
                        1: () => { },
                        2: () => { },
                        3: () => { }
                    }
                }
            });
            const col = cols[colName];
            const old = await getOldCollectionMeta(col.getMigrationState());
            assert.deepStrictEqual(old, undefined);
            db.destroy();
        });
        it('should get an older version', async () => {
            const name = randomCouchString(10);
            const colName = 'human';
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                ignoreDuplicate: true
            });
            await db.addCollections({
                [colName]: {
                    schema: schemas.simpleHuman,
                    autoMigrate: false
                }
            });

            const db2 = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                ignoreDuplicate: true
            });
            const cols2 = await db2.addCollections({
                [colName]: {
                    schema: schemas.simpleHumanV3,
                    autoMigrate: false,
                    migrationStrategies: {
                        1: () => { },
                        2: () => { },
                        3: () => { }
                    }
                }
            });
            const col2 = cols2[colName];
            const oldCollectionMeta = await getOldCollectionMeta(col2.getMigrationState());
            assert.ok(oldCollectionMeta);

            // ensure it is an OldCollection
            assert.ok(oldCollectionMeta.data.schema);

            db.destroy();
            db2.destroy();
        });
    });
    describe('migration basics', () => {
        describe('.remove()', () => {
            it('should delete the old storage instance with all its content', async () => {
                if (!config.storage.hasMultiInstance) {
                    return;
                }
                const dbName = randomCouchString(10);
                const col = await humansCollection.createMigrationCollection(10, {}, dbName, true);
                await col.database.destroy();


                const db = await createRxDatabase<{ human: RxCollection<SimpleHumanAgeDocumentType>; }>({
                    name: dbName,
                    storage: config.storage.getStorage(),
                    ignoreDuplicate: true
                });
                const cols = await db.addCollections({
                    human: {
                        schema: schemas.simpleHuman,
                    }
                });
                const newCollection = cols.human;
                const docsAfter = await newCollection.find().exec();
                assert.strictEqual(docsAfter.length, 0);
                await db.destroy();
            });
        });
        describe('.migrate()', () => {
            it('should resolve finished when no docs', async () => {
                const col = await humansCollection.createMigrationCollection(0);
                await col.migratePromise();
                await col.database.destroy();
            });
            it('should resolve finished when some docs are in the collection', async () => {
                const col = await humansCollection.createMigrationCollection(10, {
                    3: (doc: any) => {
                        doc.age = parseInt(doc.age, 10);
                        return doc;
                    }
                });
                await col.migratePromise();

                // check if in new collection
                const docs = await col.find().exec();
                assert.strictEqual(docs.length, 10);
                await col.database.destroy();
            });
            it('should emit status updates', async () => {
                const docsAmount = 10;

                const col = await humansCollection.createMigrationCollection(
                    docsAmount,
                    {
                        3: async (doc: any) => {
                            await promiseWait(10);
                            doc.age = parseInt(doc.age, 10);
                            return doc;
                        }
                    }
                );

                const state$ = col.getMigrationState().$;
                const states: RxMigrationStatus[] = [];
                const sub = state$.subscribe(state => {
                    states.push(state);
                });

                await col.migratePromise(1);

                await waitUntil(() => lastOfArray(states)?.status === 'DONE');
                assert.ok(states.length >= 3);

                sub.unsubscribe();
                await col.database.remove();
            });

            it('should remove the document when migration-strategy returns null', async () => {
                const col = await humansCollection.createMigrationCollection(10, {
                    3: () => {
                        return null;
                    }
                });

                await col.migratePromise();
                const docs = await col.find().exec();
                assert.strictEqual(docs.length, 0);

                col.database.destroy();
            });
            it('should throw when document cannot be migrated', async () => {
                const col = await humansCollection.createMigrationCollection(10, {
                    3: () => {
                        throw new Error('foobarInStrategy');
                    }
                });

                await AsyncTestUtil.assertThrows(
                    () => col.migratePromise(),
                    'RxError',
                    'DM4'
                );
                await col.database.destroy();
            });
        });
        describe('.migratePromise()', () => {
            describe('positive', () => {
                it('should resolve when nothing to migrate', async () => {
                    const col = await humansCollection.createMigrationCollection(0, {});
                    await col.migratePromise();
                    await col.database.destroy();
                });

                it('should resolve when migrating data', async () => {
                    const col = await humansCollection.createMigrationCollection(5, {
                        3: (doc: any) => {
                            doc.age = parseInt(doc.age, 10);
                            return doc;
                        }
                    });
                    await col.migratePromise();
                    const docs = await col.find().exec();
                    assert.strictEqual(docs.length, 5);
                    await col.database.remove();
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
                    await col.database.destroy();
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
                await col.database.destroy();
            });
            it('should be able to change the primary key during migration', async () => {
                const dbName = randomCouchString(10);
                const schema0 = {
                    version: 0,
                    primaryKey: 'id',
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            maxLength: 100
                        }
                    },
                    required: ['id']
                };
                const schema1 = {
                    version: 1,
                    primaryKey: 'id',
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            maxLength: 100
                        },
                        name: {
                            type: 'string'
                        }
                    },
                    required: ['id', 'name']
                };
                const db = await createRxDatabase({
                    name: dbName,
                    storage: config.storage.getStorage(),
                });
                const cols = await db.addCollections({
                    heroes: {
                        schema: schema0
                    }
                });
                const col = cols.heroes;
                await col.insert({
                    id: 'niven'
                });
                await db.destroy();

                const db2 = await createRxDatabase({
                    name: dbName,
                    storage: config.storage.getStorage(),
                });
                const cols2 = await db2.addCollections({
                    heroes: {
                        schema: schema1,
                        migrationStrategies: {
                            1: (oldDoc: any) => {
                                oldDoc.name = (oldDoc.id as string).toUpperCase();
                                return oldDoc;
                            }
                        }
                    }
                });
                const col2 = cols2.heroes;

                const doc = await col2.findOne().exec();

                assert.ok(doc);
                assert.strictEqual(doc.id, 'niven');
                assert.strictEqual(doc.name, 'NIVEN');
                db2.destroy();
            });

            it('should auto-run on creation (async)', async () => {
                const col = await humansCollection.createMigrationCollection(
                    10,
                    {
                        3: async (doc: any) => {
                            await promiseWait(10);
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
            /**
             * We need this to ensure old push-checkpoints are still valid
             */
            it('should keep the _meta.lwt value of the documents', async () => {
                const name = randomCouchString(10);
                const db = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    ignoreDuplicate: true
                });
                await db.addCollections({
                    human: {
                        schema: schemas.simpleHuman,
                        autoMigrate: false
                    }
                });
                const doc = await db.human.insert(schemaObjects.simpleHumanAge({ passportId: 'local-1' }));
                const lwtBefore = doc.toJSON(true)._meta.lwt;
                await db.destroy();

                const db2 = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    ignoreDuplicate: true
                });

                const cols2 = await db2.addCollections({
                    human: {
                        schema: schemas.simpleHumanV3,
                        autoMigrate: true,
                        migrationStrategies: {
                            1: d => d,
                            2: d => d,
                            3: d => d
                        }
                    }
                });
                const col2 = cols2.human;

                const docAfter = await col2.findOne().exec();
                const lwtAfter = docAfter.toJSON(true)._meta.lwt;

                assert.strictEqual(lwtBefore, lwtAfter);

                db2.destroy();
            });
            it('should increase revision height when the strategy changed the documents data', async () => {
                return; // TODO do we need this?
                const dbName = randomCouchString(10);

                const nonChangedKey = 'not-changed-data';
                const changedKey = 'changed-data';

                const db = await createRxDatabase({
                    name: dbName,
                    storage: config.storage.getStorage(),
                });
                const cols = await db.addCollections({
                    humans: {
                        schema: schemas.humanFinal
                    }
                });


                const col = cols.humans;
                await col.bulkInsert([
                    {
                        passportId: changedKey,
                        firstName: 'foo',
                        lastName: 'bar',
                        age: 20
                    }
                ]);

                /**
                 * To ensure that we really keep that revision, we
                 * hackly insert this document via the RxStorageInstance.
                 */
                const originalStorageInstance: RxStorageInstance<HumanDocumentType, any, any> = (col.storageInstance as any).originalStorageInstance;
                await originalStorageInstance.bulkWrite([{
                    document: {
                        passportId: nonChangedKey,
                        firstName: 'foo',
                        lastName: 'bar',
                        age: 21,
                        _meta: {
                            lwt: now()
                        },
                        _rev: EXAMPLE_REVISION_1,
                        _attachments: {},
                        _deleted: false
                    }
                }], 'test-data-migration');

                await db.destroy();

                const db2 = await createRxDatabase({
                    name: dbName,
                    storage: config.storage.getStorage(),
                });
                const schema2 = clone(schemas.humanFinal);
                schema2.version = 1;

                const cols2 = await db2.addCollections({
                    humans: {
                        schema: schema2,
                        migrationStrategies: {
                            1: function (docData: HumanDocumentType) {
                                if (docData.passportId === changedKey) {
                                    docData.age = 100;
                                }
                                return docData;
                            }
                        }
                    }
                });
                const col2 = cols2.humans;

                /**
                 * If document data was not changed by migration, it should have kept the same revision
                 */
                const revAfterMigration = (await col2.findOne(nonChangedKey).exec(true)).toJSON(true)._rev;
                assert.strictEqual(getHeightOfRevision(revAfterMigration), 1);

                /**
                 * If document was changed, we should have an increased revision height
                 * to ensure that replicated instances use our new data.
                 */
                const revChangedAfterMigration = (await col2.findOne(changedKey).exec(true)).toJSON(true)._rev;
                assert.strictEqual(getHeightOfRevision(revChangedAfterMigration), 2);

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
                storage: config.storage.getStorage(),
            });
            const migrationStrategies = {
                1: () => { },
                2: () => { },
                3: () => { }
            };

            const emitted: RxMigrationState[][] = [];
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
                db.foobar.getMigrationState().migratePromise(),
                db.foobar2.getMigrationState().migratePromise()
            ]);

            assert.ok(emitted.length >= 2);
            const endStates = await Promise.all(
                ensureNotFalsy(lastOfArray(emitted)).map(state => state.migratePromise())
            );
            emitted.map(list => list.map((i: any) => i.state)).pop();
            if (!endStates) {
                throw new Error('endStates missing');
            }
            assert.strictEqual(endStates.length, 2);
            endStates.forEach((s) => {
                assert.strictEqual(s.status, 'DONE');
            });

            db.destroy();
        });
    });
    describe('migration and replication', () => {
        it('should have migrated the replication state', async () => {
            const remoteDb = await createRxDatabase({
                name: 'remote' + randomCouchString(10),
                storage: config.storage.getStorage(),
            });
            await remoteDb.addCollections({
                humans: {
                    schema: schemas.simpleHuman
                }
            });
            const name = randomCouchString(10);
            const db = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
            });
            await db.addCollections({
                humans: {
                    schema: schemas.simpleHuman
                }
            });
            await Promise.all([
                db.humans.insert(schemaObjects.simpleHumanAge({ passportId: 'local-1' })),
                db.humans.insert(schemaObjects.simpleHumanAge({ passportId: 'local-2' })),
                db.humans.insert(schemaObjects.simpleHumanAge({ passportId: 'local-3' })),
                remoteDb.humans.insert(schemaObjects.simpleHumanAge({ passportId: 'remote-1' })),
                remoteDb.humans.insert(schemaObjects.simpleHumanAge({ passportId: 'remote-2' })),
                remoteDb.humans.insert(schemaObjects.simpleHumanAge({ passportId: 'remote-3' })),

                // one with full primaryKey length
                db.humans.insert(schemaObjects.simpleHumanAge({ passportId: randomCouchString(schemas.simpleHuman.properties.passportId.maxLength) })),
                remoteDb.humans.insert(schemaObjects.simpleHumanAge({ passportId: randomCouchString(schemas.simpleHuman.properties.passportId.maxLength) }))
            ]);

            const helper = rxStorageInstanceToReplicationHandler(
                remoteDb.humans.storageInstance,
                remoteDb.humans.conflictHandler,
                remoteDb.humans.database.token
            );
            const replicationState = replicateRxCollection({
                collection: db.humans,
                replicationIdentifier: 'migrate-replication-state',
                live: false,
                autoStart: true,
                waitForLeadership: false,
                pull: {
                    handler: helper.masterChangesSince
                },
                push: {
                    handler: helper.masterWrite
                }
            });
            ensureReplicationHasNoErrors(replicationState);

            await replicationState.awaitInitialReplication();
            await replicationState.cancel();
            await db.destroy();

            const db2 = await createRxDatabase({
                name,
                storage: config.storage.getStorage(),
            });


            const ensureNoUnknownStrategy: MigrationStrategy = (d) => {
                if (d._meta) {
                    throw new Error('Must not have _meta field');
                }
                if (d.lwt) {
                    throw new Error('Must not get checkpoint doc');
                }
                return d;
            };
            const migrationStrategies: MigrationStrategies = {
                1: ensureNoUnknownStrategy,
                2: ensureNoUnknownStrategy,
                3: ensureNoUnknownStrategy
            };

            await db2.addCollections({
                humans: {
                    schema: schemas.simpleHumanV3,
                    migrationStrategies
                }
            });

            const replicationState2 = replicateRxCollection({
                collection: db2.humans,
                replicationIdentifier: 'migrate-replication-state',
                live: false,
                autoStart: true,
                waitForLeadership: false,
                pull: {
                    handler: helper.masterChangesSince
                },
                push: {
                    handler: helper.masterWrite
                }
            });
            ensureReplicationHasNoErrors(replicationState2);

            /**
             * It should not have transferred any documents
             */
            let hasTransferred: boolean | string = false;
            replicationState2.sent$.subscribe(() => {
                hasTransferred = 'sent';
            });
            replicationState2.received$.subscribe(() => {
                hasTransferred = 'received';
            });

            await replicationState2.awaitInitialReplication();
            await replicationState2.cancel();

            if (hasTransferred) {
                throw new Error('should not have transferred data: ' + hasTransferred);
            }

            await db2.destroy();
            await remoteDb.destroy();
        });
    });
    describe('issues', () => {
        it('#212 migration runs into infinity-loop', async () => {
            const dbName = randomCouchString(10);
            const schema0 = {
                title: 'hero schema',
                description: 'describes a simple hero',
                version: 0,
                primaryKey: 'name',
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        maxLength: 100
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
                primaryKey: 'name',
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        maxLength: 100
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
                storage: config.storage.getStorage(),
            });
            const cols = await db.addCollections({
                heroes: {
                    schema: schema0
                }
            });
            const col = cols.heroes;
            await col.insert({
                name: 'Niven',
                color: 'black'
            });
            await db.destroy();

            const db2 = await createRxDatabase({
                name: dbName,
                storage: config.storage.getStorage(),
            });
            const cols2 = await db2.addCollections({
                heroes: {
                    schema: schema1,
                    migrationStrategies: {
                        1: (oldDoc: any) => {
                            oldDoc.level = 'ss';
                            return oldDoc;
                        }
                    }
                }
            });
            const col2 = cols2.heroes;

            const docs = await col2.find().exec();
            assert.strictEqual(docs.length, 1);
            assert.strictEqual(docs[0].level, 'ss');
            assert.strictEqual(docs[0].name, 'Niven');
            assert.strictEqual(docs[0].color, 'black');
            db2.destroy();
        });
        it('#3460 migrate attachments', async () => {
            if (!config.storage.hasAttachments) {
                return;
            }
            const attachmentData = AsyncTestUtil.randomString(20);
            const dataBlob = createBlob(
                attachmentData,
                'text/plain'
            );
            const col = await humansCollection.createMigrationCollection(
                10,
                {
                    3: (doc: any) => {
                        doc.age = parseInt(doc.age, 10);
                        return doc;
                    }
                },
                randomCouchString(10),
                false,
                {
                    id: 'foo',
                    data: dataBlob,
                    type: 'text/plain'
                }
            );



            await col.migratePromise();

            const docs = await col.find().exec();
            const attachment = docs[0].getAttachment('foo');
            assert.ok(attachment);
            assert.strictEqual(attachment.type, 'text/plain');
            assert.strictEqual(attachment.length, attachmentData.length);

            col.database.destroy();
        });
        it('opening an older RxDB database state with a new major version should throw an error', async () => {
            const dbName = randomCouchString(10);
            const db = await createRxDatabase({
                name: dbName,
                storage: config.storage.getStorage(),
            });
            await db.storageTokenDocument;

            // fake an older database state by changing the internal version.
            const tokenDoc: RxDocumentData<InternalStoreStorageTokenDocType> = (await db.internalStore.findDocumentsById([STORAGE_TOKEN_DOCUMENT_ID], false))[0];
            const newTokenDoc = clone(tokenDoc);
            newTokenDoc.data.rxdbVersion = '14.x.x';

            const writeResponse = await db.internalStore.bulkWrite([{
                previous: tokenDoc,
                document: newTokenDoc
            }], 'fake-old-version');
            assert.deepStrictEqual(writeResponse.error, []);
            await db.destroy();


            const newDb = await createRxDatabase({
                name: dbName,
                storage: config.storage.getStorage(),
            });

            await AsyncTestUtil.assertThrows(
                () => newDb.addCollections({
                    foo: {
                        schema: {
                            version: 0,
                            primaryKey: 'name',
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    maxLength: 100
                                },
                            }
                        }
                    }
                }),
                'RxError',
                'DM5'
            );
            await newDb.destroy();
        });
    });
});
