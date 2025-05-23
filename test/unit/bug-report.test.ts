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
import {
    replicateRxCollection,
    RxReplicationState
} from '../../plugins/replication/index.mjs';
import {
    isNode
} from '../../plugins/test-utils/index.mjs';
import { RxDBCleanupPlugin } from '../../plugins/cleanup/index.mjs';
import { Subject } from 'rxjs';

addRxPlugin(RxDBCleanupPlugin);

describe('bug-report.test.js', () => {
    it('should replicate, remove replication and start again correctly', async function () {
        const batches = [
            [
                { id: 'foobar', firstName: 'John', group: 'group1' },
                { id: 'foobar2', firstName: 'Jane', group: 'group1' }
            ]
        ];

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

        /**
         * Always generate a random database-name
         * to ensure that different test runs do not affect each other.
         */
        const name = randomToken(10);

        // create a database
        let db = await createDatabase();

        console.log('------- database created');

        const replicationDoneSubject = new Subject<boolean>();

        // Start replication, wait until it's done
        await startReplication();

        console.log('------- initial replication done');

        // Close the database and recreate it
        await db.close();
        db = await createDatabase();
        console.log('------- database recreated');

        // Re-create replication, and remove it
        await db.mycollection.find({ selector: { group: { $in: ['group1'] } } }).remove();
        await db.mycollection.cleanup(0); // If we comment out this line, the test will pass
        const { remove: removeReplication1 } = await startReplication(false);
        await removeReplication1();

        console.log('------- replication removed');

        // Re-create replication and wait until it's done
        let items: any[] = [];
        const itemsQuery = await db.mycollection.find({ selector: { group: 'group1' } }).$;
        itemsQuery.subscribe(docs => {
            const mutableDocs = docs.map(doc => doc.toMutableJSON());
            console.log(`itemsQuery ${docs.length} ${JSON.stringify(mutableDocs)}`);
            items = mutableDocs;
        });

        const { state: replicationState2 } = await startReplication();

        console.log('------- replication recreated');

        // Add a new batch that represents a document update in the database
        batches.push([
            { id: 'foobar', firstName: 'MODIFIED', group: 'group1' },
        ]);

        // Resync and wait until it's done
        let resyncDone = false;
        replicationDoneSubject.subscribe(() => {
            resyncDone = true;
        });
        await replicationState2.reSync();
        await AsyncTestUtil.waitUntil(() => resyncDone);

        console.log('------- resync done');

        // Check if the document was updated
        console.log(`------- find done ${items.length}`);

        assert.strictEqual(items.find(item => item.id === 'foobar').firstName, 'MODIFIED');
        assert.strictEqual(items.length, 2);

        // clean up afterwards
        db.close();

        async function startReplication(waitUntilDone = true) {
            let initialPullDone = false;
            let replicationState: RxReplicationState<any, { index: number; }> | null = await createReplication();
            await replicationState.start();

            if (waitUntilDone) {
                replicationDoneSubject.subscribe(() => {
                    initialPullDone = true;
                });
                await AsyncTestUtil.waitUntil(() => initialPullDone);
            }

            const cancel = async () => {
                await replicationState?.cancel();
                replicationState = null;
            };

            const remove = async () => {
                await replicationState?.remove();
                replicationState = null;
            };

            return { state: replicationState, cancel, remove };
        }

        function createReplication() {
            return replicateRxCollection<any, { index: number; }>({
                replicationIdentifier: name + 'test-replication',
                collection: db.mycollection,
                autoStart: false,
                pull: {
                    batchSize: 3,
                    handler: async (checkpoint, batchSize) => {
                        await AsyncTestUtil.wait(1000);

                        const index = checkpoint?.index ?? 0;
                        const batchDocs = batches[index];

                        console.log(`batchDocs ${index} ${batchDocs?.length}`);

                        if (!batchDocs || batchDocs.length < batchSize) {
                            console.log('finished pull');
                            replicationDoneSubject.next(true);
                        }

                        return {
                            documents: batchDocs || [],
                            checkpoint: batchDocs ? { index: index + 1 } : checkpoint,
                        };
                    }
                },
            });
        }

        async function createDatabase() {
            const database = await createRxDatabase({
                name,
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
