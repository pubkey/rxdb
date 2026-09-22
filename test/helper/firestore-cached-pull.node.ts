import assert from 'node:assert/strict';
import { mock } from 'node:test';
import * as sdk from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { createRxDatabase, randomToken, ensureNotFalsy } from '../../plugins/core/index.mjs';
import { getRxStorageMemory } from '../../plugins/storage-memory/index.mjs';
import type { FirestoreCheckpointType } from '../../plugins/replication-firestore/index.mjs';

const timestamp = sdk.Timestamp.fromDate(new Date('2026-09-22T10:39:32.000Z'));
const scenario = process.argv[2];
const ids = ['a', 'b', 'c', 'd'];
const initialCheckpoint = ['initial', 'non-live', 'cancel'].includes(scenario) ? undefined : {
    id: 'a', serverTimestamp: timestamp.toDate().toISOString()
};
const expectedIds = initialCheckpoint ? ids.slice(1) : ids;
let cached = true;
let readCount = 0;

mock.module('firebase/firestore', {
    namedExports: {
        ...sdk,
        waitForPendingWrites: async () => {},
        runTransaction: (_database: unknown, update: (tx: unknown) => unknown) => Promise.resolve(update({})),
        onSnapshot: () => () => {},
        getDocs: (readQuery: sdk.Query) => {
            readCount++;
            const matches = (checkpoint?: FirestoreCheckpointType, sameTime = false) => sdk.queryEqual(readQuery,
                checkpoint ? sameTime ? sdk.query(firestoreCollection,
                    sdk.where('serverTimestamp', '==', timestamp),
                    sdk.where(sdk.documentId(), '>', checkpoint.id),
                    sdk.orderBy(sdk.documentId(), 'asc'), sdk.limit(10)
                ) : sdk.query(firestoreCollection,
                    sdk.where('serverTimestamp', '>', timestamp),
                    sdk.orderBy('serverTimestamp', 'asc'), sdk.limit(10)
                ) : sdk.query(firestoreCollection,
                    sdk.orderBy('serverTimestamp', 'asc'), sdk.limit(10)
                ));
            const lastCheckpoint = { id: 'd', serverTimestamp: timestamp.toDate().toISOString() };
            assert.ok(matches() || matches(lastCheckpoint) || matches(lastCheckpoint, true) ||
                matches(initialCheckpoint) || matches(initialCheckpoint, true));
            const hasSiblings = !!initialCheckpoint && matches(initialCheckpoint, true);
            const isSameTimeQuery = hasSiblings || matches(lastCheckpoint, true);
            const fromCache = cached && (!initialCheckpoint || (scenario === 'same-time' ? isSameTimeQuery : !isSameTimeQuery));
            const resultIds = matches() || hasSiblings ? (fromCache ? ['d'] : expectedIds) : [];
            return Promise.resolve({
                docs: resultIds.map(id => ({ id, data: () => ({ serverTimestamp: timestamp }) })),
                metadata: { fromCache, hasPendingWrites: false }
            });
        }
    }
});

const { replicateFirestore } = await import('../../plugins/replication-firestore/index.mjs');
const app = initializeApp({ projectId: 'cached-pull-test' }, randomToken(10));
const database = sdk.getFirestore(app);
const firestoreCollection = sdk.collection(database, 'docs');
const db = await createRxDatabase({
    name: randomToken(10), storage: getRxStorageMemory(), multiInstance: false
});
await db.addCollections({ docs: { schema: {
    version: 0, primaryKey: 'id', type: 'object',
    properties: { id: { type: 'string', maxLength: 100 } }, required: ['id']
} } });
const state = replicateFirestore({
    collection: db.docs,
    replicationIdentifier: 'cached-pull-test',
    firestore: { projectId: 'cached-pull-test', database, collection: firestoreCollection },
    pull: { batchSize: 10, initialCheckpoint }, live: scenario !== 'non-live', autoStart: false, retryTime: 5000
});
const errors: unknown[] = [];
state.error$.subscribe(error => errors.push(error));
let signalRetry = () => {};
const retryStarted = new Promise<void>(resolve => {
 signalRetry = resolve;
});
let releaseRetry = () => {};
const retryFinished = new Promise<void>(resolve => {
 releaseRetry = resolve;
});
const originalWait = db.docs.promiseWait.bind(db.docs);
const retryDelays: number[] = [];
mock.method(db.docs, 'promiseWait', (time: number) => {
    if (time === state.retryTime) {
        retryDelays.push(time);
        signalRetry();
        return retryFinished;
    }
    return originalWait(time);
});
try {
    const started = state.start();
    const inSync = state.awaitInSync();
    const result = await Promise.race([
        inSync.then(() => 'synced'),
        retryStarted.then(() => 'retry')
    ]);
    assert.deepEqual(ensureNotFalsy(state.internalReplicationState).lastCheckpointDoc.down?.checkpointData, initialCheckpoint);
    assert.equal(result, 'retry');
    assert.equal((await db.docs.find().exec()).length, 0);
    assert.equal(readCount, initialCheckpoint ? 2 : 1);
    assert.deepEqual(retryDelays, [state.retryTime]);
    assert.deepEqual(errors, []);

    if (scenario === 'cancel') {
        const readsAtCancellation = readCount;
        await state.cancel();
        releaseRetry();
        await new Promise<void>(resolve => setImmediate(resolve));
        assert.equal(readCount, readsAtCancellation);
        assert.equal((await db.docs.find().exec()).length, 0);
    } else {
        cached = false;
        releaseRetry();
        await inSync;
        assert.deepEqual((await db.docs.find().exec()).map(document => document.primary).sort(), expectedIds);
        assert.deepEqual(ensureNotFalsy(state.internalReplicationState).lastCheckpointDoc.down?.checkpointData, {
            id: 'd', serverTimestamp: timestamp.toDate().toISOString()
        });
    }
    await started;
    assert.deepEqual(errors, []);
} finally {
    releaseRetry();
    await state.cancel();
    await db.remove();
    await sdk.terminate(database);
    await deleteApp(app);
    mock.restoreAll();
}
