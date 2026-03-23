import assert from 'assert';
import {
    createRxDatabase,
    randomToken,
    requestIdlePromise,
    RxCollection,
    RxStorage
} from '../../index.ts';
import { wait } from 'async-test-util';
import { averageSchemaData, AverageSchemaDocumentType } from './schema-objects.ts';
import { averageSchema } from './schemas.ts';

export type PerformanceTestConfig = {
    /**
     * How many times the test loop is run.
     * More runs give more stable averages but take longer.
     * @default 40
     */
    runs?: number;
    /**
     * Number of collections created per database.
     * @default 4
     */
    collectionsAmount?: number;
    /**
     * Number of documents inserted in bulk per run.
     * @default 3000
     */
    docsAmount?: number;
    /**
     * Number of documents inserted one-by-one (serial) per run.
     * @default 50
     */
    serialDocsAmount?: number;
    /**
     * Number of parallel queries executed per run.
     * @default 4
     */
    parallelQueryAmount?: number;
    /**
     * Number of batches used when doing bulk inserts.
     * @default 6
     */
    insertBatches?: number;
    /**
     * Milliseconds to wait between test operations.
     * Set to 0 to disable waiting (useful for smoke tests).
     * @default 100
     */
    waitBetweenTests?: number;
    /**
     * Whether to log progress and results to the console.
     * @default true
     */
    log?: boolean;
    /**
     * If set, the database will be created with encryption
     * and the schema will mark applicable fields as encrypted.
     */
    password?: any;
    /**
     * Whether to run the bulk find-by-ids test.
     * @default true
     */
    testBulkFindByIds?: boolean;
    /**
     * Whether to run the serial find-by-id test.
     * @default true
     */
    testSerialFindById?: boolean;
    /**
     * Whether to run the find-by-query test.
     * @default true
     */
    testFindByQuery?: boolean;
    /**
     * Whether to run the find-by-query-parallel test.
     * @default true
     */
    testFindByQueryParallel?: boolean;
    /**
     * Whether to run the count query test.
     * @default true
     */
    testCount?: boolean;
    /**
     * Whether to run the property access test.
     * Requires testFindByQuery to also be enabled.
     * @default true
     */
    testPropertyAccess?: boolean;
};

export type PerformanceTestResult = {
    description: string;
    collectionsAmount: number;
    docsAmount: number;
    [timingKey: string]: number | string;
};

/**
 * Runs a performance benchmark against the given RxStorage.
 * Useful for comparing different RxStorage implementations.
 *
 * @param storage - The RxStorage to benchmark.
 * @param storageDescription - A human-readable description of the storage (used in results).
 * @param config - Optional configuration to override the defaults.
 * @returns An object with averaged timing values for each measured operation.
 */
