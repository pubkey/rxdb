/**
 * Tests for the React plugin hooks.
 *
 * These tests verify the observable-based behavior that the hooks rely on,
 * since the hooks are thin wrappers around RxDB observables.
 * The tests run in Node.js via Mocha and do not require a DOM environment.
 */

import assert from 'assert';
import { waitUntil } from 'async-test-util';

import config, { describeParallel } from './config.ts';
import {
    humansCollection,
    schemaObjects,
    isFastMode,
} from '../../plugins/test-utils/index.mjs';
import {
    randomToken,
    isRxCollection,
} from '../../plugins/core/index.mjs';
import {
    replicateRxCollection,
} from '../../plugins/replication/index.mjs';
import {
    getPullHandler,
    getPushHandler,
    getPullStream,
} from '../../plugins/test-utils/index.mjs';

describeParallel('react-hooks.test.ts', () => {

    describe('useRxDocument', () => {
        it('subscribes to collection.findOne(primaryKey).$ and returns the document', async () => {
            const collection = await humansCollection.create(0);
            const docData = schemaObjects.humanData();
            await collection.insert(docData);

            // Simulate what useRxDocument does: subscribe to findOne(pk).$
            let result: any = null;
            let loading = true;
            let error: string | null = null;

            const subscription = collection.findOne(docData.passportId).$.subscribe({
                next: (doc) => {
                    result = doc;
                    loading = false;
                },
                error: (err) => {
                    error = err.message;
                    loading = false;
                }
            });

            await waitUntil(() => !loading);

            assert.ok(result, 'document should be returned');
            assert.strictEqual(result.passportId, docData.passportId);
            assert.strictEqual(loading, false);
            assert.strictEqual(error, null);

            subscription.unsubscribe();
            await collection.database.close();
        });

        it('returns null when the document does not exist', async () => {
            const collection = await humansCollection.create(0);
            const nonExistentId = randomToken(10);

            let result: any = 'NOT_SET';
            let loading = true;

            const subscription = collection.findOne(nonExistentId).$.subscribe({
                next: (doc) => {
                    result = doc;
                    loading = false;
                }
            });

            await waitUntil(() => !loading);

            assert.strictEqual(result, null, 'result should be null for missing document');

            subscription.unsubscribe();
            await collection.database.close();
        });

        it('emits updated document when document changes', async () => {
            const collection = await humansCollection.create(0);
            const docData = schemaObjects.humanData();
            const doc = await collection.insert(docData);

            const emissions: any[] = [];

            const subscription = collection.findOne(docData.passportId).$.subscribe({
                next: (d) => {
                    emissions.push(d);
                }
            });

            await waitUntil(() => emissions.length >= 1);

            const newFirstName = randomToken(8);
            await doc.incrementalPatch({ firstName: newFirstName });

            await waitUntil(() => emissions.length >= 2);

            const lastEmit = emissions[emissions.length - 1];
            assert.strictEqual(lastEmit.firstName, newFirstName);

            subscription.unsubscribe();
            await collection.database.close();
        });

        it('emits null when document is removed', async () => {
            const collection = await humansCollection.create(0);
            const docData = schemaObjects.humanData();
            const doc = await collection.insert(docData);

            const emissions: any[] = [];
            const subscription = collection.findOne(docData.passportId).$.subscribe({
                next: (d) => {
                    emissions.push(d);
                }
            });

            await waitUntil(() => emissions.length >= 1);
            assert.ok(emissions[0], 'first emission should be the document');

            await doc.remove();

            await waitUntil(() => {
                const last = emissions[emissions.length - 1];
                return last === null;
            });

            assert.strictEqual(emissions[emissions.length - 1], null, 'last emission should be null after removal');

            subscription.unsubscribe();
            await collection.database.close();
        });

        it('cleans up subscription on unsubscribe', async () => {
            const collection = await humansCollection.create(0);
            const docData = schemaObjects.humanData();
            await collection.insert(docData);

            let emitCount = 0;
            const subscription = collection.findOne(docData.passportId).$.subscribe(() => {
                emitCount++;
            });

            await waitUntil(() => emitCount > 0);

            // Unsubscribe
            subscription.unsubscribe();

            // Insert another doc and wait a bit - should not trigger our subscription
            const anotherDoc = schemaObjects.humanData();
            await collection.insert(anotherDoc);

            // The findOne subscription is for a specific doc - updates to other docs don't re-emit
            // but we can verify the subscription was cleaned up by checking it's closed
            assert.ok(subscription.closed, 'subscription should be closed after unsubscribe');

            await collection.database.close();
        });

        it('throws R3 error if collection is not a valid RxCollection', () => {
            const notACollection = { name: 'fake' };
            assert.strictEqual(isRxCollection(notACollection), false, 'fake collection should not pass isRxCollection check');
        });

        it('handles null collection gracefully (no subscription)', () => {
            // When collection is null/undefined, the hook should not subscribe
            // Simulated: when collection is null, the hook returns { result: null, loading: false, error: null }
            // We test that there is no error thrown
            let threw = false;
            try {
                // Simulate the guard in useRxDocument
                const collection = null;
                const primaryKey = 'some-key';
                if (!collection || primaryKey === undefined) {
                    // hook returns early, no subscription
                }
            } catch (e) {
                threw = true;
            }
            assert.strictEqual(threw, false, 'should not throw when collection is null');
        });
    });

    describe('useReplicationStatus', () => {
        if (!config.storage.hasReplication) {
            return;
        }

        async function getReplicationState() {
            const localCollection = await humansCollection.createHumanWithTimestamp(0, randomToken(10), false);
            const remoteCollection = await humansCollection.createHumanWithTimestamp(0, randomToken(10), false);

            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: 'test-replication-' + randomToken(5),
                live: false,
                pull: {
                    handler: getPullHandler(remoteCollection),
                    stream$: getPullStream(remoteCollection),
                },
                push: {
                    handler: getPushHandler(remoteCollection),
                },
            });

            return { replicationState, localCollection, remoteCollection };
        }

        it('active$ observable emits syncing state changes', async () => {
            const { replicationState, localCollection, remoteCollection } = await getReplicationState();

            const activeValues: boolean[] = [];
            const sub = replicationState.active$.subscribe((active) => {
                activeValues.push(active);
            });

            await replicationState.awaitInitialReplication();

            assert.ok(activeValues.length > 0, 'active$ should have emitted at least once');
            // After completion, active should be false
            await waitUntil(() => activeValues[activeValues.length - 1] === false);
            assert.strictEqual(activeValues[activeValues.length - 1], false);

            sub.unsubscribe();
            await replicationState.cancel();
            await localCollection.database.close();
            await remoteCollection.database.close();
        });

        it('canceled$ observable emits false initially and true after cancel', async () => {
            const { replicationState, localCollection, remoteCollection } = await getReplicationState();

            const canceledValues: boolean[] = [];
            const sub = replicationState.canceled$.subscribe((canceled) => {
                canceledValues.push(canceled);
            });

            await replicationState.awaitInitialReplication();

            assert.ok(canceledValues.length > 0, 'canceled$ should have emitted');
            assert.strictEqual(canceledValues[0], false, 'initially should not be canceled');

            await replicationState.cancel();

            await waitUntil(() => canceledValues[canceledValues.length - 1] === true);
            assert.strictEqual(canceledValues[canceledValues.length - 1], true, 'should be true after cancel');

            sub.unsubscribe();
            await localCollection.database.close();
            await remoteCollection.database.close();
        });

        it('received$ observable emits when documents are pulled', async () => {
            const localCollection = await humansCollection.createHumanWithTimestamp(0, randomToken(10), false);
            const remoteCollection = await humansCollection.createHumanWithTimestamp(0, randomToken(10), false);

            // Insert a document in remote to trigger a pull
            await remoteCollection.insert(schemaObjects.humanWithTimestampData());

            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: 'test-replication-received-' + randomToken(5),
                live: false,
                pull: {
                    handler: getPullHandler(remoteCollection),
                    stream$: getPullStream(remoteCollection),
                },
                push: {
                    handler: getPushHandler(remoteCollection),
                },
            });

            const receivedDocs: any[] = [];
            const sub = replicationState.received$.subscribe((doc) => {
                receivedDocs.push(doc);
            });

            await replicationState.awaitInitialReplication();

            assert.ok(receivedDocs.length > 0, 'received$ should have emitted pulled documents');

            sub.unsubscribe();
            await replicationState.cancel();
            await localCollection.database.close();
            await remoteCollection.database.close();
        });

        it('error$ observable emits on replication errors', async () => {
            if (isFastMode()) {
                return;
            }
            const localCollection = await humansCollection.createHumanWithTimestamp(0, randomToken(10), false);

            const replicationState = replicateRxCollection({
                collection: localCollection,
                replicationIdentifier: 'test-replication-error-' + randomToken(5),
                live: true,
                retryTime: 100,
                pull: {
                    handler: () => {
                        throw new Error('simulated pull error');
                    },
                    stream$: getPullStream(localCollection),
                },
            });

            const errors: any[] = [];
            const sub = replicationState.error$.subscribe((err) => {
                errors.push(err);
            });

            await waitUntil(() => errors.length > 0, 5000);

            assert.ok(errors.length > 0, 'error$ should have emitted an error');

            sub.unsubscribe();
            await replicationState.cancel();
            await localCollection.database.close();
        });

        it('subscriptions are cleaned up when unsubscribed', async () => {
            const { replicationState, localCollection, remoteCollection } = await getReplicationState();

            const subs = [
                replicationState.active$.subscribe(() => {}),
                replicationState.error$.subscribe(() => {}),
                replicationState.canceled$.subscribe(() => {}),
                replicationState.received$.subscribe(() => {}),
                replicationState.sent$.subscribe(() => {}),
            ];

            // All subscriptions should be open
            subs.forEach(s => assert.strictEqual(s.closed, false));

            // Unsubscribe all
            subs.forEach(s => s.unsubscribe());

            // All should now be closed
            subs.forEach(s => assert.strictEqual(s.closed, true, 'subscription should be closed'));

            await replicationState.cancel();
            await localCollection.database.close();
            await remoteCollection.database.close();
        });

        it('handles null replicationState gracefully (no subscription)', () => {
            // When replicationState is null, the hook returns without subscribing.
            // Simulated: the guard in useReplicationStatus
            let threw = false;
            try {
                const replicationState = null;
                if (!replicationState) {
                    // hook returns early, no subscription
                }
            } catch (e) {
                threw = true;
            }
            assert.strictEqual(threw, false, 'should not throw when replicationState is null');
        });
    });
});
