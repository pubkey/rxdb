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
import { replicateRxCollection } from '../../plugins/replication/index.mjs';
import { RxDBMigrationSchemaPlugin } from '../../plugins/migration-schema/index.mjs';
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

        // add the migration-plugin
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

        // create a schema to migrate to
        const mySchema2 = {
            version: 1,
            primaryKey: 'passportId',
            type: 'object',
            properties: {
                passportId: {
                    type: 'string',
                    maxLength: 100
                },
                fullName: {
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

        // create a replication state - this adds a new connected storage
        const replicationState = replicateRxCollection({
            collection: collections.mycollection,
            replicationIdentifier: 'replication-1',
            push: { handler: () => {
                return Promise.resolve([]);
            } },
            pull: { handler: () => {
                return Promise.resolve({checkpoint: null, documents: []});
            }
            }
        });

        // create another replication state - this adds an additional connected storage
        const replicationState2 = replicateRxCollection({
            collection: collections.mycollection,
            replicationIdentifier: 'replication-2',
            push: { handler: () => {
                return Promise.resolve([]);
            } },
            pull: { handler: () => {
                return Promise.resolve({checkpoint: null, documents: []});
            }
            }
        });

        // wait until initial replication is done
        await Promise.all([
            replicationState.awaitInitialReplication(),
            replicationState2.awaitInitialReplication()
        ]);

        // insert a document
        await collections.mycollection.insert({
            passportId: 'foobar',
            firstName: 'Bob',
            lastName: 'Kelso',
            age: 56
        });

        // create a database
        const db2 = await createRxDatabase({
            name,
            /**
             * By calling config.storage.getStorage(),
             * we can ensure that all variations of RxStorage are tested in the CI.
             */
            storage: config.storage.getStorage(),
            eventReduce: true,
            ignoreDuplicate: true
        });
        // create a collection with the new schema
        const collections2 = await db2.addCollections({
            mycollection: {
                schema: mySchema2,
                migrationStrategies: {
                    1: (oldDoc: any) => {
                        oldDoc.fullName = oldDoc.firstName + ' ' + oldDoc.lastName;
                        delete oldDoc.lastName;
                        delete oldDoc.firstName;
                        return oldDoc;
                    }
                }
            }
        });
        const docs = await collections2.mycollection.find().exec();
        assert.strictEqual(docs.length, 1);
        await db2.close();
    });
});
