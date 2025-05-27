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
    addRxPlugin,
    createRxDatabase,
    randomToken
} from '../../plugins/core/index.mjs';
import {
    isNode
} from '../../plugins/test-utils/index.mjs';
import { RxDBMigrationSchemaPlugin } from '../../plugins/migration-schema/index.mjs';
import { RxDocument } from '../../src/index.ts';
import { replicateRxCollection } from '../../plugins/replication/index.mjs';

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

        addRxPlugin(RxDBMigrationSchemaPlugin);

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
            eventReduce: true,
            ignoreDuplicate: true
        });
        // create a collection
        const collections = await db.addCollections({
            mycollection: {
                schema: mySchema
            }
        });

        // replicate the collection
        const replicationState = await replicateRxCollection<
            RxDocument,
            { index: number; }
        >({
            replicationIdentifier: 'mycollection',
            collection: collections.mycollection,
            pull: {
                initialCheckpoint: { index: 0 },
                handler: async (checkpointOrNull) => {
                    await new Promise((resolve) => setTimeout(resolve, 100));

                    let docs: any[] = [];
                    const index = checkpointOrNull?.index ?? 0;

                    if (index === 0) {
                        docs = [
                            {
                                passportId: 'foobar',
                                firstName: 'Bob',
                                lastName: 'Kelso',
                                age: 56,
                            },
                        ];
                    }

                    return {
                        checkpoint: { index: index + 1 },
                        documents: docs,
                    };
                },
            },
        });

        await replicationState.awaitInitialReplication();

        // clean up afterwards
        await db.close();

        mySchema.version = 1;

        // @ts-expect-error - add a new field to the schema
        mySchema.properties.newField = {
            type: 'string',
        };

        const db2 = await createRxDatabase({
            name,
            storage: config.storage.getStorage(),
            eventReduce: true,
            ignoreDuplicate: true
        });

        const collections2 = await db2.addCollections({
            mycollection: {
                autoMigrate: true,
                schema: mySchema,
                migrationStrategies: {
                    1: () => null,
                },
            },
        });

        const items = await collections2.mycollection.find().exec();

        assert.strictEqual(items.length, 0);

        await db2.close();
    });
});
