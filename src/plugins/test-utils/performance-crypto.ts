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
import type { PerformanceTestConfig, PerformanceTestResult } from './performance.ts';
import { averageOfTimeValues } from './performance.ts';


/**
 * Runs a crypto-specific performance benchmark against the given RxStorage.
 * The storage must already be wrapped with the encryption plugin.
 * Uses a schema with encrypted fields to measure the overhead of encryption/decryption.
 */
export async function runCryptoPerformanceTests(
    storage: RxStorage<any, any>,
    storageDescription: string,
    password: string,
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
        log = true
    } = config;

    const totalTimes: { [k: string]: number[]; } = {};

    const dbName = 'test-db-perf-crypto-' + randomToken(10);

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

        // create database with encrypted schema
        const baseSchema = averageSchema();
        // Remove indexes on encrypted fields because encrypted fields
        // are stored as strings and cannot be indexed by sub-properties.
        const filteredIndexes = (baseSchema.indexes || []).filter(index => {
            const indexStr = Array.isArray(index) ? index.join(',') : index;
            return !indexStr.includes('deep.');
        });
        const schema = Object.assign({}, baseSchema, {
            encrypted: ['deep'],
            indexes: filteredIndexes
        });
        let collection: RxCollection<AverageSchemaDocumentType>;
        async function createDbWithCollections() {
            if (collection) {
                await collection.database.close();
            }
            const db = await createRxDatabase({
                name: dbName,
                eventReduce: true,
                multiInstance: false,
                storage,
                password
            });

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

        // refresh db to ensure we do not run on caches
        collection = await createDbWithCollections();
        await awaitBetweenTest(waitBetweenTests);

        /**
         * Serial find-by-id
         */
        updateTime();
        for (const id of serialIds) {
            await collection.findByIds([id]).exec();
        }
        updateTime('serial-find-by-id-' + serialDocsAmount);
        await awaitBetweenTest(waitBetweenTests);

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
        await awaitBetweenTest(waitBetweenTests);

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

        // test property access time on encrypted fields
        updateTime();
        let sum = 0;
        for (let i = 0; i < queryResult.length; i++) {
            const doc = queryResult[i];
            // access encrypted deep field
            sum += doc.deep.deeper.deepNr;
            sum += doc.deep.deeper.deepNr;
        }
        updateTime('property-access');
        assert.ok(sum > 10);

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
        console.log('Crypto performance test for ' + storageDescription);
        console.log(JSON.stringify(result, null, 4));
    }

    return result;
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
