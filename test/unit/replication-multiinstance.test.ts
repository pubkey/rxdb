

import {
    schemaObjects,
    humansCollection,
    ensureReplicationHasNoErrors,
    randomStringWithSpecialChars,
    ensureEqualState,
    getPullHandler,
    getPushHandler
} from '../../plugins/test-utils/index.mjs';
import config from './config.ts';

import {
    RxCollection,
    randomToken
} from '../../plugins/core/index.mjs';

import {
    RxReplicationState,
    replicateRxCollection
} from '../../plugins/replication/index.mjs';

import type { HumanWithTimestampDocumentType } from '../../src/plugins/test-utils/schema-objects.ts';
import {
    REPLICATION_IDENTIFIER_TEST
} from './replication.test.ts';

type TestDocType = HumanWithTimestampDocumentType;

/**
 * Normally when used in a multiInstance environment,
 * like with multiple browser tabs, the replication should only
 * run at exactly one tab at once. This is normally ensured by the leader election.
 *
 * But there are many cases where the replication could run multiple times in parallel
 * like when the leader-election goes wrong or when it is actively started again
 * to fix the hibernated tabs in a mobile browser.
 * Also see @link https://github.com/pubkey/rxdb/issues/6810
 */

async function getTestCollections(localCollectionsAmount: number, docsAmount: { local: number; remote: number; }): Promise<{
    localCollections: RxCollection<TestDocType, {}, {}, {}>[];
    remoteCollection: RxCollection<TestDocType, {}, {}, {}>;
}> {
    const localDatabaseName = randomToken(10);
    const localCollections = await Promise.all(
        new Array(localCollectionsAmount).fill(0).map(() => humansCollection.createHumanWithTimestamp(0, localDatabaseName, true))
    );

    const remoteCollection = await humansCollection.createHumanWithTimestamp(0, randomToken(10), false);

    if (docsAmount.local > 0) {
        for (const localCollection of localCollections) {
            await localCollection.bulkInsert(
                new Array(docsAmount.local)
                    .fill(0)
                    .map(() => schemaObjects.humanWithTimestampData({
                        id: randomStringWithSpecialChars(8, 12) + '-local'
                    }))
            );
        }
    }
    if (docsAmount.remote > 0) {
        await remoteCollection.bulkInsert(
            new Array(docsAmount.remote)
                .fill(0)
                .map(() => schemaObjects.humanWithTimestampData({
                    id: randomStringWithSpecialChars(8, 12) + '-remote'
                }))
        );
    }

    return {
        localCollections,
        remoteCollection
    };
}

describe('replication-multiinstance.test.ts', () => {
    if (!config.storage.hasMultiInstance) {
        return;
    }
    it('starting the same replication twice should not error', async () => {
        if (config.storage.name === 'sqlite-trial') {
            return;
        }
        const docsPerSide = 5;
        const localCollectionsAmount = 5;
        const { localCollections, remoteCollection } = await getTestCollections(localCollectionsAmount, {
            local: docsPerSide,
            remote: docsPerSide
        });

        const batchSize = 12;
        const pullHandler = getPullHandler(remoteCollection);
        const pushHandler = getPushHandler(remoteCollection);

        const replicationStates: RxReplicationState<HumanWithTimestampDocumentType, any>[] = [];
        await Promise.all(
            localCollections.map(async (localCollection) => {
                const replicationState = replicateRxCollection({
                    collection: localCollection,
                    replicationIdentifier: REPLICATION_IDENTIFIER_TEST,
                    waitForLeadership: false,
                    live: true,
                    pull: {
                        batchSize,
                        handler: async (a, b) => {
                            const ret = await pullHandler(a, b);
                            return ret;
                        }
                    },
                    push: {
                        batchSize,
                        handler: async (docs) => {
                            const ret = await pushHandler(docs);
                            return ret;
                        }
                    }
                });
                replicationStates.push(replicationState);
                ensureReplicationHasNoErrors(replicationState);
                await replicationState.awaitInitialReplication();
            })
        );

        // ensure initial sync has worked
        await Promise.all(
            localCollections.map(async (localCollection) => {
                await ensureEqualState(localCollection, remoteCollection);
            })
        );

        // ensure it works on updates
        await Promise.all(localCollections.map((localCollection, i) => localCollection.insert(schemaObjects.humanWithTimestampData({ id: 'update-a-' + i }))));
        await Promise.all(replicationStates.map(async (replicationState) => {
            await replicationState.awaitInSync();
        }));
        for (const localCollection of localCollections) {
            await ensureEqualState(localCollection, remoteCollection);
        }

        // stop first replication and check again
        replicationStates[0].cancel();
        await Promise.all(localCollections.map(localCollection => localCollection.insert(schemaObjects.humanWithTimestampData())));
        await Promise.all(replicationStates.map(replicationState => replicationState.awaitInSync()));
        await Promise.all(
            localCollections.map(async (localCollection) => {
                await ensureEqualState(localCollection, remoteCollection);
            })
        );


        await Promise.all(localCollections.map(localCollection => localCollection.database.close()));
        await remoteCollection.database.close();
    });
});
