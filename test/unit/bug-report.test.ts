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
    addRxPlugin,
    createRxDatabase,
    randomToken
} from '../../plugins/core/index.mjs';
import { replicateRxCollection } from '../../plugins/replication/index.mjs';
import { isNode } from '../../plugins/test-utils/index.mjs';
import { RxDBCleanupPlugin } from '../../plugins/cleanup/index.mjs';

addRxPlugin(RxDBCleanupPlugin);

describe('bug-report.test.js', () => {
    it('should replicate, remove replication and start again correctly', async function () {
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
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    maxLength: 100
                },
                firstName: {
                    type: 'string'
                },
                group: {
                    type: 'string'
                }
            }
        };

        let pushedItemsCount = 0;

        // Set this to false if you want to test with the first replication only.
        const executeSecondReplication = true;

        const db = await createDatabase();
        const firstReplication = createReplication('first-replication', [
            [
                { id: 'foobar', firstName: 'John', group: 'group1' },
                { id: 'foobar2', firstName: 'Jane', group: 'group1' }
            ]
        ]);
        await firstReplication.start();
        await firstReplication.awaitInitialReplication();

        if (executeSecondReplication) {
            const secondReplication = createReplication('second-replication', [[
                // It also fails if we add some documents to the second replication.
                // { id: 'foobar3', firstName: 'Peter', group: 'group2' },
                // { id: 'foobar4', firstName: 'John', group: 'group2' }
            ]]);
            await secondReplication.start();
            await secondReplication.awaitInitialReplication();
        }

        /**
         * IMPORTANT!
         * We should not have pushed any items yet.
         * Because we never added or modified anything.
         *
         * BUT EVEN SO, THE PUSH HANDLER IS CALLED.
         *
         * Is this a bug?
        */
        assert.strictEqual(pushedItemsCount, 0);

        // clean up afterwards
        db.close();


        function createReplication(identifier: string, batches: any[] = []) {
            return replicateRxCollection<any, { index: number; } | undefined>({
                replicationIdentifier: identifier,
                collection: db.mycollection,
                autoStart: false,
                pull: {
                    batchSize: 3,
                    handler: async (checkpoint) => {
                        await AsyncTestUtil.wait(1000);

                        const index = checkpoint?.index ?? 0;
                        const batchDocs = batches[index];

                        console.log(`batchDocs ${index} ${batchDocs?.length}`);

                        return {
                            documents: batchDocs || [],
                            checkpoint: batchDocs ? { index: index + 1 } : checkpoint,
                        };
                    }
                },
                push: {
                    batchSize: 3,
                    handler: async (docs: any[]) => {
                        console.log(`push ${docs.length}`);
                        pushedItemsCount += docs.length;
                        await AsyncTestUtil.wait(1000);
                        return [];
                    }
                }
            });
        }

        async function createDatabase() {
            const database = await createRxDatabase({
                name: randomToken(10),
                /**
                 * By calling config.storage.getStorage(),
                 * we can ensure that all variations of RxStorage are tested in the CI.
                 */
                storage: config.storage.getStorage(),
                cleanupPolicy: {
                    minimumDeletedTime: 0,
                },
                localDocuments: true,
            });

            // create a collection
            await database.addCollections({
                mycollection: {
                    schema: mySchema
                }
            });;

            return database;
        }
    });
});
