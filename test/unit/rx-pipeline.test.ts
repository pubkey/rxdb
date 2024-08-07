import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import config, { describeParallel } from './config.ts';

import {
    RxDocument,
    addRxPlugin,
    createRxDatabase,
    promiseWait,
    randomCouchString
} from '../../plugins/core/index.mjs';
import {
    HumanWithTimestampDocumentType,
    isNode
} from '../../plugins/test-utils/index.mjs';
import {
    schemaObjects,
    schemas,
    humansCollection,
    HumanDocumentType
} from '../../plugins/test-utils/index.mjs';
import { RxDBPipelinePlugin } from '../../plugins/pipeline/index.mjs';
addRxPlugin(RxDBPipelinePlugin);
import { RxDBLeaderElectionPlugin } from '../../plugins/leader-election/index.mjs';
addRxPlugin(RxDBLeaderElectionPlugin);

describeParallel('rx-pipeline.test.js', () => {
    describe('basics', () => {
        it('add and remove a pipeline', async () => {
            const c1 = await humansCollection.create(0);
            await c1.database.waitForLeadership();
            const c2 = await humansCollection.create(0);
            const pipeline = await c1.addPipeline({
                destination: c2,
                handler: async (docs) => {
                    for (const doc of docs) {
                        await c2.insert(schemaObjects.humanData(doc.passportId));
                    }
                },
                identifier: randomCouchString(10)
            });
            await c1.insert(schemaObjects.humanData('foobar'));
            await pipeline.destroy();
            c1.database.destroy();
            c2.database.destroy();
        });
        it('write some document depending on another', async () => {
            const c1 = await humansCollection.create(0);
            await c1.database.waitForLeadership();
            const c2 = await humansCollection.create(0);
            const pipeline = await c1.addPipeline({
                destination: c2,
                handler: async (docs) => {
                    console.log('H1');
                    console.dir(docs.map(d => d.toJSON()));
                    for (const doc of docs) {
                        await c2.insert(schemaObjects.humanData(doc.passportId));
                    }
                    console.log('H2');
                },
                identifier: randomCouchString(10)
            });

            await c1.insert(schemaObjects.humanData('foobar'));

            /**
             * Here we run the query on the destination directly after
             * a write to the source. The pipeline should automatically halt
             * the reads to the destionation until the pipeline is idle.
             */
            const doc2 = await c2.findOne().exec(true);
            assert.strictEqual(doc2.passportId, 'foobar');

            await c1.database.destroy();
            await c2.database.destroy();
        });
        it('should store the transformed data to the destination', async () => {
            const c1 = await humansCollection.create(0);
            await c1.database.waitForLeadership();
            const c2 = await humansCollection.create(0);
            const pipeline = await c1.addPipeline({
                destination: c2,
                handler: async (docs) => {
                    for (const doc of docs) {
                        await c2.insert(schemaObjects.humanData(doc.passportId));
                    }
                },
                identifier: randomCouchString(10)
            });
            await c1.insert(schemaObjects.humanData('foobar'));
            await pipeline.destroy();
            c1.database.destroy();
            c2.database.destroy();
        });
    });
    describe('.awaitIdle()', () => {
        it('should have updated its internal timestamps', async () => {
            const c1 = await humansCollection.create(0);
            await c1.database.waitForLeadership();
            const c2 = await humansCollection.create(0);
            const pipeline = await c1.addPipeline({
                destination: c2,
                handler: async (docs) => {
                    for (const doc of docs) {
                        await c2.insert(schemaObjects.humanData(doc.passportId));
                    }
                },
                identifier: randomCouchString(10)
            });
            await c1.insert(schemaObjects.humanData('foobar'));
            const doc2 = await c2.findOne().exec(true);
            assert.strictEqual(doc2.passportId, 'foobar');

            assert.ok(pipeline.lastSourceDocTime.getValue() > 10);
            assert.ok(pipeline.lastProcessedDocTime.getValue() > 10);

            c1.database.destroy();
            c2.database.destroy();
        });

    });
    describe('checkpoints', () => {
        it('should continue from the correct checkpoint', async () => {
            const dbName = randomCouchString(10);
            const identifier = randomCouchString(10);
            const cDestination = await humansCollection.create(0);
            const c1 = await humansCollection.createHumanWithTimestamp(1, dbName);
            const ids: string[] = [];
            const handler = async (docs: RxDocument<HumanWithTimestampDocumentType>[]) => {
                for (const doc of docs) {
                    if (ids.includes(doc.primary)) {
                        throw new Error('duplicate id ' + doc.primary);
                    }
                    ids.push(doc.primary);
                }
            };
            const pipeline = await c1.addPipeline({
                destination: cDestination,
                handler,
                identifier
            });
            await c1.insert(schemaObjects.humanWithTimestampData());

            cDestination.database.destroy();
        });
    });
    describe('multiInstance', () => {
        if (!config.storage.hasMultiInstance) {
            return;
        }
        it('should only run the pipeline at the leader', async () => {
            const identifier = randomCouchString(10);
            const name = randomCouchString(10);
            const c1 = await humansCollection.createMultiInstance(name);
            await c1.database.waitForLeadership();
            const c2 = await humansCollection.createMultiInstance(name);
            const runAt: string[] = [];
            await c1.addPipeline({
                destination: c2,
                handler: async (docs) => {
                    runAt.push('c1');
                },
                identifier
            });
            await c2.addPipeline({
                destination: c2,
                handler: async (docs) => {
                    runAt.push('c2');
                },
                identifier
            });
            await c1.insert(schemaObjects.humanData());
            await c2.insert(schemaObjects.humanData());

            assert.deepStrictEqual(runAt, ['c1']);

            c1.database.destroy();
            c2.database.destroy();
        });
        it('should halt reads on other tab while pipeline is running', async () => {
            const identifier = randomCouchString(10);
            const name = randomCouchString(10);
            const c1 = await humansCollection.createMultiInstance(name);
            await c1.database.waitForLeadership();
            const c2 = await humansCollection.createMultiInstance(name);
            const runAt: string[] = [];
            await c1.addPipeline({
                destination: c2,
                handler: async (docs) => {
                    runAt.push('c1.1');
                    await promiseWait(50);
                    runAt.push('c1.2');
                },
                identifier
            });
            await c2.addPipeline({
                destination: c2,
                handler: async (docs) => {
                    runAt.push('c2');
                },
                identifier
            });
            await c1.insert(schemaObjects.humanData());
            runAt.push('doneInsert');
            await c2.find().exec();
            runAt.push('doneQuery');

            assert.deepStrictEqual(runAt, ['doneInsert', 'c1.1', 'c1.2', 'doneQuery']);

            c1.database.destroy();
            c2.database.destroy();
        });
    });
});
