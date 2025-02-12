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
// import AsyncTestUtil from 'async-test-util';
import config from './config.ts';

import {
    createRxDatabase,
    removeRxDatabase,
    randomToken
} from '../../plugins/core/index.mjs';

describe('remove-rx-database.test.js', () => {
    it('should remove all documents before to call removeRxDatabase', async function () {

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
            /**
             * By calling config.storage.getStorage(),
             * we can ensure that all variations of RxStorage are tested in the CI.
             */
            storage: config.storage.getStorage(),
            // eventReduce: true,
            // ignoreDuplicate: true
        });
        // create a collection
        const collections = await db.addCollections({
            myCollection: {
                schema: mySchema
            }
        });

        // insert a document
        const { myCollection } = collections;
        await myCollection.insert({
            passportId: 'foobar',
            firstName: 'Bob',
            lastName: 'Kelso',
            age: 56
        });

        // find the document and test this was inserted successfully
        let myDocument = (await myCollection.findOne().exec()).toJSON();
        assert.deepStrictEqual(myDocument, {
            passportId: 'foobar',
            firstName: 'Bob',
            lastName: 'Kelso',
            age: 56
        });

        await removeRxDatabase(name, config.storage.getStorage());

        // find the document and test this should not existed anymore
        myDocument = (await myCollection.findOne().exec()).toJSON();
        assert.equal(myDocument, null);

        db.close();
    });
});
