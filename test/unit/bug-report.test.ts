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
    randomCouchString
} from '../../plugins/core/index.mjs';
import { wrappedKeyCompressionStorage } from '../../plugins/key-compression/index.mjs';
import {
    isNode
} from '../../plugins/test-utils/index.mjs';
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

        if (!config.storage.hasMultiInstance) {
            return;
        }

        // create a schema
        const mySchema = {
            version: 0,
            primaryKey: 'passportId',
            type: 'object',
            keyCompression: true,
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
                },
                tags: {
                    type: 'object',
                    patternProperties: {
                        '.*': {
                            properties: {
                                name: { type: 'string' },
                            },
                            required: ['name'],
                        }
                    },
                }
            }
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
            storage: wrappedKeyCompressionStorage({ storage: config.storage.getStorage() }),
            eventReduce: true,
            ignoreDuplicate: true
        });
        // create a collection
        const collections = await db.addCollections({
            mycollection: {
                schema: mySchema
            },
        });

        // insert a document
        await collections.mycollection.insert({
            passportId: 'foobar',
            firstName: 'Bob',
            lastName: 'Kelso',
            age: 56,
            tags: {
                example: 'example',
            }
        });

        // find the document
        let myDocument = await collections.mycollection.findOne().exec(true);

        /*
         * assert things,
         * here your tests should fail to show that there is a bug
         */
        assert.strictEqual(myDocument.tags.example, 'example');


        // you can also wait for events
        const emitted = [];
        const sub = collections.mycollection.$.subscribe((eventData) => {
            emitted.push(eventData);
        });

        await myDocument.incrementalModify((docData) => {
            const newDocData = Object.assign({}, docData);
            newDocData.tags['[example2]'] = '[example2]';
            return newDocData;
        });

        myDocument = await collections.mycollection.findOne().exec(true);
        const tags = myDocument.toJSON().tags;
        const expectedTags = {
            example: 'example',
            '[example2]': '[example2]',
        };
        assert.deepEqual(tags, expectedTags);

        await AsyncTestUtil.waitUntil(() => emitted.length === 1);
        assert.strictEqual(emitted[0].operation, 'UPDATE');
        assert.deepEqual(emitted[0].documentData.tags, expectedTags);

        // clean up afterwards
        sub.unsubscribe();
        db.destroy();
    });
});
