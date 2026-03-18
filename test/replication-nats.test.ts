import assert from 'assert';
import config from './unit/config.ts';
import {
    randomToken,
    RxCollection,
    WithDeleted,
    addRxPlugin
} from '../plugins/core/index.mjs';

import {
    humansCollection,
    ensureReplicationHasNoErrors,
    HumanWithTimestampDocumentType,
    runReplicationBaseTestSuite
} from '../plugins/test-utils/index.mjs';

import {
    replicateNats,
    RxNatsReplicationState
} from '../plugins/replication-nats/index.mjs';
import {
    DeliverPolicy,
    JSONCodec,
    connect
} from 'nats';
import { wait, waitUntil } from 'async-test-util';
import { RxDBDevModePlugin } from '../plugins/dev-mode/index.mjs';

const connectionSettings = { servers: 'localhost:4222' };
const connectionStatePromise = (async () => {
    const jc = JSONCodec();
    const nc = await connect(connectionSettings);
    const jsm = await nc.jetstreamManager();
    const js = nc.jetstream();
    return {
        jc,
        nc,
        jsm,
        js
    };
})();

/**
 * The tests for the NATS replication plugin
 * do not run in the normal test suite
 * because it is too slow to setup the NATS backend.
 */
describe('replication-nats.test.js', () => {
    addRxPlugin(RxDBDevModePlugin);
    assert.ok(config);
    /**
     * Use a low batchSize in all tests
     * to make it easier to test boundaries.
     */
    const batchSize = 5;
    type TestDocType = HumanWithTimestampDocumentType;
    async function getAllDocsOfServer(
        name: string
    ): Promise<TestDocType[]> {
        const connectionState = await connectionStatePromise;
        await connectionState.jsm.streams.add({
            name,
            subjects: [
                name + '.*'
            ]
        });
        const consumer = await connectionState.js.consumers.get(name, {
            deliver_policy: DeliverPolicy.LastPerSubject
        });
        const messageResponse = await consumer.fetch();
        await (messageResponse as any).signal;
        await messageResponse.close();
        const useMessages: WithDeleted<TestDocType>[] = [];
        for await (const m of messageResponse) {
            useMessages.push(m.json());
            m.ack();
        }
        return useMessages;
    }

    function syncNats<RxDocType = TestDocType>(
        collection: RxCollection<RxDocType>,
        natsName: string
    ): RxNatsReplicationState<RxDocType> {
        const replicationState = replicateNats<RxDocType>({
            collection,
            replicationIdentifier: 'nats-' + natsName,
            streamName: natsName,
            subjectPrefix: natsName,
            connection: connectionSettings,
            pull: {
                batchSize
            },
            push: {
                batchSize
            }
        });
        ensureReplicationHasNoErrors(replicationState);
        return replicationState;
    }


    describe('init', () => {
        it('wait for server to be reachable', async () => {
            await connectionStatePromise;
            console.log('--');
            await waitUntil(async () => {
                const collection = await humansCollection.createHumanWithTimestamp(2, undefined, false);

                const natsName = randomToken(10);

                console.log('################ 0.1');

                const replicationState = syncNats(collection, natsName);
                ensureReplicationHasNoErrors(replicationState);
                console.log('################ 0.2');
                await replicationState.awaitInitialReplication();
                console.log('################ 0.3');

                const ret = await Promise.race([
                    replicationState.awaitInitialReplication().then(() => true),
                    wait(1000).then(() => false)
                ]);
                await collection.database.close();

                console.log('ret: ' + ret);
                return ret;

            });
        });
    });

    /**
     * Run the base test suite that is shared
     * across all replication plugins.
     */
    let baseNatsName = randomToken(10);
    runReplicationBaseTestSuite({
        startReplication(collection) {
            const replicationState = replicateNats({
                collection,
                replicationIdentifier: 'nats-base-' + baseNatsName,
                streamName: baseNatsName,
                subjectPrefix: baseNatsName,
                connection: connectionSettings,
                pull: {
                    batchSize
                },
                push: {
                    batchSize
                }
            });
            ensureReplicationHasNoErrors(replicationState);
            return replicationState;
        },
        async syncOnce(collection) {
            const natsName = baseNatsName;
            const replicationState = replicateNats({
                collection,
                replicationIdentifier: 'nats-once-' + natsName,
                streamName: natsName,
                subjectPrefix: natsName,
                connection: connectionSettings,
                live: false,
                pull: {},
                push: {},
            });
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();
        },
        getAllServerDocs() {
            return getAllDocsOfServer(baseNatsName);
        },
        async cleanUpServer() {
            // Use a fresh stream name to avoid stale data from previous tests.
            await Promise.resolve();
            baseNatsName = randomToken(10);
        },
        softDeletes: true,
        isDeleted: (doc) => !!(doc as any)._deleted,
        getPrimaryOfServerDoc: (doc) => doc.passportId,
    });
});
