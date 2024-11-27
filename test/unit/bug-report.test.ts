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
    randomToken,
    RxReplicationWriteToMasterRow,
} from '../../plugins/core/index.mjs';
import {
    HumanWithTimestampDocumentType,
    isNode,
    schemaObjects,
    schemas,
} from '../../plugins/test-utils/index.mjs';
import { replicateGraphQL } from '../../plugins/replication-graphql/index.mjs';
import { firstValueFrom, interval, race } from 'rxjs';
import { startReplicationOnLeaderShip } from '../../plugins/replication/index.mjs';
import { spawn } from '../helper/graphql-server.ts';
describe('bug-report.test.js', () => {
    const batchSize = 5 as const;
    const pullQueryBuilder = (checkpoint: any, limit: number) => {
        if (!checkpoint) {
            checkpoint = {
                id: '',
                updatedAt: 0,
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
            limit,
        };
        return Promise.resolve({
            query,
            operationName: 'FeedForRxDBReplication',
            variables,
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
            operationName: 'onHumanChanged',
            variables: {
                headers,
            },
        };
    };
    const pushQueryBuilder = (
        rows: RxReplicationWriteToMasterRow<HumanWithTimestampDocumentType>[]
    ) => {
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
            writeRows: rows,
        };
        return Promise.resolve({
            query,
            operationName: 'CreateHumans',
            variables,
        });
    };

    it(`
        should fail because it reproduces the bug #6515

        Given multiple clients using GraphQL replication
        And using Websocket protocol
        When the Websocket connection is closed
        Then an error should be published
        `, async () => {
        if (!isNode) {
            return;
        }

        const server = await spawn();
        server.requireHeader('token', 'Bearer token');

        const { db, replication } = await rxdbInitialize();
        const { db: db2, replication: replication2 } = await rxdbInitialize();

        await db.humans.upsert(schemaObjects.humanWithTimestampData());

        await firstValueFrom(race(replication.sent$, interval(1000)));
        let [remoteEvents, errors] = await Promise.all([
            firstValueFrom(race(replication.remoteEvents$, replication2.remoteEvents$, interval(1000))),
            firstValueFrom(race(replication.error$, replication2.error$, interval(1000)))
        ]);
        await firstValueFrom(race(replication2.received$, interval(1000)));

        let numHumans = await db.humans.count({}).exec();
        let numHumans2 = await db2.humans.count({}).exec();

        assert.equal(server.getDocuments().length, numHumans);
        assert.equal(numHumans2, numHumans);
        assert.ok(!errors, 'There is Errors');
        assert.ok(remoteEvents, 'There is no remote events');

        server.subServer.dispose();

        await db.humans.upsert(schemaObjects.humanWithTimestampData());

        await firstValueFrom(race(replication.sent$, interval(1000)));
        [remoteEvents, errors] = await Promise.all([
            firstValueFrom(race(replication.remoteEvents$, replication2.remoteEvents$, interval(1000))),
            firstValueFrom(race(replication.error$, replication2.error$, interval(1000)))
        ]);
        await firstValueFrom(race(replication2.received$, interval(1000)));

        numHumans = await db.humans.count({}).exec();
        numHumans2 = await db2.humans.count({}).exec();

        assert.equal(server.getDocuments().length, numHumans);
        assert.notEqual(numHumans2, numHumans);
        assert.ok(!remoteEvents, 'There is remote events');
        assert.ok(errors, 'There is no errors');

        async function rxdbInitialize() {
            const rxdb = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                ignoreDuplicate: true,
            });

            const collection = await rxdb.addCollections({
                humans: {
                    schema: schemas.humanWithTimestampAllIndex,
                },
            });

            const replicationState = replicateGraphQL({
                replicationIdentifier: server.url.http ?? '',
                collection: collection.humans,
                url: server.url,
                pull: {
                    batchSize,
                    queryBuilder: pullQueryBuilder,
                    streamQueryBuilder: pullStreamQueryBuilder,
                    includeWsHeaders: true,
                },
                headers: {
                    token: 'Bearer token',
                },
                push: {
                    batchSize,
                    queryBuilder: pushQueryBuilder,
                },
                live: true,
                deletedField: 'deleted',
                autoStart: false,
                waitForLeadership: true,
            });

            await startReplicationOnLeaderShip(true, replicationState);

            await replicationState.start();
            return { db: rxdb, replication: replicationState };
        }
    });
});
