import {
    createRxDatabase,
    randomCouchString
} from '../../';
import * as assert from 'assert';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import config from './config';
import { wait } from 'async-test-util';

/**
 * Running these performance tests in the unit test suite
 * was the easiest way to make it run on all storages and platforms.
 * Maybe we should move this into a different npm script instead.
 */
describe('unit/performance.test.ts', () => {
    it('run the performance test', async function () {
        this.timeout(120 * 1000);
        const runs = config.isFastMode() ? 1 : 40;

        const perfStorage = config.storage.getPerformanceStorage();

        const totalTimes: { [k: string]: number[] } = {};

        const collectionsAmount = 3;
        const docsAmount = 300;

        let runsDone = 0;
        while (runsDone < runs) {
            /**
             * Wait a bit to ensure nothing else is running
             * that would influence the performance.
             */
            await wait(200);

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
            }

            updateTime();

            // create database
            const db = await createRxDatabase({
                name: 'test-db-performance-' + randomCouchString(10),
                eventReduce: true,
                /**
                 * A RxStorage implementation (like LokiJS)
                 * might need a full leader election cycle to be useable.
                 * So we disable multiInstance here because it would make no sense
                 * to measure the leader election time instead of the database
                 * creation time.
                 */
                multiInstance: false,
                storage: perfStorage.storage
            });

            // create collections
            const collectionData: any = {};
            let firstCollectionName: string = '';
            new Array(collectionsAmount)
                .fill(0)
                .forEach((_v, idx) => {
                    const name = randomCouchString(10) + '_' + idx;
                    if (!firstCollectionName) {
                        firstCollectionName = name;
                    }
                    collectionData[name] = {
                        schema: schemas.averageSchema(),
                        statics: {}
                    };
                });
            const collections = await db.addCollections(collectionData);
            const collection = collections[firstCollectionName];


            /**
             * Many storages have a lazy initialization.
             * So it makes no sense to measure the time of database/collection creation.
             * Insert we do a single insert an measure the time to the first insert.
             */
            await collection.insert(schemaObjects.averageSchema());
            updateTime('time-to-first-insert');

            // insert documents
            const docIds: string[] = [];
            const docsData = new Array(docsAmount)
                .fill(0)
                .map(() => {
                    const data = schemaObjects.averageSchema();
                    docIds.push(data.id);
                    return data;
                });
            updateTime();
            await collection.bulkInsert(docsData);
            updateTime('insert-documents');

            /**
             * Find by id,
             * here we run the query agains the storage because
             * if we would do collection.findByIds(), it would
             * just return the documents from the cache.
             * 
             */
            const idsResult = await collection.storageInstance.findDocumentsById(docIds, false);
            updateTime('find-by-ids');
            assert.strictEqual(Object.keys(idsResult).length, docsAmount);

            // find by query
            updateTime();
            const query = collection.find({
                selector: {
                    var1: {
                        $gt: ''
                    }
                },
                sort: [{ var1: 'asc' }]
            });
            const queryResult = await query.exec();
            updateTime('find-by-query');
            assert.strictEqual(queryResult.length, docsAmount + 1);

            await db.remove();
        }


        const timeToLog: any = {
            description: perfStorage.description
        };
        Object.entries(totalTimes).forEach(([key, times]) => {
            timeToLog[key] = averageOfTimeValues(times, 50);
        });

        console.log('Performance test for ' + perfStorage.description);
        console.log(JSON.stringify(timeToLog, null, 4));
        process.exit();
    });
});


export function averageOfTimeValues(
    times: number[],
    /**
     * To better account for anomalies
     * during time measurements,
     * we strip the heighest x percent.
     */
    stripHeighestXPercent: number
): number {
    times = times.sort((a, b) => a - b);
    const stripAmount = Math.floor(times.length * (stripHeighestXPercent * 0.01));
    const useNumbers = times.slice(0, times.length - stripAmount);
    let total = 0;
    useNumbers.forEach(nr => total = total + nr);
    return total / useNumbers.length;
}
