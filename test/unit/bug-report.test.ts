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
import config from './config.ts';

import {
    createRxDatabase,
    randomCouchString,
} from '../../plugins/core/index.mjs';
import { isNode } from '../../plugins/test-utils/index.mjs';
describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async function () {
        /**
         * If your test should only run in nodejs or only run in the browser,
         * you should comment in the return operator and adapt the if statement.
         */
        if (
            !isNode // runs only in node
            // isNode // runs only in the browser
        ) {
            // return;
        }

        // create a schema
        const mySchema = {
            version: 0,
            primaryKey: 'passportId',
            type: 'object',
            properties: {
                passportId: {
                    type: 'string',
                    maxLength: 100,
                },
                createdAt: {
                    type: 'object',
                    properties: {
                        seconds: {
                            type: 'number',
                        },
                        nanoSeconds: {
                            type: 'number',
                        },
                    },
                },
                createdAtSeconds: {
                    type: 'number',
                },
            },
        };

        /**
         * Always generate a random database-name
         * to ensure that different test runs do not affect each other.
         */
        const name = randomCouchString(10);

        // create a database
        const db = await createRxDatabase({
            name,
            /**
             * By calling config.storage.getStorage(),
             * we can ensure that all variations of RxStorage are tested in the CI.
             */
            storage: config.storage.getStorage(),
            eventReduce: true,
            ignoreDuplicate: true,
        });
        // create a collection
        const collections = await db.addCollections({
            mycollection: {
                schema: mySchema,
            },
        });

        // insert a document
        await collections.mycollection.insert({
            passportId: 'some-id',
            createdAt: {
                seconds: 123,
                nanoSeconds: 456,
            },
            createdAtSeconds: 123,
        });

        const doc = await collections.mycollection.findOne('some-id').exec();
        const pojo = doc.toJSON();

        const accessFieldRepeatedly = (getField: () => number) => {
            const start = performance.now();
            for (let i = 0; i < 1000_000; i++) {
                if (getField() === 0) {
                    console.log('no-op');
                }
            }
            const end = performance.now();
            return end - start;
        };

        console.log('\nAccessing top level field');
        console.log('---------------------------------');
        const topLevelFieldTime = accessFieldRepeatedly(
            () => doc.createdAtSeconds
        );
        const pojoTopLevelFieldTime = accessFieldRepeatedly(
            () => pojo.createdAtSeconds
        );
        console.log(`    RxDocument: ${topLevelFieldTime.toFixed(2)}ms`);
        console.log(`Regular object: ${pojoTopLevelFieldTime.toFixed(2)}ms`);

        console.log('\nAccessing nested field');
        console.log('---------------------------------');
        const nestedFieldTime = accessFieldRepeatedly(
            () => doc.createdAt.seconds
        );
        const pojoNestedFieldTime = accessFieldRepeatedly(
            () => pojo.createdAt.seconds
        );
        console.log(`    RxDocument: ${nestedFieldTime.toFixed(2)}ms`);
        console.log(`Regular object: ${pojoNestedFieldTime.toFixed(2)}ms`);

        /*
         * assert things,
         * here your tests should fail to show that there is a bug
         */

        assert.ok(nestedFieldTime < 2 * topLevelFieldTime);

        // clean up afterwards
        db.destroy();
    });
});
