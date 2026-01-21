/**
 * Tests illustrating stuck downstream issues.
 */

import assert from 'assert';
import { clone, waitUntil } from 'async-test-util';

import config, { describeParallel } from './config.ts';
import {
    schemaObjects,
    humansCollection,
    ensureReplicationHasNoErrors,
    getPullHandler,
    getPushHandler,
    getPullStream
} from '../../plugins/test-utils/index.mjs';

import {
    RxCollection,
    randomToken
} from '../../plugins/core/index.mjs';

import {
    replicateRxCollection
} from '../../plugins/replication/index.mjs';

import type { HumanWithTimestampDocumentType } from '../../src/plugins/test-utils/schema-objects.ts';

type TestDocType = HumanWithTimestampDocumentType;

describeParallel('replication-downstream.test.ts', () => {
    if (!config.storage.hasReplication) {
        return;
    }

    async function getTestCollections() {
        const localCollection = await humansCollection.createHumanWithTimestamp(0, randomToken(10), false);
        const remoteCollection = await humansCollection.createHumanWithTimestamp(0, randomToken(10), false);
        return { localCollection, remoteCollection };
    }

    function setupReplication(
        localCollection: RxCollection<TestDocType>,
        remoteCollection: RxCollection<TestDocType>
    ) {
        return replicateRxCollection<TestDocType, any>({
            collection: localCollection,
            replicationIdentifier: 'downstream-test',
            live: true,
            pull: {
                handler: getPullHandler(remoteCollection),
                stream$: getPullStream(remoteCollection)
            },
            push: {
                handler: getPushHandler(remoteCollection)
            }
        });
    }

    /**
     * Simulates a crash between fork write and meta write in downstream.
     *
     * When the process dies after forkInstance.bulkWrite() succeeds but before
     * metaInstance.bulkWrite() completes, the fork has the new state but the
     * assumed master in meta is stale. On the next downstream cycle, this
     * mismatch is detected as a "non-upstream-replicated local write" and the
     * document is skipped — expecting upstream to resolve the conflict. But
     * upstream never picks it up because the fork write came from downstream,
     * leaving the document permanently stuck.
     */
    it('should recover downstream sync after meta write is lost between fork and meta write (simulated crash)', async () => {
        const { localCollection, remoteCollection } = await getTestCollections();
        const docId = 'crash-test-doc';

        // Insert initial document on remote
        await remoteCollection.insert(schemaObjects.humanWithTimestampData({
            id: docId,
            name: 'Initial',
            age: 1
        }));

        // Start replication and let it sync the initial document
        const replicationState = setupReplication(localCollection, remoteCollection);
        ensureReplicationHasNoErrors(replicationState);
        await replicationState.awaitInitialReplication();

        // Verify initial sync
        const initialLocal = await localCollection.findOne(docId).exec(true);
        assert.strictEqual(initialLocal.name, 'Initial');

        // Monkey-patch metaInstance.bulkWrite to silently drop the next
        // downstream meta write — simulating a crash between fork and meta write.
        const metaInstance = replicationState.internalReplicationState.input.metaInstance;
        const originalBulkWrite = metaInstance.bulkWrite.bind(metaInstance);
        let metaWriteDropped = false;

        metaInstance.bulkWrite = function (rows: any[], context: string) {
            if (context === 'replication-down-write-meta' && !metaWriteDropped) {
                metaWriteDropped = true;
                // Silently swallow the write: fork already persisted, meta is lost.
                return Promise.resolve({ success: [], error: [] });
            }
            return originalBulkWrite(rows, context);
        } as any;

        // Update the document on remote.
        // Downstream will write the new state to the fork, but the
        // corresponding meta write is silently dropped above.
        const remoteDoc = await remoteCollection.findOne(docId).exec(true);
        await remoteDoc.incrementalPatch({
            name: 'FirstUpdate',
            age: 2
        });

        // Wait for the downstream cycle to finish
        const internalState = replicationState.internalReplicationState;
        let prevDown = internalState.streamQueue.down;
        await waitUntil(() => internalState.streamQueue.down !== prevDown, 1000, 10);
        await internalState.streamQueue.down;

        assert.ok(metaWriteDropped, 'Meta write should have been intercepted and dropped');
        const afterFirst = await localCollection.findOne(docId).exec(true);
        assert.strictEqual(afterFirst.name, 'FirstUpdate');

        // Restore original bulkWrite so meta works normally again.
        metaInstance.bulkWrite = originalBulkWrite;

        // At this point the replication state is:
        //   forkState       = { name: 'FirstUpdate', age: 2 }
        //   assumedMaster   = { name: 'Initial', age: 1 }      (stale — meta write was lost)
        //
        // Downstream will see forkState != assumedMaster and treat it as a
        // "non-upstream-replicated local write", skipping the document.

        // Update the document on remote again.
        prevDown = internalState.streamQueue.down;
        const remoteDoc2 = await remoteCollection.findOne(docId).exec(true);
        await remoteDoc2.incrementalPatch({
            name: 'SecondUpdate',
            age: 3
        });

        // Wait for downstream to finish processing, then verify it recovered.
        await waitUntil(() => internalState.streamQueue.down !== prevDown, 1000, 10);
        await internalState.streamQueue.down;

        const localDoc = await localCollection.findOne(docId).exec(true);
        assert.strictEqual(localDoc.name, 'SecondUpdate');
        assert.strictEqual(localDoc.age, 3);

        await replicationState.cancel();
        await localCollection.database.close();
        await remoteCollection.database.close();
    });

    it('should sync downstream updates when local and remote have different documents', async () => {
        const { localCollection, remoteCollection } = await getTestCollections();

        const docId = 'different-doc';

        // Insert different documents in each
        await remoteCollection.insert(schemaObjects.humanWithTimestampData({
            id: docId,
            name: 'RemoteDocument',
            age: 10
        }));
        await localCollection.insert(schemaObjects.humanWithTimestampData({
            id: docId,
            name: 'LocalDocument',
            age: 20
        }));

        // Start replication
        const replicationState = setupReplication(localCollection, remoteCollection);
        ensureReplicationHasNoErrors(replicationState);

        await replicationState.awaitInitialReplication();
        await replicationState.awaitInSync();

        // Update document on remote
        const internalState = replicationState.internalReplicationState;
        const prevDown = internalState.streamQueue.down;
        const remoteDoc = await remoteCollection.findOne(docId).exec(true);
        await remoteDoc.incrementalPatch({
            name: 'UpdatedFromRemote',
            age: 999
        });

        // Wait for downstream cycle to complete
        await waitUntil(() => internalState.streamQueue.down !== prevDown, 1000, 10);
        await internalState.streamQueue.down;

        // Verify local received the update
        const localDoc = await localCollection.findOne(docId).exec(true);
        assert.strictEqual(localDoc.name, 'UpdatedFromRemote');
        assert.strictEqual(localDoc.age, 999);

        await replicationState.cancel();
        await localCollection.database.close();
        await remoteCollection.database.close();
    });

    it('should sync downstream updates when local and remote have identical documents', async () => {
        const { localCollection, remoteCollection } = await getTestCollections();

        const docId = 'identical-doc';
        const docData = schemaObjects.humanWithTimestampData({
            id: docId,
            name: 'SharedDocument',
            age: 25
        });

        // Insert identical document in both before replication
        await remoteCollection.insert(clone(docData));
        await localCollection.insert(clone(docData));

        // Start replication
        const replicationState = setupReplication(localCollection, remoteCollection);
        ensureReplicationHasNoErrors(replicationState);

        await replicationState.awaitInitialReplication();
        await replicationState.awaitInSync();

        // Update document on remote
        const internalState = replicationState.internalReplicationState;
        const prevDown = internalState.streamQueue.down;
        const remoteDoc = await remoteCollection.findOne(docId).exec(true);
        await remoteDoc.incrementalPatch({
            name: 'UpdatedFromRemote',
            age: 999
        });

        // Wait for downstream cycle to complete
        await waitUntil(() => internalState.streamQueue.down !== prevDown, 1000, 10);
        await internalState.streamQueue.down;

        // Verify local received the update
        const localDoc = await localCollection.findOne(docId).exec(true);
        assert.strictEqual(localDoc.name, 'UpdatedFromRemote');
        assert.strictEqual(localDoc.age, 999);

        await replicationState.cancel();
        await localCollection.database.close();
        await remoteCollection.database.close();
    });
});
