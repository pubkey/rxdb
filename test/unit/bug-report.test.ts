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
    randomToken
} from '../../plugins/core/index.mjs';

describe('bug-report.test.js', () => {
    it('find({ limit: 0 }) must return an empty array', async function () {
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
        } as const;

        /**
         * Always generate a random database-name
         * to ensure that different test runs do not affect each other.
         */
        const name = randomToken(10);

        // create a database
        const db = await createRxDatabase({
            name,
            /**
             * By calling config.storage.getStorage(),
             * we can ensure that all variations of RxStorage are tested in the CI.
             */
            storage: config.storage.getStorage(),
            eventReduce: true
        });
        // create a collection
        const collections = await db.addCollections({
            mycollection: {
                schema: mySchema
            }
        });

        // insert a few documents so the collection is not empty
        await collections.mycollection.bulkInsert([
            { passportId: 'a', firstName: 'Alice', lastName: 'A', age: 10 },
            { passportId: 'b', firstName: 'Bob', lastName: 'B', age: 20 },
            { passportId: 'c', firstName: 'Chris', lastName: 'C', age: 30 }
        ]);

        // Sanity check: find() without limit must return all three docs.
        const allDocs = await collections.mycollection.find().exec();
        assert.strictEqual(allDocs.length, 3);

        /**
         * A user specifies `limit: 0` which, per the MangoQuery public API,
         * should be honored and return zero documents.
         * The storage layer incorrectly interprets the falsy `0` as
         * "no limit was set" and returns all documents instead.
         */
        const result = await collections.mycollection.find({
            selector: {},
            limit: 0
        }).exec();

        assert.strictEqual(
            result.length,
            0,
            'find({ limit: 0 }) must return an empty result set, got ' + result.length
        );

        db.close();
    });
});
