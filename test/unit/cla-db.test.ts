import assert from 'assert';
import {
    indexedDB as fakeIndexedDB,
    IDBKeyRange as fakeIDBKeyRange
} from 'fake-indexeddb';
import {
    addRxPlugin,
    createRxDatabase,
    hasPremiumFlag,
    NON_PREMIUM_COLLECTION_LIMIT,
    randomToken,
    RXDB_VERSION
} from '../../plugins/core/index.mjs';
import type {
    RxConflictHandler,
    RxJsonSchema,
    RxReplicationWriteToMasterRow,
    WithDeleted
} from '../../plugins/core/index.mjs';
import { getRxStorageMemory } from '../../plugins/storage-memory/index.mjs';
import { getRxStorageDexie } from '../../plugins/storage-dexie/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
import { replicateRxCollection } from '../../plugins/replication/index.mjs';
import { RxDBMigrationPlugin } from '../../plugins/migration-schema/index.mjs';

addRxPlugin(RxDBMigrationPlugin);

type OrderDocType = {
    id: string;
    customerName: string;
    amount: number;
    status: string;
    updatedAt: number;
};

type OrderDocV1Type = OrderDocType & {
    currency: string;
};

type SyncCheckpoint = {
    id: string;
    updatedAt: number;
};

const orderSchemaV0: RxJsonSchema<OrderDocType> = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        customerName: { type: 'string' },
        amount: { type: 'number' },
        status: { type: 'string', maxLength: 50 },
        updatedAt: { type: 'number', minimum: 0, maximum: 9999999999999, multipleOf: 1 }
    },
    required: ['id', 'customerName', 'amount', 'status', 'updatedAt'],
    indexes: ['status', 'updatedAt']
};

const orderSchemaV1: RxJsonSchema<OrderDocV1Type> = {
    version: 1,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        customerName: { type: 'string' },
        amount: { type: 'number' },
        status: { type: 'string', maxLength: 50 },
        updatedAt: { type: 'number', minimum: 0, maximum: 9999999999999, multipleOf: 1 },
        currency: { type: 'string', maxLength: 10 }
    },
    required: ['id', 'customerName', 'amount', 'status', 'updatedAt', 'currency'],
    indexes: ['status', 'updatedAt']
};

function createMemoryTestStorage() {
    return wrappedValidateAjvStorage({
        storage: getRxStorageMemory()
    });
}

function createDexieTestStorage() {
    return wrappedValidateAjvStorage({
        storage: getRxStorageDexie({
            indexedDB: fakeIndexedDB,
            IDBKeyRange: fakeIDBKeyRange
        })
    });
}

function buildCollectionsMap(count: number) {
    const collections: Record<string, { schema: RxJsonSchema<OrderDocType>; }> = {};
    for (let i = 1; i <= count; i++) {
        collections['col_' + i] = {
            schema: orderSchemaV0
        };
    }
    return collections;
}

