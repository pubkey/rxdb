import {
    createRxDatabase,
    randomCouchString
} from '../../';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import config from './config';


/**
 * Running these performance tests in the unit test suite
 * was the easiest way to make it run on all storages and platforms.
 * Maybe we should move this into a different npm script instead.
 */
describe('unit/performance.test.ts', () => {
    it('run the performance test', async function () {

        if (config.isFastMode()) {
            return;
        }
        this.timeout(90 * 1000);

        const perfStorage = config.storage.getPerformanceStorage();

        const totalTimeSums: { [k: string]: number } = {};

        const runs = 5;
        let runsDone = 0;
        while (runsDone < runs) {
            console.log('---------------- ' + runsDone);
            runsDone++;

            let time = performance.now();
            const updateTime = (flag?: string) => {
                if (!flag) {
                    time = performance.now();
                    return;
                }
                const diff = performance.now() - time;
                if (!totalTimeSums[flag]) {
                    totalTimeSums[flag] = diff;
                } else {
                    totalTimeSums[flag] = totalTimeSums[flag] + diff;
                }
                time = performance.now();
            }

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
            updateTime('database-creation');

            // create collections
            const collectionData: any = {};
            new Array(8)
                .fill(0)
                .forEach((_v, idx) => {
                    const name = 'human' + idx;
                    collectionData[name] = {
                        schema: schemas.averageSchema(),
                        statics: {}
                    };
                });
            await db.addCollections(collectionData);
            updateTime('collection-creation');

            // insert documents
            const docIds: string[] = [];
            const docsData = new Array(100)
                .fill(0)
                .map(() => {
                    const data = schemaObjects.averageSchema();
                    docIds.push(data.id);
                    return data;
                });
            updateTime();

            await db.human0.bulkInsert(docsData);
            updateTime('insert-documents');

            // find by id
            await db.human0.findByIds(docIds);
            updateTime('find-by-ids');

            // find by query
            await db.human0.find({
                selector: {
                    var1: {
                        $gt: ''
                    }
                }
            }).exec();
            updateTime('find-by-query');

            await db.destroy();
        }


        const timeToLog: any = {};
        Object.entries(totalTimeSums).forEach(([key, totalTime]) => {
            timeToLog[key] = totalTime / runs;
        });

        console.log('Performance test for ' + perfStorage.description);
        console.log(JSON.stringify(timeToLog, null, 4));
    });
});
