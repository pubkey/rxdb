import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import config from './config.ts';

import {
    addRxPlugin,
    createRxDatabase,
    randomCouchString
} from '../../plugins/core/index.mjs';
import {
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

describe('rx-pipeline.test.js', () => {

    describe('basics', () => {
        it('add and remove a pipeline', async () => {
            const c1 = await humansCollection.create(0);
            await c1.database.waitForLeadership();
            const c2 = await humansCollection.create(0);
            const pipeline = await c1.addPipeline({
                destination: c2,
                handler: async (docs) => {
                    console.log('H1');
                    for (const doc of docs) {
                        await c2.insert(schemaObjects.humanData(doc.passportId));
                    }
                    console.log('H2');
                },
                identifier: randomCouchString(10)
            });
            await c1.insert(schemaObjects.humanData('foobar'));


            await pipeline.cancel();
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
                    for (const doc of docs) {
                        await c2.insert(schemaObjects.humanData(doc.passportId));
                    }
                    console.log('H2');
                },
                identifier: randomCouchString(10)
            });
            await c1.insert(schemaObjects.humanData('foobar'));
            console.log('INSERT DONE !');


            const doc2 = await c2.findOne().exec(true);
            assert.strictEqual(doc2.passportId, 'foobar');

            c1.database.destroy();
            c2.database.destroy();

            process.exit();
        });
        it('should store the transformed data to the destination', () => {

        });
    });

});