describe('cla-db.test.ts', () => {
    describe('fork invariants', () => {
        it('keeps RXDB_VERSION aligned with RxDB 17 format and does not falsify Premium flag', async () => {
            assert.strictEqual(RXDB_VERSION.startsWith('17.'), true);
            assert.strictEqual(NON_PREMIUM_COLLECTION_LIMIT, 13);
            assert.strictEqual(await hasPremiumFlag(), false);
        });
    });

    describe('multi-collection scaling without artificial cap', () => {
        const collectionCounts = [14, 20, 50, 100];

        for (const count of collectionCounts) {
            it(`creates and operates ${count} simultaneous collections on memory and records timing/heap metrics`, async function () {
                this.timeout(30 * 1000);

                if (typeof global.gc === 'function') {
                    global.gc();
                }
                const heapBefore = process.memoryUsage().heapUsed;
                const startMs = performance.now();

                const db = await createRxDatabase({
                    name: 'cla_multi_mem_' + count + '_' + randomToken(8),
                    storage: createMemoryTestStorage(),
                    ignoreDuplicate: true
                });

                try {
                    await db.addCollections(buildCollectionsMap(count));
                    const initMs = performance.now() - startMs;
                    const heapAfter = process.memoryUsage().heapUsed;
                    const heapDeltaMb = (heapAfter - heapBefore) / (1024 * 1024);

                    assert.strictEqual(Object.keys(db.collections).length, count);

                    const firstCol = db.collections['col_1'];
                    const lastCol = db.collections['col_' + count];

                    await firstCol.insert({
                        id: 'doc-first',
                        customerName: 'Ana',
                        amount: 500,
                        status: 'open',
                        updatedAt: 1000
                    });
                    await lastCol.insert({
                        id: 'doc-last',
                        customerName: 'Luis',
                        amount: 900,
                        status: 'open',
                        updatedAt: 2000
                    });

                    const firstDoc = await firstCol.findOne('doc-first').exec();
                    const lastDoc = await lastCol.findOne('doc-last').exec();
                    assert.ok(firstDoc);
                    assert.ok(lastDoc);
                    assert.strictEqual(firstDoc.amount, 500);
                    assert.strictEqual(lastDoc.amount, 900);

                    console.log(
                        `[CLA-DB-METRIC] storage=memory collections=${count} initMs=${initMs.toFixed(2)} heapDeltaMB=${heapDeltaMb.toFixed(2)}`
                    );
                } finally {
                    await db.remove();
                }
            });

            it(`creates and operates ${count} simultaneous collections on Dexie and records timing/heap metrics`, async function () {
                this.timeout(60 * 1000);

                if (typeof global.gc === 'function') {
                    global.gc();
                }
                const heapBefore = process.memoryUsage().heapUsed;
                const startMs = performance.now();

                const db = await createRxDatabase({
                    name: 'cla_multi_dexie_' + count + '_' + randomToken(8),
                    storage: createDexieTestStorage(),
                    multiInstance: false,
                    ignoreDuplicate: true
                });

                try {
                    await db.addCollections(buildCollectionsMap(count));
                    const initMs = performance.now() - startMs;
                    const heapAfter = process.memoryUsage().heapUsed;
                    const heapDeltaMb = (heapAfter - heapBefore) / (1024 * 1024);

                    assert.strictEqual(Object.keys(db.collections).length, count);

                    const lastCol = db.collections['col_' + count];
                    await lastCol.insert({
                        id: 'dexie-last',
                        customerName: 'Dexie Client',
                        amount: 777,
                        status: 'open',
                        updatedAt: 3000
                    });
                    const doc = await lastCol.findOne('dexie-last').exec();
                    assert.ok(doc);
                    assert.strictEqual(doc.amount, 777);

                    console.log(
                        `[CLA-DB-METRIC] storage=dexie collections=${count} initMs=${initMs.toFixed(2)} heapDeltaMB=${heapDeltaMb.toFixed(2)}`
                    );
                } finally {
                    await db.remove();
                }
            });
        }
    });

    describe('CRUD and reactive queries', () => {
        it('supports insert, update, remove, and reactive query emissions', async () => {
            const db = await createRxDatabase({
                name: 'cla_crud_' + randomToken(8),
                storage: createMemoryTestStorage(),
                ignoreDuplicate: true
            });

            try {
                await db.addCollections({
                    orders: { schema: orderSchemaV0 }
                });

                const observedCounts: number[] = [];
                const observedAmounts: number[][] = [];
                const sub = db.orders.find({
                    selector: { status: 'open' },
                    sort: [{ updatedAt: 'asc' }]
                }).$.subscribe((docs) => {
                    observedCounts.push(docs.length);
                    observedAmounts.push(docs.map((d) => d.amount));
                });

                await db.orders.insert({
                    id: 'ord-1',
                    customerName: 'Carlos',
                    amount: 1200,
                    status: 'open',
                    updatedAt: 100
                });
                await db.orders.insert({
                    id: 'ord-2',
                    customerName: 'Elena',
                    amount: 800,
                    status: 'open',
                    updatedAt: 200
                });

                const doc1 = await db.orders.findOne('ord-1').exec();
                assert.ok(doc1);
                await doc1.incrementalPatch({ amount: 1500, updatedAt: 150 });

                const doc2 = await db.orders.findOne('ord-2').exec();
                assert.ok(doc2);
                await doc2.remove();

                const remaining = await db.orders.find().exec();
                assert.strictEqual(remaining.length, 1);
                assert.strictEqual(remaining[0].id, 'ord-1');
                assert.strictEqual(remaining[0].amount, 1500);

                // Reactive observable saw initial, inserts, patch, and removal
                assert.ok(observedCounts.includes(2));
                assert.strictEqual(observedCounts[observedCounts.length - 1], 1);
                assert.deepStrictEqual(observedAmounts[observedAmounts.length - 1], [1500]);

                sub.unsubscribe();
            } finally {
                await db.remove();
            }
        });
    });

    describe('Dexie persistence, multi-collection, and schema migration across restart', () => {
        it('persists documents across database restart and supports >13 collections on Dexie', async function () {
            this.timeout(20 * 1000);
            const dbName = 'cla_dexie_persist_' + randomToken(8);
            const storage = createDexieTestStorage();

            const db1 = await createRxDatabase({
                name: dbName,
                storage,
                multiInstance: false,
                ignoreDuplicate: true
            });

            await db1.addCollections(buildCollectionsMap(16));
            assert.strictEqual(Object.keys(db1.collections).length, 16);

            await db1.collections['col_1'].insert({
                id: 'sale-1',
                customerName: 'Rosa',
                amount: 2400,
                status: 'credit',
                updatedAt: 1000
            });
            await db1.collections['col_16'].insert({
                id: 'sale-16',
                customerName: 'Pedro',
                amount: 3100,
                status: 'paid',
                updatedAt: 2000
            });

            // Simulate application restart: close without removing underlying IndexedDB data
            await db1.close();

            const db2 = await createRxDatabase({
                name: dbName,
                storage: createDexieTestStorage(),
                multiInstance: false,
                ignoreDuplicate: true
            });

            try {
                await db2.addCollections(buildCollectionsMap(16));
                const persisted1 = await db2.collections['col_1'].findOne('sale-1').exec();
                const persisted16 = await db2.collections['col_16'].findOne('sale-16').exec();

                assert.ok(persisted1);
                assert.ok(persisted16);
                assert.strictEqual(persisted1.customerName, 'Rosa');
                assert.strictEqual(persisted1.amount, 2400);
                assert.strictEqual(persisted16.customerName, 'Pedro');
                assert.strictEqual(persisted16.amount, 3100);
            } finally {
                await db2.remove();
            }
        });

        it('migrates persisted Dexie documents from schema v0 to v1', async function () {
            this.timeout(20 * 1000);
            const dbName = 'cla_dexie_mig_' + randomToken(8);

            const dbV0 = await createRxDatabase({
                name: dbName,
                storage: createDexieTestStorage(),
                multiInstance: false,
                ignoreDuplicate: true
            });
            await dbV0.addCollections({
                orders: { schema: orderSchemaV0 }
            });
            await dbV0.orders.insert({
                id: 'mig-1',
                customerName: 'Sofia',
                amount: 4500,
                status: 'credit',
                updatedAt: 500
            });
            await dbV0.close();

            const dbV1 = await createRxDatabase({
                name: dbName,
                storage: createDexieTestStorage(),
                multiInstance: false,
                ignoreDuplicate: true
            });

            try {
                await dbV1.addCollections({
                    orders: {
                        schema: orderSchemaV1,
                        migrationStrategies: {
                            1: (oldDoc: OrderDocType): OrderDocV1Type => ({
                                ...oldDoc,
                                currency: 'MXN'
                            })
                        }
                    }
                });

                const migrated = await dbV1.orders.findOne('mig-1').exec();
                assert.ok(migrated);
                assert.strictEqual(migrated.customerName, 'Sofia');
                assert.strictEqual(migrated.amount, 4500);
                assert.strictEqual(migrated.currency, 'MXN');
            } finally {
                await dbV1.remove();
            }
        });
    });

    describe('bidirectional replication and conflict handling', () => {
        it('synchronizes offline changes bidirectionally and resolves conflicts deterministically', async function () {
            this.timeout(20 * 1000);

            const remoteStore = new Map<string, WithDeleted<OrderDocType>>();
            remoteStore.set('ord-remote', {
                id: 'ord-remote',
                customerName: 'Server Customer',
                amount: 990,
                status: 'synced',
                updatedAt: 100,
                _deleted: false
            });
            remoteStore.set('ord-conflict', {
                id: 'ord-conflict',
                customerName: 'Shared Customer',
                amount: 1000,
                status: 'open',
                updatedAt: 100,
                _deleted: false
            });

            let conflictCalls = 0;
            const customConflictHandler: RxConflictHandler<OrderDocType> = {
                isEqual(a, b) {
                    return (
                        a.amount === b.amount &&
                        a.status === b.status &&
                        a.updatedAt === b.updatedAt &&
                        a.customerName === b.customerName &&
                        a._deleted === b._deleted
                    );
                },
                resolve(input) {
                    conflictCalls++;
                    // Deterministic merge: keep higher updatedAt, sum delta if equal
                    const merged: WithDeleted<OrderDocType> =
                        input.newDocumentState.updatedAt >= input.realMasterState.updatedAt
                            ? {
                                ...input.newDocumentState,
                                status: 'resolved-local-wins'
                            }
                            : {
                                ...input.realMasterState,
                                status: 'resolved-master-wins'
                            };
                    return Promise.resolve(merged);
                }
            };

            const db = await createRxDatabase({
                name: 'cla_repl_' + randomToken(8),
                storage: createMemoryTestStorage(),
                ignoreDuplicate: true
            });

            try {
                await db.addCollections({
                    orders: {
                        schema: orderSchemaV0,
                        conflictHandler: customConflictHandler
                    }
                });

                // Create an offline local document before initial sync
                await db.orders.insert({
                    id: 'ord-local-offline',
                    customerName: 'Field Client',
                    amount: 1750,
                    status: 'open',
                    updatedAt: 200
                });

                const pullHandler = (
                    checkpoint: SyncCheckpoint | undefined,
                    batchSize: number
                ) => {
                    const sorted = Array.from(remoteStore.values()).sort((a, b) =>
                        a.updatedAt === b.updatedAt
                            ? a.id.localeCompare(b.id)
                            : a.updatedAt - b.updatedAt
                    );
                    const filtered = sorted.filter((doc) => {
                        if (!checkpoint) {
                            return true;
                        }
                        if (doc.updatedAt > checkpoint.updatedAt) {
                            return true;
                        }
                        return doc.updatedAt === checkpoint.updatedAt && doc.id > checkpoint.id;
                    }).slice(0, batchSize);

                    const last = filtered[filtered.length - 1];
                    return Promise.resolve({
                        documents: filtered,
                        checkpoint: last
                            ? { id: last.id, updatedAt: last.updatedAt }
                            : checkpoint
                    });
                };

                const pushHandler = (
                    rows: RxReplicationWriteToMasterRow<OrderDocType>[]
                ) => {
                    const conflicts: WithDeleted<OrderDocType>[] = [];
                    for (const row of rows) {
                        const existing = remoteStore.get(row.newDocumentState.id);
                        if (
                            existing &&
                            (!row.assumedMasterState ||
                                existing.updatedAt !== row.assumedMasterState.updatedAt ||
                                existing.amount !== row.assumedMasterState.amount)
                        ) {
                            conflicts.push(existing);
                        } else {
                            remoteStore.set(row.newDocumentState.id, row.newDocumentState);
                        }
                    }
                    return Promise.resolve(conflicts);
                };

                const replicationState = replicateRxCollection<OrderDocType, SyncCheckpoint>({
                    collection: db.orders,
                    replicationIdentifier: 'cla-db-bidir-test',
                    live: true,
                    pull: {
                        handler: pullHandler,
                        batchSize: 10
                    },
                    push: {
                        handler: pushHandler,
                        batchSize: 10
                    }
                });

                const replicationErrors: any[] = [];
                replicationState.error$.subscribe((err) => replicationErrors.push(err));
                const emittedConflicts: any[] = [];
                replicationState.conflict$.subscribe((c) => emittedConflicts.push(c));

                await replicationState.awaitInitialReplication();
                await replicationState.awaitInSync();

                // Verify pull brought remote docs and push sent local offline doc
                const pulledRemote = await db.orders.findOne('ord-remote').exec();
                assert.ok(pulledRemote);
                assert.strictEqual(pulledRemote.amount, 990);
                assert.ok(remoteStore.has('ord-local-offline'));
                assert.strictEqual(remoteStore.get('ord-local-offline')?.amount, 1750);

                // Go offline (pause replication), then edit the same document on both sides
                replicationState.pause();

                // 1) Remote master advances while client is offline
                remoteStore.set('ord-conflict', {
                    id: 'ord-conflict',
                    customerName: 'Shared Customer',
                    amount: 1100,
                    status: 'remote-edit',
                    updatedAt: 300,
                    _deleted: false
                });
                // 2) Local client edits offline based on stale state (updatedAt=500, amount=1250)
                const localConflictDoc = await db.orders.findOne('ord-conflict').exec();
                assert.ok(localConflictDoc);
                await localConflictDoc.incrementalPatch({
                    amount: 1250,
                    status: 'local-edit',
                    updatedAt: 500
                });

                // Reconnect and sync: triggers conflict -> customConflictHandler -> converged state
                replicationState.start();
                replicationState.reSync();
                await replicationState.awaitInSync();

                assert.strictEqual(replicationErrors.length, 0);
                assert.ok(conflictCalls >= 1, 'Expected custom conflict handler to be invoked');
                assert.ok(emittedConflicts.length >= 1, 'Expected conflict$ stream to emit resolved conflict');

                const convergedLocal = await db.orders.findOne('ord-conflict').exec();
                const convergedRemote = remoteStore.get('ord-conflict');
                assert.ok(convergedLocal);
                assert.ok(convergedRemote);
                assert.strictEqual(convergedLocal.amount, 1250);
                assert.strictEqual(convergedLocal.status, 'resolved-local-wins');
                assert.strictEqual(convergedRemote.amount, 1250);
                assert.strictEqual(convergedRemote.status, 'resolved-local-wins');

                await replicationState.cancel();
            } finally {
                await db.remove();
            }
        });
    });
});
