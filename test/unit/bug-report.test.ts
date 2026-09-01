/**
 * this is a template for a test.
 * If you found a bug, edit this test to reproduce it
 * and than make a pull-request with that failing test.
 * The maintainer will later move your test to the correct position in the test-suite.
 *
 * To run this test do:
 * - 'npm run test:node' so it runs in nodejs
 * - 'npm run test:browser' so it runs in the browser
 */
import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import config from './config.ts';

import {
    createRxDatabase,
    randomToken
} from '../../plugins/core/index.mjs';
describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async function () {
        // create a schema
        const mySchema = {
            version: 0,
            primaryKey: 'passportId',
            type: 'object',
            properties: {
                passportId: {
                    type: 'string',
                    maxLength: 100
                },
                firstName: {
                    type: 'string'
                },
                lastName: {
                    type: 'string'
                },
                age: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 150
                }
            }
        };

        /**
         * Always generate a random database-name
         * to ensure that different test runs do not affect each other.
         */
        const name = randomToken(10);

        // create a database
        const db = await createRxDatabase({
            name,
            storage: config.storage.getStorage(),
            eventReduce: true
        });
        // create a collection
        const collections = await db.addCollections({
            mycollection: {
                schema: mySchema
            }
        });

        // insert a document
        await collections.mycollection.insert({
            passportId: 'foobar',
            firstName: 'Bob',
            lastName: 'Kelso',
            age: 56
        });
        const myDocument = await collections.mycollection.findOne().exec(true);

        // let the NEXT incremental write fail once at the storage layer,
        // like a transient io error would
        const storageInstance = collections.mycollection.storageInstance;
        const realBulkWrite = storageInstance.bulkWrite.bind(storageInstance);
        let failedOnce = false;
        storageInstance.bulkWrite = (rows: any, context: string) => {
            if (context === 'incremental-write' && !failedOnce) {
                failedOnce = true;
                return Promise.reject(new Error('simulated transient storage failure'));
            }
            return realBulkWrite(rows, context);
        };

        // the wedged queue rejects its internal run unhandled - silence that
        // so the test reaches its assertion instead of crashing the process
        const silence = () => { };
        process.on('unhandledRejection', silence);

        /*
         * assert things,
         * here your tests should fail to show that there is a bug
         *
         * Expected: the first incrementalPatch rejects with the storage error,
         * the second one runs after the failure is over and succeeds.
         * Actual: BOTH promises never settle. IncrementalWriteQueue.triggerRun()
         * has no try/finally around its body, so the rejected bulkWrite leaves
         * isRunning=true forever and every later addWrite() queues up behind it.
         */
        const first = myDocument.incrementalPatch({ age: 57 }).then(() => 'settled', () => 'settled');
        const second = myDocument.incrementalPatch({ age: 58 }).then(() => 'settled', () => 'settled');
        const outcome = await Promise.race([
            Promise.all([first, second]).then(() => 'settled'),
            AsyncTestUtil.wait(2000).then(() => 'still pending after 2 seconds')
        ]);
        assert.strictEqual(outcome, 'settled');

        // clean up afterwards
        process.removeListener('unhandledRejection', silence);
        db.close();
    });
});
