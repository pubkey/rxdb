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
import { RxJsonSchema } from '../../src';

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
        const mySchema: RxJsonSchema<any> = {
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
                },
                tags: {
                    type: 'object',
                    additionalProperties: {
                        properties: {
                            created: {
                                type: 'integer',
                            },
                            name: {
                                type: 'string',
                            },
                        },
                        required: ['created', 'name'],
                    },
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
            ignoreDuplicate: true
        });
        // create a collection
        const collections = await db.addCollections({
            mycollection: {
                schema: mySchema
            }
        });

        const tags = {
            hello: {
                created: 1,
                name: 'hello',
            },
            world: {
                created: 2,
                name: 'world',
            }
        };

        // insert a document
        await collections.mycollection.insert({
            passportId: 'foobar',
            firstName: 'Bob',
            lastName: 'Kelso',
            age: 56,
            tags,
        });

        const myDocument = await collections.mycollection
            .findOne()
            .exec();

        /*
         * assert things,
         * here your tests should fail to show that there is a bug
         */
        assert.strictEqual(myDocument.toJSON().tags, tags);
        assert.strictEqual(myDocument.get('tags'), tags);
        assert.strictEqual(myDocument.tags, tags);

        // clean up afterwards
        db.destroy();
    });
});
