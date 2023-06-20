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
import AsyncTestUtil from 'async-test-util';
import config from './config';

import {
    createRxDatabase,
    randomCouchString
} from '../../';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import {RxReplicationWriteToMasterRow} from '../../src';
import {HumanWithTimestampDocumentType} from '../helper/schema-objects';
import {replicateGraphQL, RxGraphQLReplicationState} from '../../plugins/replication-graphql';
import {GraphQLServerModule} from '../helper/graphql-server';
import assert from 'assert';

function ensureReplicationHasNoErrors(replicationState: RxGraphQLReplicationState<any, any>) {
    /**
     * We do not have to unsubscribe because the observable will cancel anyway.
     */
    replicationState.error$.subscribe(err => {
        console.error('ensureReplicationHasNoErrors() has error:');
        console.dir(err.parameters.errors);
        console.log(JSON.stringify(err.parameters.errors, null, 4));
        throw err;
    });
}

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
            humans: {
                schema: schemas.humanWithTimestampAllIndex
            }
        });

        const collection = collections.humans;

        const REQUIRE_FUN = require;
        const SpawnServer: GraphQLServerModule = REQUIRE_FUN('../helper/graphql-server');
        const batchSize = 5 as const;
        const pullQueryBuilder = (checkpoint: any, limit: number) => {
            if (!checkpoint) {
                checkpoint = {
                    id: '',
                    updatedAt: 0
                };
            }
            const query = `query FeedForRxDBReplication($checkpoint: CheckpointInput, $limit: Int!) {
            feedForRxDBReplication(checkpoint: $checkpoint, limit: $limit) {
                documents {
                    id
                    name
                    age
                    updatedAt
                    deleted
                }
                checkpoint {
                    id
                    updatedAt
                }
            }
        }`;
            const variables = {
                checkpoint,
                limit
            };
            return Promise.resolve({
                query,
                variables
            });
        };
        const pullStreamQueryBuilder = (headers: { [k: string]: string; }) => {
            const query = `subscription onHumanChanged($headers: Headers) {
            humanChanged(headers: $headers) {
                documents {
                    id,
                    name,
                    age,
                    updatedAt,
                    deleted
                },
                checkpoint {
                    id
                    updatedAt
                }
            }
        }`;
            return {
                query,
                variables: {
                    headers
                }
            };
        };
        const pushQueryBuilder = (rows: RxReplicationWriteToMasterRow<HumanWithTimestampDocumentType>[]) => {
            if (!rows || rows.length === 0) {
                throw new Error('test pushQueryBuilder(): called with no docs');
            }
            const query = `
        mutation CreateHumans($writeRows: [HumanWriteRow!]) {
            writeHumans(writeRows: $writeRows) {
                id
                name
                age
                updatedAt
                deleted
            }
        }
        `;
            const variables = {
                writeRows: rows
            };
            return Promise.resolve({
                query,
                variables
            });
        };
        const server = await SpawnServer.spawn();
        const replicationState = replicateGraphQL<schemaObjects.HumanWithTimestampDocumentType, any>({
            collection,
            url: server.url,
            pull: {
                batchSize,
                queryBuilder: pullQueryBuilder,
                streamQueryBuilder: pullStreamQueryBuilder,
            },
            push: {
                batchSize,
                queryBuilder: pushQueryBuilder
            },
            live: true,
            deletedField: 'deleted'
        });
        ensureReplicationHasNoErrors(replicationState);

        await replicationState.awaitInitialReplication();

        await replicationState.cancel();

        let error;
        const result = await db.destroy().catch(e => error = e);

        /*
         * assert things,
         * here your tests should fail to show that there is a bug
         */
        assert.strictEqual(error, undefined);
        assert.strictEqual(result, true);

        // you can also wait for events
        const emitted = [];
        await AsyncTestUtil.waitUntil(() => emitted.length === 1);

        // clean up afterwards
        db.destroy();
    });
});
