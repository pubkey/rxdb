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
import config from './config';

import {
    createRxDatabase,
    randomCouchString
} from '../../';
import { wrappedValidateAjvStorage } from '../../dist/lib/plugins/validate-ajv';

describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async () => {

        /**
         * If your test should only run in nodejs or only run in the browser,
         * you should comment in the return operator and adapt the if statement.
         */
        if (
            !config.platform.isNode() // runs only in node
            // config.platform.isNode() // runs only in the browser
        ) {
            // return;
        }

        if (!config.storage.hasMultiInstance) {
            return;
        }

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
                    minimum: 10,
                    maximum: 150
                }
            },
            required: ['passportId', 'firstName', 'lastName', 'age'],
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
            storage: wrappedValidateAjvStorage({ storage: config.storage.getStorage() }),
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
        let error: Error | undefined;
        try {
            await collections.mycollection.bulkInsert([{
                passportId: 'foobar',
                firstName: 'Bob',
                lastName: 'Kelso',
                age: 9
            }]);
            throw new Error('test failure');
        } catch (e: any) {
            if (e.message !== 'test failure') {
                error = e;
            }
        }

        assert.strictEqual(typeof error, 'object');
        assert.strictEqual(error?.message.includes('RxError (VD2)'), true, 'Is validation error');
        assert.strictEqual(error?.message.includes('"schemaPath": "#/properties/age/minimum"'), true, 'Mentions age minimum');
        throw error;

        // clean up afterwards
        db.destroy();
    });
});
