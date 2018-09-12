import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import BroadcastChannel from 'broadcast-channel';
import convertHrtime from 'convert-hrtime';
import * as schemas from './../helper/schemas';
import * as schemaObjects from './../helper/schema-objects';

import RxDB from '../../dist/lib/index';
import * as util from '../../dist/lib/util';
RxDB.plugin(require('pouchdb-adapter-memory'));

const elapsedTime = before => {
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
const benchmark = {
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



describe('performance.test.js', () => {
    it('clear broadcast-channel tmp-folder', async () => {
        await BroadcastChannel.clearNodeFolder();
    });
    it('wait a bit for jit', async () => {
        await AsyncTestUtil.wait(2000);
    });
    it('spawnDatabases', async () => {
        // create databases with some collections each
        const dbs = [];

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

        assert.equal(allDocs.length, benchmark.findDocuments.amount);
        benchmark.findDocuments.total = elapsed;
        benchmark.findDocuments.perDocument = elapsed / benchmark.findDocuments.amount;

        await db2.destroy();
        await AsyncTestUtil.wait(1000);
    });


    it('show results:', () => {
        console.log(JSON.stringify(benchmark, null, 2));
    });
});
