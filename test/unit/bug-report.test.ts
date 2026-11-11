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
import { waitUntil } from 'async-test-util';

import { randomToken } from '../../plugins/core/index.mjs';
import {
    schemaObjects,
    humansCollection,
    getPullHandler,
    getPushHandler
} from '../../plugins/test-utils/index.mjs';
import { replicateRxCollection } from '../../plugins/replication/index.mjs';
import type { HumanWithTimestampDocumentType } from '../../src/plugins/test-utils/schema-objects.ts';

describe('bug-report.test.js', () => {
    /**
     * A push reaches the master, but the app is closed (page reload, crash) before
     * the response arrives, so the meta instance never stores the pushed state as
     * the assumed master state. After the restart, the user changes the document again.
     * The next push is sent against the old assumed master state, the master returns
     * the device's own earlier write as a conflict, and the default conflict handler
     * replaces the newer local write with it.
     */
    it('should not lose a local write made after a restart interrupted a push that reached the master', async () => {
        const localCollection = await humansCollection.createHumanWithTimestamp(0, randomToken(10), false);
        const remoteCollection = await humansCollection.createHumanWithTimestamp(0, randomToken(10), false);
        const basePushHandler = getPushHandler(remoteCollection);
        const replicationIdentifier = randomToken(10);
        const docId = 'restart-doc';
        await localCollection.insert(schemaObjects.humanWithTimestampData({ id: docId, name: 'v1' }));

        // first run: syncs v1, then pushes v2, which reaches the master, but the response is lost
        let loseResponse = false;
        let lostResponses = 0;
        const firstRun = replicateRxCollection<HumanWithTimestampDocumentType, any>({
            collection: localCollection,
            replicationIdentifier,
            live: true,
            pull: { handler: getPullHandler(remoteCollection) },
            push: {
                handler: async (rows) => {
                    const result = await basePushHandler(rows);
                    if (loseResponse) {
                        lostResponses++;
                        throw new Error('response lost');
                    }
                    return result;
                }
            },
            retryTime: 60 * 1000
        });
        await firstRun.awaitInSync();
        loseResponse = true;
        const doc = await localCollection.findOne(docId).exec(true);
        await doc.incrementalPatch({ name: 'v2' });
        await waitUntil(() => lostResponses === 1);
        await firstRun.cancel();

        // the user edits after the restart, before the second run starts
        const docAfterRestart = await localCollection.findOne(docId).exec(true);
        await docAfterRestart.incrementalPatch({ name: 'v3' });

        const secondRun = replicateRxCollection<HumanWithTimestampDocumentType, any>({
            collection: localCollection,
            replicationIdentifier,
            live: true,
            pull: { handler: getPullHandler(remoteCollection) },
            push: { handler: basePushHandler },
            retryTime: 50
        });
        await secondRun.awaitInSync();

        const localDoc = await localCollection.findOne(docId).exec(true);
        assert.strictEqual(localDoc.name, 'v3', 'the local write after the restart must not be overwritten');
        const remoteDoc = await remoteCollection.findOne(docId).exec(true);
        assert.strictEqual(remoteDoc.name, 'v3');

        localCollection.database.close();
        remoteCollection.database.close();
    });
});
