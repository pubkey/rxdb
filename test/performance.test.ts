/* eslint require-atomic-updates: 0 */

import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import { clearNodeFolder } from 'broadcast-channel';
import convertHrtime from 'convert-hrtime';
import * as schemas from './helper/schemas';
import * as path from 'path';
import * as schemaObjects from './helper/schema-objects';
import { mergeMap } from 'rxjs/operators';

// we do a custom build without dev-plugins,
// like you would use in production
import {
    createRxDatabase,
    addRxPlugin,
    randomCouchString,
    dbCount,
    RxDatabase,
    RxStorage
} from '../';
import {
    addPouchPlugin,
    getRxStoragePouch
} from '../plugins/pouchdb';
import {
    getRxStorageLoki, RxStorageLokiStatics
} from '../plugins/lokijs';

import { RxDBMigrationPlugin } from '../plugins/migration';
import { getRxStorageWorker } from '../plugins/worker';
addRxPlugin(RxDBMigrationPlugin);

declare type Storage = {
    readonly getStorage: () => RxStorage<any, any>;
    readonly getPersistendStorage: () => RxStorage<any, any>;
    readonly hasAttachments: boolean;
}

const STORAGE_KEY = process.env.STORAGE as any;
let STORAGE: Storage;
switch (STORAGE_KEY) {
    case 'pouchdb':
        STORAGE = {
            getStorage() {
                addPouchPlugin(require('pouchdb-adapter-memory'));
                return getRxStoragePouch('memory');
            },
            getPersistendStorage() {
                addPouchPlugin(require('pouchdb-adapter-leveldb'));
                return getRxStoragePouch('leveldb');
            },
            hasAttachments: true
        }
        break;
    case 'lokijs':
        STORAGE = {
            getStorage() {
                return getRxStorageLoki();
            },
            getPersistendStorage() {
                const lfsa = require('lokijs/src/loki-fs-structured-adapter.js');
                const adapter = new lfsa();
                return getRxStorageLoki({
                    adapter
                });
            },
            hasAttachments: true
        }
        break;
    case 'lokijs-worker':
        const lokiWorkerPath = require('path').join(
            '../../../../test_tmp/helper',
            'lokijs-worker.js'
        );
        const lokiPersistendWorkerPath = require('path').join(
            '../../../../test_tmp/helper',
            'lokijs-worker.js'
        );
        console.log('lokiWorkerPath: ' + lokiWorkerPath);
        console.log('lokiPersistendWorkerPath: ' + lokiPersistendWorkerPath);
        STORAGE = {
            getStorage() {
                return getRxStorageWorker(
                    {
                        statics: RxStorageLokiStatics,
                        workerInput: lokiWorkerPath
                    }
                );
            },
            getPersistendStorage() {
                return getRxStorageWorker(
                    {
                        statics: RxStorageLokiStatics,
                        workerInput: lokiPersistendWorkerPath
                    }
                );
            },
            hasAttachments: true
        }
        break;
    default:
        throw new Error('could not use STORAGE_KEY ' + STORAGE_KEY)
}

const elapsedTime = (before: any) => {
    try {
        return convertHrtime(process.hrtime(before)).milliseconds;
    } catch (err) {
        return performance.now() - before;
    }
};
const nowTime = () => {
    try {
        return process.hrtime();
    } catch (err) {
        return performance.now();
    }
};

async function afterTest() {
    await AsyncTestUtil.wait(waitTimeBetween / 2);

    // ensure databases cleaned up
    const count = dbCount();
    assert.strictEqual(count, 0);

    await global.gc();
    await AsyncTestUtil.wait(waitTimeBetween / 2);
}


// each test can take about 10seconds
const benchmark: any = {
    storage: STORAGE_KEY,
    spawnDatabases: {
        amount: 1000,
        collections: 5,
        total: 0,
        perInstance: 0
    },
    insertDocuments: {
        blocks: 2000,
        blockSize: 5,
        total: 0,
        perBlock: 0
    },
    findDocuments: {
        amount: 10000,
        total: 0,
        perDocument: 0
    },
    migrateDocuments: {
        amount: 1000,
        total: 0
    },
    writeWhileSubscribe: {
        amount: 1000,
        total: 0
    }
};


