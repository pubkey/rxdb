import {
    createRxDatabase,
    randomToken,
    requestIdlePromise,
    RxCollection,
    uncacheRxQuery,
    addRxPlugin
} from '../plugins/core/index.mjs';
import {
    schemaObjects,
    schemas,
    AverageSchemaDocumentType
} from '../plugins/test-utils/index.mjs';
import config from './unit/config.ts';
import { wait } from 'async-test-util';
import { RxDBCleanupPlugin } from '../plugins/cleanup/index.mjs';



/**
 * Runs some performance tests.
 * Mostly used to compare the performance of the different RxStorage implementations.
 * Run via 'npm run test:memory-leak:node' and change 'memory' for other storage names.
*/
describe('memory-leak.test.ts', () => {
    addRxPlugin(RxDBCleanupPlugin);
    it('init storage', async () => {
        if (config.storage.init) {
            await config.storage.init();
        }
    });
    // it('should not have enabled dev-mode which would affect the performance', () => {
    //     assert.strictEqual(
    //         overwritable.isDevMode(),
    //         false
    //     );
    // });
    it('run the memory leak test', async function () {
        this.timeout(100000 * 1000);



        const dbName = 'test-db-memory-leak-' + randomToken(10);
        const db = await createRxDatabase({
            name: dbName,
            multiInstance: false,
            storage: config.storage.getStorage()
        });
        const collections = await db.addCollections({
            a: {
                schema: schemas.averageSchema(),
                cacheReplacementPolicy: (col, queryCache) => {
                    const queriesInCache = Array.from(queryCache._map.values());
                    // console.log('query cache running ' + queriesInCache.length);
                    queriesInCache.forEach(rxQuery => uncacheRxQuery(queryCache, rxQuery));
                }
            }
        });
        const collection: RxCollection<AverageSchemaDocumentType> = collections.a;
        await collection.bulkInsert(
            new Array(1000).fill(0).map(() => schemaObjects.averageSchemaData())
        );

        let t = 0;
        while (true) {
            t++;
            await awaitBetweenTest();
            // console.log('------------ loooop ');
            const docs = 10;

            // insert some
            await collection.bulkInsert(
                new Array(docs).fill(0).map(() => schemaObjects.averageSchemaData())
            );

            // delete some
            await collection.find({ limit: docs }).remove();

            // query some
            await collection.find({ limit: docs, selector: { id: { $ne: randomToken(10) } } }).exec();

            // query many
            await collection.find({ limit: 900, selector: { id: { $ne: randomToken(10) } } }).exec();




            // log memory usage
            if (t % 100 === 0) {
                await collection.cleanup(0);

                if (global.gc) {
                    global.gc();
                } else {
                    console.log('Garbage collection unavailable.  Pass --expose-gc '
                        + 'when launching node to enable forced garbage collection.');
                }
                console.log('total docs: ' + await collection.count().exec());
                console.dir(process.memoryUsage());
            }


        }


    });
});


/*

{
    "rss": 133959680,
    "heapTotal": 66990080,
    "heapUsed": 28307240,
    "external": 2448695,
    "arrayBuffers": 16619
}







*/



async function awaitBetweenTest() {
    await requestIdlePromise();
    await wait(100);
    await requestIdlePromise();
    await requestIdlePromise();
}