export async function runPerformanceTests(
    storage: RxStorage<any, any>,
    storageDescription: string,
    config: PerformanceTestConfig = {}
): Promise<PerformanceTestResult> {
    const {
        runs = 40,
        collectionsAmount = 4,
        docsAmount = 3000,
        serialDocsAmount = 50,
        parallelQueryAmount = 4,
        insertBatches = 6,
        waitBetweenTests = 100,
        log = true,
        password
    } = config;
    const testBulkFindByIds = config.testBulkFindByIds !== false;
    const testSerialFindById = config.testSerialFindById !== false;
    const testFindByQuery = config.testFindByQuery !== false;
    const testFindByQueryParallel = config.testFindByQueryParallel !== false;
    const testCount = config.testCount !== false;
    const testPropertyAccess = config.testPropertyAccess !== false;

    const totalTimes: { [k: string]: number[]; } = {};

    // Generate dbName outside the loop to reuse the exact same MongoDB database.
    // This allows `.remove()` to drop the old collections and the next run to cleanly reuse the same 
    // namespace, avoiding creating thousands of collections on the DB server causing file exhaustion.
    const dbName = 'test-db-performance-' + randomToken(10);

    let runsDone = 0;
    while (runsDone < runs) {
        if (log) {
            console.log('runsDone: ' + runsDone + ' of ' + runs);
        }
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

        await awaitBetweenTest(waitBetweenTests);
        updateTime();

        // create database
        const schema = averageSchema();
        if (password) {
            schema.encrypted = ['deep', 'list'];
            schema.indexes = schema.indexes!.filter(index => {
                if (typeof index === 'string') {
                    return !index.startsWith('deep.');
                }
                return !index.some(field => field.startsWith('deep.'));
            });
        }
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
                storage,
                password
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
             * Instead we do a single insert and measure the time to the first insert.
             */
            await collections[collectionNames[1]].insert(averageSchemaData());
            return collections[firstCollectionName];
        }
        collection = await createDbWithCollections();
        updateTime('time-to-first-insert');
        await awaitBetweenTest(waitBetweenTests);

        // insert documents (in batches)
        const docIds: string[] = [];
        const docsPerBatch = docsAmount / insertBatches;
        for (let i = 0; i < insertBatches; i++) {
            const docsData = new Array(docsPerBatch)
                .fill(0)
                .map((_v, idx) => {
                    const data = averageSchemaData({
                        var1: (idx % 2) + '',
                        var2: idx % parallelQueryAmount
                    });
                    docIds.push(data.id);
                    return data;
                });
            updateTime();
            await collection.bulkInsert(docsData);
            updateTime('insert-documents-' + docsPerBatch);
            await awaitBetweenTest(waitBetweenTests);
        }

        if (testBulkFindByIds) {
            // refresh db to ensure we do not run on caches
            collection = await createDbWithCollections();
            await awaitBetweenTest(waitBetweenTests);

            /**
             * Bulk Find by id
             */
            updateTime();
            const idsResult = await collection.findByIds(docIds).exec();
            updateTime('find-by-ids-' + docsAmount);
            assert.strictEqual(Array.from(idsResult.keys()).length, docsAmount, 'find-by-id amount');
            await awaitBetweenTest(waitBetweenTests);
        }

        /**
         * Serial inserts
         */
        updateTime();
        let c = 0;
        const serialIds: string[] = [];
        while (c < serialDocsAmount) {
            c++;
            const data = averageSchemaData({
                var2: 1000
            });
            serialIds.push(data.id);
            await collection.insert(data);
        }
        updateTime('serial-inserts-' + serialDocsAmount);

        if (testSerialFindById || testFindByQuery) {
            // refresh db to ensure we do not run on caches
            collection = await createDbWithCollections();
            await awaitBetweenTest(waitBetweenTests);
        }

        if (testSerialFindById) {
            /**
             * Serial find-by-id
             */
            updateTime();
            for (const id of serialIds) {
                await collection.findByIds([id]).exec();
            }
            updateTime('serial-find-by-id-' + serialDocsAmount);
            await awaitBetweenTest(waitBetweenTests);
        }

        let queryResult: any[] | undefined;
        if (testFindByQuery) {
            // find by query
            updateTime();
            const query = collection.find({
                selector: {},
                sort: [
                    { var2: 'asc' },
                    { var1: 'asc' }
                ]
            });
            queryResult = await query.exec();
            updateTime('find-by-query');
            assert.strictEqual(queryResult.length, docsAmount + serialDocsAmount, 'find-by-query');
        }

        if (testFindByQueryParallel || testCount) {
            // refresh db to ensure we do not run on caches
            collection = await createDbWithCollections();
            await awaitBetweenTest(waitBetweenTests);
        }

        if (testFindByQueryParallel) {
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
            await awaitBetweenTest(waitBetweenTests);
        }

        if (testCount) {
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
            await awaitBetweenTest(waitBetweenTests);
        }

        if (testPropertyAccess && testFindByQuery && queryResult) {
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
        }

        await collection.database.remove();
    }

    const result: PerformanceTestResult = {
        description: storageDescription,
        collectionsAmount,
        docsAmount
    };
    Object.entries(totalTimes).forEach(([key, times]) => {
        result[key] = roundToTwo(averageOfTimeValues(times, 95));
    });

    if (log) {
        console.log('Performance test for ' + storageDescription);
        console.log(JSON.stringify(result, null, 4));
    }

    return result;
}

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

function roundToTwo(num: number) {
    return Math.round(num * 100) / 100;
}

async function awaitBetweenTest(waitMs: number) {
    await requestIdlePromise();
    if (waitMs > 0) {
        await wait(waitMs);
    }
    await requestIdlePromise();
    await requestIdlePromise();
}