const ormMethods = {
    foo() {
        return 'bar';
    },
    foobar() {
        return 'barbar';
    },
    foobar2() {
        return 'barbar';
    }
};

// increase this to measure minimal optimisations
const runs = 1;
const waitTimeBetween = 1000;

async function clearStuff() {
    await clearNodeFolder();
    await global.gc();
}

for (let r = 0; r < runs; r++) {

    describe('performance.test.js', function () {
        this.timeout(90 * 1000);
        it('clear stuff', async () => {
            await clearStuff();
        });
        this.beforeEach(async () => {
            await global.gc();
            // wait a bit for jit
            await AsyncTestUtil.wait(500);
        });
        it('spawnDatabases', async () => {
            // create databases with some collections each
            const dbs: RxDatabase[] = [];

            /**
             * Reuse the same instance of RxStorage
             * to measure database creation time,
             * not storage instantiation.
             */
            const useStorage = STORAGE.getStorage();

            const startTime = nowTime();
            for (let i = 0; i < benchmark.spawnDatabases.amount; i++) {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    eventReduce: true,
                    /**
                     * A RxStorage implementation (like LokiJS)
                     * might need a full leader election cycle to be useable.
                     * So we disable multiInstance here because it would make no sense
                     * to measure the leader election time instead of the database
                     * creation time.
                     */
                    multiInstance: false,
                    storage: useStorage
                });
                dbs.push(db);

                const collectionData: any = {};
                new Array(benchmark.spawnDatabases.collections)
                    .fill(0)
                    .forEach(() => {
                        const name = 'human' + randomCouchString(10);
                        collectionData[name] = {
                            schema: schemas.averageSchema(),
                            statics: ormMethods
                        };
                    });
                await db.addCollections(collectionData);
            }
            const elapsed = elapsedTime(startTime);
            benchmark.spawnDatabases.total = benchmark.spawnDatabases.total + elapsed;
            benchmark.spawnDatabases.perInstance = elapsed / benchmark.spawnDatabases.amount;

            await Promise.all(dbs.map(db => db.destroy()));
            await afterTest();
        });
        it('clear stuff', async () => {
            await clearStuff();
        });

        it('insertDocuments', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                eventReduce: true,
                multiInstance: false,
                storage: STORAGE.getStorage()
            });
            const cols = await db.addCollections({
                human: {
                    schema: schemas.averageSchema(),
                    methods: ormMethods
                }
            });
            const col = cols.human;
            let lastDoc;

            const docsData = new Array(benchmark.insertDocuments.blocks * benchmark.insertDocuments.blockSize)
                .fill(0)
                .map(() => schemaObjects.averageSchema());

            const startTime = nowTime();
            for (let i = 0; i < benchmark.insertDocuments.blocks; i++) {
                await Promise.all(
                    new Array(benchmark.insertDocuments.blockSize)
                        .fill(0)
                        .map(async () => {
                            const doc = await col.insert(docsData.pop());
                            lastDoc = doc;
                        })
                );
            }
            const elapsed = elapsedTime(startTime);
            assert.ok(lastDoc);
            benchmark.insertDocuments.total = benchmark.insertDocuments.total + elapsed;
            benchmark.insertDocuments.perBlock = elapsed / benchmark.insertDocuments.blocks;

            await db.destroy();
            await afterTest();
        });

        it('findDocuments', async () => {
            const dbName = path.join(
                __dirname,
                '../',
                'test_tmp',
                randomCouchString(10)
            );

            const schema = schemas.averageSchema();

            const db = await createRxDatabase({
                name: dbName,
                eventReduce: true,
                multiInstance: true,
                storage: STORAGE.getPersistendStorage()
            });
            const cols = await db.addCollections({
                human: {
                    schema,
                    methods: ormMethods
                }
            });
            const col = cols.human;

            await col.bulkInsert(
                new Array(benchmark.findDocuments.amount)
                    .fill(0)
                    .map(() => schemaObjects.averageSchema())
            );
            await db.destroy();

            const db2 = await createRxDatabase({
                name: dbName,
                storage: STORAGE.getPersistendStorage(),
                eventReduce: true,
                multiInstance: true,
                ignoreDuplicate: true
            });

            const cols2 = await db2.addCollections({
                human: {
                    schema,
                    methods: ormMethods
                }
            });
            const col2 = cols2.human;


            const startTime = nowTime();
            const allDocs = await col2.find().exec();
            const elapsed = elapsedTime(startTime);

            assert.strictEqual(allDocs.length, benchmark.findDocuments.amount);
            benchmark.findDocuments.total = benchmark.findDocuments.total + elapsed;
            benchmark.findDocuments.perDocument = elapsed / benchmark.findDocuments.amount;

            await db2.destroy();
            await afterTest();
        });

        it('migrateDocuments', async () => {
            const name = randomCouchString(10);
            const db = await createRxDatabase({
                name,
                eventReduce: true,
                storage: STORAGE.getStorage()
            });
            const cols = await db.addCollections({
                human: {
                    schema: schemas.averageSchema()
                }
            });
            const col = cols.human;

            // insert into old collection
            await Promise.all(
                new Array(benchmark.migrateDocuments.amount)
                    .fill(0)
                    .map(() => schemaObjects.averageSchema())
                    .map(docData => col.insert(docData))
            );

            const db2 = await createRxDatabase({
                name,
                eventReduce: true,
                storage: STORAGE.getStorage(),
                ignoreDuplicate: true
            });
            const newSchema = schemas.averageSchema();
            newSchema.version = 1;
            newSchema.properties.var2.type = 'string';
            const cols2 = await db2.addCollections({
                human: {
                    schema: newSchema,
                    migrationStrategies: {
                        1: (oldDoc: any) => {
                            oldDoc.var2 = oldDoc.var2 + '';
                            return oldDoc;
                        }
                    },
                    autoMigrate: false
                }
            });
            const col2 = cols2.human;

            const startTime = nowTime();

            await col2.migratePromise();
            const elapsed = elapsedTime(startTime);
            benchmark.migrateDocuments.total = benchmark.migrateDocuments.total + elapsed;

            await db.destroy();
            await db2.destroy();
            await afterTest();
        });
        it('writeWhileSubscribe', async () => {
            const name = randomCouchString(10);
            const db = await createRxDatabase({
                name,
                eventReduce: true,
                storage: STORAGE.getStorage()
            });
            const cols = await db.addCollections({
                human: {
                    schema: schemas.averageSchema()
                }
            });
            const col = cols.human;

            const query = col.find({
                selector: {
                    var2: {
                        $gt: 1
                    }
                },
                sort: [
                    { var1: 'asc' }
                ]
            });

            let t = 0;
            let lastResult: any[] = [];
            const startTime = nowTime();

            await new Promise(res => {
                const obs$ = query.$.pipe(
                    mergeMap(async (result) => {
                        if (t <= benchmark.writeWhileSubscribe.amount) {
                            t++;
                            await col.insert(schemaObjects.averageSchema());
                        } else {
                            // TODO why does this test fail when we directly unsubscribe?
                            // sub.unsubscribe();
                            res(null);
                        }
                        return result;
                    })
                );
                obs$.subscribe(result => {
                    lastResult = result;
                });
            });

            const elapsed = elapsedTime(startTime);

            await AsyncTestUtil.wait(500);

            benchmark.writeWhileSubscribe.total = benchmark.writeWhileSubscribe.total + elapsed;
            assert.strictEqual(lastResult.length, benchmark.writeWhileSubscribe.amount);
            await db.destroy();

            await afterTest();
        });

        it('show results:', async () => {
            await afterTest();
            console.log(JSON.stringify(benchmark, null, 2));
        });
    });
}
