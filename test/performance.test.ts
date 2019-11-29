/* eslint require-atomic-updates: 0 */

import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import BroadcastChannel from 'broadcast-channel';
import convertHrtime from 'convert-hrtime';
import * as schemas from './helper/schemas';
import * as schemaObjects from './helper/schema-objects';

import * as util from '../dist/lib/util';

// we do a custom build without dev-plugins,
// like you would use in production
import RxDB from '../plugins/core';
RxDB.plugin(require('pouchdb-adapter-memory'));
import NoValidate from '../plugins/no-validate';
RxDB.plugin(NoValidate);
import KeyCompression from '../plugins/key-compression';
import { mergeMap } from 'rxjs/operators';
RxDB.plugin(KeyCompression);

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

// each test can take about 10seconds
const benchmark: any = {
    spawnDatabases: {
        amount: 1000,
        collections: 5,
        total: null,
        perInstance: null
    },
    insertDocuments: {
        blocks: 2000,
        blockSize: 5,
        total: null,
        perBlock: null
    },
    findDocuments: {
        amount: 10000,
        total: null,
        perDocument: null
    },
    migrateDocuments: {
        amount: 1000,
        total: null
    },
    writeWhileSubscribe: {
        amount: 1000,
        total: null
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



describe('performance.test.js', function () {
    this.timeout(90 * 1000);
    it('clear broadcast-channel tmp-folder', async () => {
        await BroadcastChannel.clearNodeFolder();
    });
    it('wait a bit for jit', async () => {
        await AsyncTestUtil.wait(2000);
    });
    it('spawnDatabases', async () => {
        // create databases with some collections each
        const dbs: any[] = [];

        const startTime = nowTime();
        for (let i = 0; i < benchmark.spawnDatabases.amount; i++) {
            const db = await RxDB.create({
                name: util.randomCouchString(10),
                queryChangeDetection: true,
                adapter: 'memory'
            });

            await Promise.all(
                new Array(benchmark.spawnDatabases.collections)
                    .fill(0)
                    .map(() => {
                        return db.collection({
                            name: 'human' + util.randomCouchString(10),
                            schema: schemas.averageSchema(),
                            statics: ormMethods
                        });
                    })
            );
        }
        const elapsed = elapsedTime(startTime);
        benchmark.spawnDatabases.total = elapsed;
        benchmark.spawnDatabases.perInstance = elapsed / benchmark.spawnDatabases.amount;

        await Promise.all(dbs.map(db => db.destroy()));
        await AsyncTestUtil.wait(1000);
    });
    it('insertDocuments', async () => {
        const db = await RxDB.create({
            name: util.randomCouchString(10),
            queryChangeDetection: true,
            adapter: 'memory'
        });
        const col = await db.collection({
            name: 'human',
            schema: schemas.averageSchema(),
            methods: ormMethods
        });
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
        benchmark.insertDocuments.total = elapsed;
        benchmark.insertDocuments.perBlock = elapsed / benchmark.insertDocuments.blocks;

        await db.destroy();
        await AsyncTestUtil.wait(1000);
    });

    it('findDocuments', async () => {
        const dbName = util.randomCouchString(10);
        const schema = schemas.averageSchema();
        const db = await RxDB.create({
            name: dbName,
            queryChangeDetection: true,
            adapter: 'memory'
        });
        const col = await db.collection({
            name: 'human',
            schema,
            methods: ormMethods
        });

        await Promise.all(
            new Array(benchmark.findDocuments.amount)
                .fill(0)
                .map(() => schemaObjects.averageSchema())
                .map(data => col.insert(data))
        );
        await db.destroy();

        const db2 = await RxDB.create({
            name: dbName,
            adapter: 'memory',
            queryChangeDetection: true,
            ignoreDuplicate: true
        });
        const col2 = await db2.collection({
            name: 'human',
            schema,
            methods: ormMethods
        });


        const startTime = nowTime();
        const allDocs = await col2.find().exec();
        const elapsed = elapsedTime(startTime);

        assert.strictEqual(allDocs.length, benchmark.findDocuments.amount);
        benchmark.findDocuments.total = elapsed;
        benchmark.findDocuments.perDocument = elapsed / benchmark.findDocuments.amount;

        await db2.destroy();
        await AsyncTestUtil.wait(1000);
    });

    it('migrateDocuments', async () => {
        const name = util.randomCouchString(10);
        const db = await RxDB.create({
            name,
            queryChangeDetection: true,
            adapter: 'memory'
        });
        const col = await db.collection({
            name: 'human',
            schema: schemas.averageSchema()
        });

        // insert into old collection
        await Promise.all(
            new Array(benchmark.migrateDocuments.amount)
                .fill(0)
                .map(() => schemaObjects.averageSchema())
                .map(docData => col.insert(docData))
        );

        const db2 = await RxDB.create({
            name,
            queryChangeDetection: true,
            adapter: 'memory',
            ignoreDuplicate: true
        });
        const newSchema = schemas.averageSchema();
        newSchema.version = 1;
        newSchema.properties.var2.type = 'string';
        const col2 = await db2.collection({
            name: 'human',
            schema: newSchema,
            migrationStrategies: {
                1: oldDoc => {
                    oldDoc.var2 = oldDoc.var2 + '';
                    return oldDoc;
                }
            },
            autoMigrate: false
        });

        const startTime = nowTime();

        await col2.migratePromise();
        const elapsed = elapsedTime(startTime);
        benchmark.migrateDocuments.total = elapsed;

        await db.destroy();
        await db2.destroy();
        await AsyncTestUtil.wait(1000);
    });
    it('writeWhileSubscribe', async () => {
        const name = util.randomCouchString(10);
        const db = await RxDB.create({
            name,
            queryChangeDetection: true,
            adapter: 'memory'
        });
        const col = await db.collection({
            name: 'human',
            schema: schemas.averageSchema()
        });

        const query = col.find({
            var2: {
                $gt: 1
            }
        }).sort('var1');


        let t = 0;
        let lastResult;
        const startTime = nowTime();

        await new Promise(res => {
            const obs$ = query.$.pipe(
                mergeMap(async (result) => {
                    if (t <= benchmark.writeWhileSubscribe.amount) {
                        t++;
                        await col.insert(schemaObjects.averageSchema());
                    } else {
                        sub.unsubscribe();
                        res();
                    }
                    return result;
                })
            );
            const sub = obs$.subscribe(result => {
                lastResult = result;
            });
        });

        const elapsed = elapsedTime(startTime);
        benchmark.writeWhileSubscribe.total = elapsed;
        assert.strictEqual(lastResult.length, benchmark.writeWhileSubscribe.amount);
        db.destroy();
    });

    it('show results:', () => {
        console.log(JSON.stringify(benchmark, null, 2));
    });
});
