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
    randomCouchString
} from '../../plugins/core/index.mjs';

describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async () => {
        if (!config.storage.hasMultiInstance) {
            return;
        }

        // create a schema
        const mySchema = {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    maxLength: 1
                },
                hasHighlights: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 1,
                    multipleOf: 1
                },
                lastOpenedAt: {
                    type: 'integer',
                    minimum: 0,
                    maximum: Number.MAX_SAFE_INTEGER,
                    multipleOf: 1,
                },
                exists: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 1,
                    multipleOf: 1
                },
            },
            indexes: [
                // add a more specific index for the query and the result is correct
                // ['exists', 'lastOpenedAt'],
                ['exists', 'hasHighlights', 'lastOpenedAt'],
            ]
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
            ignoreDuplicate: true
        });
        // create a collection
        const collections = await db.addCollections({
            mycollection: {
                schema: mySchema
            }
        });

        // insert a document
        await collections.mycollection.bulkInsert([
            {id: '1', exists: 1, hasHighlights: 1, lastOpenedAt: 1600000000000},
            {id: '2', exists: 1, hasHighlights: 1, lastOpenedAt: 1700000000000},
        ]);

        // find the document in the other tab
        const myDocuments = await collections.mycollection
            .find({
                selector: {
                    exists: 1,
                    lastOpenedAt: {
                        $gte: 1600000000000,
                        $lte: 1650000000000
                    }
                }
            })
            .exec();


        assert.strictEqual(myDocuments.length, 1);

        // cleanup
        db.destroy();
    });
});
