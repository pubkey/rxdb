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
import { pullQueryBuilderFromRxSchema } from '../../plugins/replication-graphql/index.mjs';

const normalize = (str: string) => str.trim().replace(/[\n\s]+/g, '');

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
            properties: {
                passportId: {
                    type: 'string',
                    maxLength: 100,
                },
                firstName: {
                    type: 'string',
                },
                lastName: {
                    type: 'string',
                },
                age: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 150,
                },
                updatedAt: {
                    type: 'string',
                },
                address: {
                    type: 'object',
                    properties: {
                        street: {
                            type: 'string',
                        },
                        city: {
                            type: 'string',
                        },
                        zip: {
                            type: 'string',
                        },
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
            passportId: 'foobar',
            firstName: 'Bob',
            lastName: 'Kelso',
            age: 56,
            address: {
                street: '24 Kelso BLVD',
                city: 'Sacramento',
                zip: '12345',
            },
        });

        /**
         * to simulate the event-propagation over multiple browser-tabs,
         * we create the same database again
         */
        const dbInOtherTab = await createRxDatabase({
            name,
            storage: config.storage.getStorage(),
            eventReduce: true,
            ignoreDuplicate: true,
        });
        // create a collection
        const collectionInOtherTab = await dbInOtherTab.addCollections({
            mycollection: {
                schema: mySchema,
            },
        });

        // find the document in the other tab
        await collectionInOtherTab.mycollection
            .findOne()
            .where('firstName')
            .eq('Bob')
            .exec();

        /*
         * assert things,
         * here your tests should fail to show that there is a bug
         */

        // same issue for pushQueryBuilderFromRxSchema & pullStreamBuilderFromRxSchema
        const builder = pullQueryBuilderFromRxSchema('human', {
            schema: mySchema,
            checkpointFields: ['passportId', 'updatedAt'],
        });

        const output = await builder(
            { passportId: 'foo', updatedAt: 12343 },
            10
        );

        const got = normalize(output.query);
        const want =
            normalize(`query PullHuman($checkpoint: HumanInputCheckpoint, $limit: Int!) {
                pullHuman(checkpoint: $checkpoint, limit: $limit) {
                    documents {
                        passportId
                        firstName
                        lastName
                        age
                        updatedAt
                        address {
                            street
                            city
                            zip
                        }
                        _deleted
                    }
                    checkpoint {
                        passportId
                        updatedAt
                    }
                }
            }
        `);

        assert.equal(got, want);

        db.destroy();
        dbInOtherTab.destroy();
    });
});
