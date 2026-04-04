import assert from 'assert';
import config, { describeParallel } from './config.ts';

import {
    RxDocument,
    addRxPlugin,
    promiseWait,
    randomToken
} from '../../plugins/core/index.mjs';
import {
    HumanWithTimestampDocumentType,
    getConfig
} from '../../plugins/test-utils/index.mjs';
import {
    schemaObjects,
    humansCollection
} from '../../plugins/test-utils/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
import { RxDBPipelinePlugin } from '../../plugins/pipeline/index.mjs';
import { RxDBLocalDocumentsPlugin } from '../../plugins/local-documents/index.mjs';
addRxPlugin(RxDBPipelinePlugin);
addRxPlugin(RxDBLocalDocumentsPlugin);
import { RxDBLeaderElectionPlugin } from '../../plugins/leader-election/index.mjs';
import { assertThrows } from 'async-test-util';
addRxPlugin(RxDBLeaderElectionPlugin);

describe('rx-pipeline.test.js', () => {
    if (
        config.storage.name.includes('random-delay')
    ) {
        // TODO
        return;
    }
    describeParallel('basics', () => {
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
                identifier: randomToken(10)
            });
            await c1.insert(schemaObjects.humanData('foobar'));
            await pipeline.close();
            c1.database.close();
            c2.database.close();
        });
        it('write some document depending on another', async () => {
            const c1 = await humansCollection.create(0);
            const c2 = await humansCollection.create(0);
            await c1.addPipeline({
                destination: c2,
                handler: async (docs) => {
                    for (const doc of docs) {
                        await c2.insert(schemaObjects.humanData(doc.passportId));
                    }
                },
                identifier: randomToken(10)
            });

            await c1.insert(schemaObjects.humanData('foobar'));

            /**
             * Here we run the query on the destination directly after
             * a write to the source. The pipeline should automatically halt
             * the reads to the destination until the pipeline is idle.
             */
            const doc2 = await c2.findOne().exec(true);
            assert.strictEqual(doc2.passportId, 'foobar');

            await c1.database.close();
            await c2.database.close();
        });
        it('write some document depending on another with schema validator', async () => {
            const storage = wrappedValidateAjvStorage({
                storage: getConfig().storage.getStorage()
            });
            const c1 = await humansCollection.create(0, undefined, undefined, undefined, storage);
            const c2 = await humansCollection.create(0, undefined, undefined, undefined, storage);
            await c1.addPipeline({
                destination: c2,
                handler: async (docs) => {
                    for (const doc of docs) {
                        await c2.insert(schemaObjects.humanData(doc.passportId));
                    }
                },
                identifier: randomToken(10)
            });

            await c1.insert(schemaObjects.humanData('foobar'));

            /**
             * Here we run the query on the destination directly after
             * a write to the source. The pipeline should automatically halt
             * the reads to the destination until the pipeline is idle.
             */
            const doc2 = await c2.findOne().exec(true);
            assert.strictEqual(doc2.passportId, 'foobar');

            await c1.database.close();
            await c2.database.close();
        });
        // it('write some document depending on another', async () => {
        //     const dbs = await multipleOnSameDB(0);
        //     const c1 = dbs.collection;
        //     const c2 = dbs.collection2;
        //     await c1.addPipeline({
        //         destination: c2,
        //         handler: async (docs) => {
        //             for (const doc of docs) {
        //                 const insertData = schemaObjects.humanData(doc.passportId);
        //                 console.dir({ insertData });
        //                 await c2.insert(insertData);
        //             }
        //         },
        //         identifier: randomToken(10)
        //     });
        //     await c1.insert(schemaObjects.humanData('foobar'));

        //     /**
        //      * Here we run the query on the destination directly after
        //      * a write to the source. The pipeline should automatically halt
        //      * the reads to the destination until the pipeline is idle.
        //      */
        //     const doc2 = await c2.findOne().exec(true);
        //     assert.strictEqual(doc2.passportId, 'foobar');

        //     await c1.database.close();
        //     await c2.database.close();
        // });
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
                identifier: randomToken(10)
            });
            await c1.insert(schemaObjects.humanData('foobar'));
            await pipeline.close();
            c1.database.close();
            c2.database.close();
        });
    });
    describeParallel('.awaitIdle()', () => {
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
                identifier: randomToken(10)
            });
            await c1.insert(schemaObjects.humanData('foobar'));
            const doc2 = await c2.findOne().exec(true);
            assert.strictEqual(doc2.passportId, 'foobar');

            assert.ok(pipeline.lastSourceDocTime.getValue() > 10);
            assert.ok(pipeline.lastProcessedDocTime.getValue() > 10);

            c1.database.close();
            c2.database.close();
        });
    });
    describeParallel('error handling', () => {
        it('should not swallow the error if the handler throws', async () => {
            const c1 = await humansCollection.create(0);
            await c1.database.waitForLeadership();
            const c2 = await humansCollection.create(0);
            const pipeline = await c1.addPipeline({
                destination: c2,
                handler: () => {
                    throw new Error('myErrorNonAsync');
                },
                identifier: randomToken(10)
            });
            await c1.insert(schemaObjects.humanData('foobar'));

            await assertThrows(
                () => pipeline.awaitIdle(),
                undefined,
                'myErrorNonAsync'
            );
            c1.database.close();
            c2.database.close();
        });
        it('should not swallow the error if the handler throws (async)', async () => {
            const c1 = await humansCollection.create(0);
            await c1.database.waitForLeadership();
            const c2 = await humansCollection.create(0);
            const pipeline = await c1.addPipeline({
                destination: c2,
                handler: async () => {
                    await promiseWait(0);
                    await promiseWait(0);
                    throw new Error('myErrorAsync');
                },
                identifier: randomToken(10)
            });
            await pipeline.awaitIdle();
            await c1.insert(schemaObjects.humanData('foobar'));

            await assertThrows(
                () => pipeline.awaitIdle(),
                undefined,
                'myErrorAsync'
            );
            await pipeline.close();
            await c1.database.close();
            await c2.database.close();
        });
    });
    describeParallel('checkpoints', () => {
        it('should continue from the correct checkpoint', async () => {
            const dbName = randomToken(10);
            const identifier = randomToken(10);
            const cDestination = await humansCollection.create(0);
            const c1 = await humansCollection.createHumanWithTimestamp(1, dbName);
            const ids: string[] = [];
            const handler = (docs: RxDocument<HumanWithTimestampDocumentType>[]) => {
                for (const doc of docs) {
                    if (ids.includes(doc.primary)) {
                        throw new Error('duplicate id ' + doc.primary);
                    }
                    ids.push(doc.primary);
                }
            };
            await c1.addPipeline({
                destination: cDestination,
                handler,
                identifier
            });
            await c1.insert(schemaObjects.humanWithTimestampData());

            await cDestination.database.close();
            await c1.database.close();
        });
    });
    describeParallel('multiInstance', () => {
        if (
            !config.storage.hasMultiInstance
            // config.storage.name === 'remote' // TODO
        ) {
            return;
        }
        it('should only run the pipeline at the leader', async () => {
            const identifier = randomToken(10);
            const name = randomToken(10);
            const c1 = await humansCollection.createMultiInstance(name);
            await c1.database.waitForLeadership();
            const c2 = await humansCollection.createMultiInstance(name);
            const runAt: string[] = [];
            const p1 = await c1.addPipeline({
                destination: c2,
                handler: () => {
                    runAt.push('c1');
                },
                identifier
            });
            const p2 = await c2.addPipeline({
                destination: c2,
                handler: () => {
                    runAt.push('c2');
                },
                identifier
            });
            await c1.insert(schemaObjects.humanData());
            await c2.insert(schemaObjects.humanData());

            await p1.awaitIdle();
            await p2.awaitIdle();

            assert.ok(runAt.length > 0);
            runAt.forEach(i => assert.strictEqual(i, 'c1'));

            await c1.database.close();
            await c2.database.close();
        });
        it('should halt reads on other tab while pipeline is running', async () => {
            const identifier = randomToken(10);
            const name = randomToken(10);
            const c1 = await humansCollection.createMultiInstance(name);
            await c1.database.waitForLeadership();
            const c2 = await humansCollection.createMultiInstance(name);
            const runAt: string[] = [];
            await c1.addPipeline({
                destination: c2,
                handler: async () => {
                    await promiseWait(0);
                    runAt.push('c1.1');
                    await promiseWait(50);
                    runAt.push('c1.2');
                },
                identifier
            });
            await c2.addPipeline({
                destination: c2,
                handler: () => {
                    runAt.push('c2');
                },
                identifier
            });
            await c1.insert(schemaObjects.humanData());
            runAt.push('doneInsert');
            await c2.find().exec();
            runAt.push('doneQuery');

            assert.deepStrictEqual(runAt, ['doneInsert', 'c1.1', 'c1.2', 'doneQuery']);

            await c1.database.close();
            await c2.database.close();
        });
    });
    describeParallel('transactional behavior', () => {
        it('should not block reads/writes that come from inside the pipeline handler', async () => {
            const c1 = await humansCollection.create(0);
            await c1.database.waitForLeadership();
            const c2 = await humansCollection.create(0);
            const pipeline = await c1.addPipeline({
                destination: c2,
                handler: async function myHandler1(docs) {
                    await c2.find().exec();
                    await c1.find().exec();

                    for (const doc of docs) {
                        await c2.insert(schemaObjects.humanData(doc.passportId));
                    }
                },
                identifier: randomToken(10)
            });

            await c1.insert(schemaObjects.humanData('foobar'));
            await pipeline.awaitIdle();

            await c1.database.close();
            await c2.database.close();
        });
        it('should not block reads that come from inside the pipeline handler when already cached outside', async () => {
            const c1 = await humansCollection.create(0);
            await c1.database.waitForLeadership();
            const c2 = await humansCollection.create(0);

            const cachedQuery = c2.find({ selector: { passportId: { $ne: 'foobar' } } });
            await cachedQuery.exec();

            const pipeline = await c1.addPipeline({
                destination: c2,
                handler: async function myHandler2() {
                    await cachedQuery.exec();
                },
                identifier: randomToken(10)
            });
            await c1.insert(schemaObjects.humanData('foobar'));
            await pipeline.awaitIdle();

            await c1.database.close();
            await c2.database.close();
        });
        it('should be able to do writes dependent on reads', async () => {
            const c1 = await humansCollection.create(0);
            await c1.database.waitForLeadership();
            const c2 = await humansCollection.create(1);

            await c1.addPipeline({
                destination: c2,
                handler: async function myHandler3() {
                    const c2Docs = await c2.find().exec();
                    for (const doc of c2Docs) {
                        const useData = doc.toMutableJSON(true);
                        useData.firstName = 'foobar';
                        await c2.upsert(useData);
                    }
                },
                identifier: randomToken(10)
            });
            await c1.insert(schemaObjects.humanData('foobar'));

            const c2After = await c2.findOne({ selector: { firstName: 'foobar' } }).exec(true);
            assert.strictEqual(c2After.firstName, 'foobar');


            await c1.database.close();
            await c2.database.close();
        });
        it('should not block reads when localDocument inserted', async () => {
            const c1 = await humansCollection.create(0);
            await c1.database.waitForLeadership();
            const c2 = await humansCollection.create(0);

            await c1.addPipeline({
                destination: c2,
                handler: async (docs) => {
                    for (const doc of docs) {
                        await c2.insert(schemaObjects.humanData(doc.passportId));
                    }
                },
                identifier: randomToken(10)
            });
            await c1.insert(schemaObjects.humanData('foobar'));
            const doc2 = await c2.findOne().exec(true);
            assert.strictEqual(doc2.passportId, 'foobar');

            await c1.insertLocal('LOCAL_KEY', { data: true });
            const doc2AfterLocalInserted = await c2.findOne().exec(true);
            assert.strictEqual(doc2AfterLocalInserted.passportId, 'foobar');

            c1.database.close();
            c2.database.close();
        });
    });
    describeParallel('multiple pipelines to same destination', () => {
        it('should not deadlock when two pipelines write to the same destination and both handlers read from it', async () => {
            const source1 = await humansCollection.create(0);
            await source1.database.waitForLeadership();
            const source2 = await humansCollection.create(0);
            await source2.database.waitForLeadership();
            const dest = await humansCollection.create(0);

            const pipeline1 = await source1.addPipeline({
                destination: dest,
                handler: async (docs) => {
                    // Reading from the destination inside the handler
                    // triggers awaitBeforeReads on dest, which calls
                    // pipeline2's waitBeforeWriteFn -> pipeline2.awaitIdle()
                    await dest.find().exec();
                    for (const doc of docs) {
                        await dest.insert(schemaObjects.humanData(doc.passportId + '-from-p1'));
                    }
                },
                identifier: 'pipeline-1-' + randomToken(10)
            });

            const pipeline2 = await source2.addPipeline({
                destination: dest,
                handler: async (docs) => {
                    // Same pattern: reading from dest triggers
                    // pipeline1's waitBeforeWriteFn -> pipeline1.awaitIdle()
                    await dest.find().exec();
                    for (const doc of docs) {
                        await dest.insert(schemaObjects.humanData(doc.passportId + '-from-p2'));
                    }
                },
                identifier: 'pipeline-2-' + randomToken(10)
            });

            // Insert into both sources to trigger both pipelines concurrently
            await source1.insert(schemaObjects.humanData('s1-doc'));
            await source2.insert(schemaObjects.humanData('s2-doc'));

            // awaitIdle on both pipelines should NOT deadlock
            const result = await Promise.race([
                Promise.all([pipeline1.awaitIdle(), pipeline2.awaitIdle()]).then(() => 'resolved'),
                promiseWait(10000).then(() => 'timeout')
            ]);

            assert.strictEqual(result, 'resolved', 'awaitIdle() should not deadlock with multiple pipelines to the same destination');

            // Both documents should have been processed into the destination
            const destDocs = await dest.find().exec();
            assert.strictEqual(destDocs.length, 2);

            await pipeline1.close();
            await pipeline2.close();
            await source1.database.close();
            await source2.database.close();
            await dest.database.close();
        });
    });
    describeParallel('.remove()', () => {
        it('should properly clean up checkpoint when remove() is called while pipeline is processing', async () => {
            const c1 = await humansCollection.create(0);
            await c1.database.waitForLeadership();
            const c2 = await humansCollection.create(0);
            const identifier = randomToken(10);

            const pipeline = await c1.addPipeline({
                destination: c2,
                handler: async (docs) => {
                    // Slow handler to create a window where remove()
                    // is called while processing is still ongoing
                    await promiseWait(50);
                    for (const doc of docs) {
                        await c2.insert(schemaObjects.humanData(doc.passportId));
                    }
                },
                identifier
            });

            // Insert a document which triggers the pipeline handler
            await c1.insert(schemaObjects.humanData('foobar'));

            // Call remove() while the handler is still processing (50ms delay).
            // This should NOT throw and should properly clean up the checkpoint.
            await pipeline.remove();

            // Verify the checkpoint was properly cleaned up by creating
            // a new pipeline with the same identifier.
            // It should process all documents from the beginning.
            const processedIds: string[] = [];
            const pipeline2 = await c1.addPipeline({
                destination: c2,
                handler: (docs) => {
                    for (const doc of docs) {
                        processedIds.push(doc.primary);
                    }
                },
                identifier
            });

            // Insert another document so that awaitIdle() properly waits
            // for the pipeline to process (lastSourceDocTime gets updated).
            await c1.insert(schemaObjects.humanData('after-remove'));
            await pipeline2.awaitIdle();

            // If checkpoint was properly cleaned up, pipeline2 should have
            // processed 'foobar' from the beginning, not just 'after-remove'.
            assert.ok(
                processedIds.includes('foobar'),
                'pipeline2 should have reprocessed foobar after remove()'
            );

            await pipeline2.close();
            await c1.database.close();
            await c2.database.close();
        });
    });
});
