import {
    createRxDatabase,
    randomToken,
    overwritable,
    requestIdlePromise,
    RxCollection
} from '../plugins/core/index.mjs';
import * as assert from 'assert';
import {
    schemaObjects,
    schemas,
    isFastMode,
    isDeno,
    AverageSchemaDocumentType
} from '../plugins/test-utils/index.mjs';
import config from './unit/config.ts';
import { wait } from 'async-test-util';
declare const Deno: any;

/**
 * Runs some performance tests.
 * Mostly used to compare the performance of the different RxStorage implementations.
 * Run via 'npm run test:performance:memory:node' and change 'memory' for other storage names.
 */
describe('performance.test.ts', () => {
    it('init storage', async () => {
        if (config.storage.init) {
            await config.storage.init();
        }
    });
    it('should not have enabled dev-mode which would affect the performance', () => {
        assert.strictEqual(
            overwritable.isDevMode(),
            false
        );
    });
    it('run the performance test', async function () {
        this.timeout(500 * 1000);
        const runs = isFastMode() ? 1 : 40;
        const perfStorage = config.storage.getPerformanceStorage();

        const totalTimes: { [k: string]: number[]; } = {};

        const collectionsAmount = 4;
        const docsAmount = 3000;
        const serialDocsAmount = 50;
        const parallelQueryAmount = 4;
        const insertBatches = 6;

        let runsDone = 0;
        while (runsDone < runs) {
            console.log('runsDone: ' + runsDone + ' of ' + runs);
            runsDone++;

            let time = performance.now();
            const updateTime = (flag?: string) => {
                if (!flag) {
                    time = performance.now();
                    return;
                }
                const diff = performance.now() - time;
                if (!totalTimes[flag]) {
                    totalTimes[flag] = [diff];
                } else {
                    totalTimes[flag].push(diff);
                }
                time = performance.now();
            };

            await awaitBetweenTest();
            updateTime();

            // create database
            const dbName = 'test-db-performance-' + randomToken(10);
            const schema = schemas.averageSchema();
            let collection: RxCollection<AverageSchemaDocumentType>;
            async function createDbWithCollections() {
                if (collection) {
                    await collection.database.close();
                }
                const db = await createRxDatabase({
                    name: dbName,
                    eventReduce: true,
                    /**
                     * A RxStorage implementation
                     * might need a full leader election cycle to be usable.
                     * So we disable multiInstance here because it would make no sense
                     * to measure the leader election time instead of the database
                     * creation time.
                    */
                    multiInstance: false,
                    storage: perfStorage.storage
                });

                // create collections
                const collectionData: any = {};
                const collectionNames: string[] = [];
                new Array(collectionsAmount)
                    .fill(0)
                    .forEach((_v, idx) => {
                        const name = dbName + '_col_' + idx;
                        collectionNames.push(name);
                        collectionData[name] = {
                            schema,
                            statics: {}
                        };
                    });
                const firstCollectionName: string = collectionNames[0];
                const collections = await db.addCollections(collectionData);
                /**
                 * Many storages have a lazy initialization.
                 * So it makes no sense to measure the time of database/collection creation.
                 * Insert we do a single insert an measure the time to the first insert.
                 */
                await collections[collectionNames[1]].insert(schemaObjects.averageSchemaData());
                return collections[firstCollectionName];
            }
            collection = await createDbWithCollections();
            updateTime('time-to-first-insert');
            await awaitBetweenTest();

            // insert documents (in batches)
            const docIds: string[] = [];
            const docsPerBatch = docsAmount / insertBatches;
            for (let i = 0; i < insertBatches; i++) {
                const docsData = new Array(docsPerBatch)
                    .fill(0)
                    .map((_v, idx) => {
                        const data = schemaObjects.averageSchemaData({
                            var1: (idx % 2) + '',
                            var2: idx % parallelQueryAmount
                        });
                        docIds.push(data.id);
                        return data;
                    });
                updateTime();
                await collection.bulkInsert(docsData);
                updateTime('insert-documents-' + docsPerBatch);
                await awaitBetweenTest();
            }


            // refresh db to ensure we do not run on caches
            collection = await createDbWithCollections();
            await awaitBetweenTest();

            /**
             * Bulk Find by id
             */
            updateTime();
            const idsResult = await collection.findByIds(docIds).exec();
            updateTime('find-by-ids-' + docsAmount);
            assert.strictEqual(Array.from(idsResult.keys()).length, docsAmount, 'find-by-id amount');
            await awaitBetweenTest();

            /**
             * Serial inserts
             */
            updateTime();
            let c = 0;
            const serialIds: string[] = [];
            while (c < serialDocsAmount) {
                c++;
                const data = schemaObjects.averageSchemaData({
                    var2: 1000
                });
                serialIds.push(data.id);
                await collection.insert(data);
            }
            updateTime('serial-inserts-' + serialDocsAmount);

            // refresh db to ensure we do not run on caches
            collection = await createDbWithCollections();
            await awaitBetweenTest();

            /**
             * Serial find-by-id
             */
            updateTime();
            for (const id of serialIds) {
                await collection.findByIds([id]).exec();
            }
            updateTime('serial-find-by-id-' + serialDocsAmount);
            await awaitBetweenTest();

            // find by query
            updateTime();
            const query = collection.find({
                selector: {},
                sort: [
                    { var2: 'asc' },
                    { var1: 'asc' }
                ]
            });
            const queryResult = await query.exec();
            updateTime('find-by-query');
            assert.strictEqual(queryResult.length, docsAmount + serialDocsAmount, 'find-by-query');


            // refresh db to ensure we do not run on caches
            collection = await createDbWithCollections();
            await awaitBetweenTest();

            // find by multiple queries in parallel
            updateTime();
            const parallelResult = await Promise.all(
                new Array(parallelQueryAmount).fill(0).map((_v, idx) => {
                    const subQuery = collection.find({
                        selector: {
                            var2: idx
                        }
                    });
                    return subQuery.exec();
                })
            );
            updateTime('find-by-query-parallel-' + parallelQueryAmount);
            let parallelSum = 0;
            parallelResult.forEach(r => parallelSum = parallelSum + r.length);
            assert.strictEqual(parallelSum, docsAmount, 'parallelSum');
            await awaitBetweenTest();

            // run count query
            updateTime();
            let t = 0;
            while (t < parallelQueryAmount) {
                const countQuery = collection.count({
                    selector: {
                        var2: {
                            $eq: t
                        }
                    }
                });
                const countQueryResult = await countQuery.exec();
                assert.ok(countQueryResult >= ((docsAmount / insertBatches) - 5), 'count A ' + countQueryResult);
                assert.ok(countQueryResult < (docsAmount * 0.8), 'count B ' + countQueryResult);
                t++;
            }
            updateTime('4x-count');
            await awaitBetweenTest();

            // test property access time
            updateTime();
            let sum = 0;
            for (let i = 0; i < queryResult.length; i++) {
                const doc = queryResult[i];

                // access the same property exactly 2 times
                sum += doc.deep.deeper.deepNr;
                sum += doc.deep.deeper.deepNr;
            }
            updateTime('property-access');
            assert.ok(sum > 10);


            await collection.database.remove();
        }


        const timeToLog: any = {
            description: perfStorage.description,
            platform: config.storage.name,
            collectionsAmount,
            docsAmount
        };
        Object.entries(totalTimes).forEach(([key, times]) => {
            timeToLog[key] = roundToThree(averageOfTimeValues(times, 95));
        });

        console.log('Performance test for ' + perfStorage.description);
        console.log(JSON.stringify(timeToLog, null, 4));
        // process.exit();
    });
    /**
     * Some runtimes do not automatically exit for whatever reason.
     */
    it('exit the process', () => {
        if (isDeno) {
            Deno.exit(0);
        }
    });
});


export function averageOfTimeValues(
    times: number[],
    /**
     * To better account for anomalies
     * during time measurements,
     * we strip the highest x percent.
     */
    striphighestXPercent: number
): number {
    times = times.sort((a, b) => a - b);
    const stripAmount = Math.floor(times.length * (striphighestXPercent * 0.01));
    const useNumbers = times.slice(0, times.length - stripAmount);
    let total = 0;
    useNumbers.forEach(nr => total = total + nr);
    return total / useNumbers.length;
}

function roundToThree(num: number) {
    return Math.round(num * 1000) / 1000;
}

async function awaitBetweenTest() {
    await requestIdlePromise();
    await wait(100);
    await requestIdlePromise();
    await requestIdlePromise();
}
