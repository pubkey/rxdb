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
import config from './config';

import {
    createRxDatabase,
    randomCouchString,
    addRxPlugin
} from '../../';
import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder';
import { replicateRxCollection } from '../../src/plugins/replication';
import { lastOfArray } from 'event-reduce-js';
import { Subject } from 'rxjs';
import { RxReplicationPullStreamItem } from '../../src';

describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async () => {

        /**
         * If your test should only run in nodejs or only run in the browser,
         * you should comment in the return operator and adapt the if statement.
        //  */
        // if (
        //     // !config.platform.isNode() // runs only in node
        //     // config.platform.isNode() // runs only in the browser
        // ) {
        //     // return;
        // }

        if (!config.storage.hasMultiInstance) {
            return;
        }

        // create a schema
        const mySchema = {
            title: 'test',
            type: 'object',
            version: 0,
            primaryKey: {
                key: 'id',
                fields: ['userId', 'projectId'],
                separator: '|'
            },
            properties: {
                id: {
                    type: 'string',
                    maxLength: 73
                },
                userId: {
                    type: 'string',
                    final: true,
                    maxLength: 36
                },
                projectId: {
                    type: 'string',
                    final: true,
                    maxLength: 36
                },
                updatedAt: {
                    type: 'string',
                    format: 'date-time'
                }
            },
            required: [
                'id',
                'userId',
                'projectId',
                'updatedAt'
            ]
        };
        // addRxPlugin(RxQuery)
        // generate a random database-name
        const name = randomCouchString(10);

        addRxPlugin(RxDBQueryBuilderPlugin);
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

        // insert a document
        await collections.mycollection.insert({
            userId: '2ef7bf4a-d03d-4b3c-acc3-4237532c3fc7',
            projectId: '50f739af-8b11-4b0c-bf8d-c03fad94555a',
            updatedAt: new Date().toISOString()
        });

        /**
         * to simulate the event-propagation over multiple browser-tabs,
         * we create the same database again
         */
        const dbInOtherTab = await createRxDatabase({
            name,
            storage: config.storage.getStorage(),
            eventReduce: true,
            ignoreDuplicate: true
        });

        // create a collection with a composite primary key
        const collectionInOtherTab = await dbInOtherTab.addCollections({
            mycollection: {
                schema: mySchema
            }
        });

        // find the document in the other tab
        const myDocument = await collectionInOtherTab.mycollection
            .findOne()
            .where('userId')
            .eq('2ef7bf4a-d03d-4b3c-acc3-4237532c3fc7')
            .exec();

        /*
         * when inserting documents everything works fine,
         */
        assert.strictEqual(myDocument.id, '2ef7bf4a-d03d-4b3c-acc3-4237532c3fc7|50f739af-8b11-4b0c-bf8d-c03fad94555a');

        type CheckpointType = {
            id: string;
            updatedAt: string;
        };
        let fetched = false;

        const pullStream$ = new Subject<RxReplicationPullStreamItem<any, CheckpointType>>();

        replicateRxCollection({
            replicationIdentifier: 'replicate-' + name,
            collection: db.collections.mycollection,
            pull: {
                async handler(lastCheckpoint: CheckpointType) {
                    const docs = (fetched) ? [] : [{
                        userId: '627b696f-6c1f-4aac-9d60-c876fb0b175c',
                        projectId: 'b1ebbec0-58c4-4364-9b4b-a32665276c0f',
                        updatedAt: new Date().toISOString()
                    }];

                    fetched = true;

                    const lastDoc = lastOfArray(docs);
                    return {
                        documents: docs,
                        checkpoint: !lastDoc
                            ? lastCheckpoint
                            : {
                                id: lastDoc.userId + '|' + lastDoc.projectId,
                                updatedAt: lastDoc.updatedAt
                            }
                    };
                },
                batchSize: 1,
                stream$: pullStream$.asObservable()
            },
        });


        // you can also wait for events
        const emitted = [];
        const sub = collectionInOtherTab.mycollection
            .findOne().$
            .subscribe(doc => emitted.push(doc));
        await AsyncTestUtil.waitUntil(() => emitted.length === 1);

        // clean up afterwards
        sub.unsubscribe();
        db.destroy();
        dbInOtherTab.destroy();
    });
});
