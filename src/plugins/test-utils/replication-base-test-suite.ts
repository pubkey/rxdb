/**
 * Base test suite for replication plugins.
 * All replication plugins should run these tests
 * to ensure consistent behavior across different backends.
 *
 * The tests use HumanDocumentType (passportId, firstName, lastName, age)
 * with humansCollection.create() for collection creation.
 */
import assert from 'assert';
import { wait } from 'async-test-util';
import type { RxCollection } from '../../types/index.d.ts';
import type { RxReplicationState } from '../replication/index.ts';
import { ensureNotFalsy } from '../utils/index.ts';
import * as humansCollection from './humans-collection.ts';
import * as schemaObjects from './schema-objects.ts';
import {
    awaitCollectionsHaveEqualState,
    ensureReplicationHasNoErrors
} from './test-util.ts';

export type ReplicationBaseTestSuiteConfig = {
    /**
     * Start a live replication for a collection.
     * Must target a shared server endpoint so that multiple
     * collections can replicate to the same backend.
     */
    startReplication(collection: RxCollection<any>): RxReplicationState<any, any>;

    /**
     * Run a one-shot (non-live) sync and wait for completion.
     * Must target the same server endpoint as startReplication.
     */
    syncOnce(collection: RxCollection<any>): Promise<void>;

    /**
     * Get all documents from the server,
     * including soft-deleted ones when the backend uses soft deletes.
     */
    getAllServerDocs(): Promise<any[]>;

    /**
     * Remove all documents from the server.
     */
    cleanUpServer(): Promise<void>;

    /**
     * Whether the server uses soft deletes
     * (marks docs as deleted instead of removing them).
     */
    softDeletes: boolean;

    /**
     * Check if a server document is marked as deleted.
     * Required when softDeletes is true.
     */
    isDeleted?(serverDoc: any): boolean;

    /**
     * Get the client primary key (passportId) from a server document.
     * Different backends store the primary key in different fields.
     */
    getPrimaryOfServerDoc(serverDoc: any): string;

    /**
     * Additional wait time for eventually consistent backends (ms).
     */
    waitTime?: number;
};

/**
 * Runs the base test suite for a replication plugin.
 * Call this inside a describe() block in your replication test file.
 *
 * The config callbacks should target a shared server endpoint.
 * Each test calls cleanUpServer() at the start to ensure a clean state.
 *
 * @example
 * ```ts
 * describe('replication-nats.test.ts', () => {
 *     runReplicationBaseTestSuite({
 *         startReplication: (collection) => syncNats(collection, natsName),
 *         syncOnce: (collection) => syncOnceNats(collection, natsName),
 *         getAllServerDocs: () => getAllDocsOfServer(natsName),
 *         cleanUpServer: async () => { ... },
 *         softDeletes: true,
 *         isDeleted: (doc) => doc._deleted,
 *         getPrimaryOfServerDoc: (doc) => doc.passportId,
 *     });
 * });
 * ```
 */
export function runReplicationBaseTestSuite(config: ReplicationBaseTestSuiteConfig): void {
    const waitTime = config.waitTime || 0;

    describe('base test suite', () => {
        describe('live replication', () => {
            it('push replication to client-server', async () => {
                await config.cleanUpServer();
                const collection = await humansCollection.create(2, undefined, false);

                const replicationState = config.startReplication(collection);
                ensureReplicationHasNoErrors(replicationState);
                await replicationState.awaitInitialReplication();

                let docsOnServer = await config.getAllServerDocs();
                assert.strictEqual(docsOnServer.length, 2);

                // insert another one
                await collection.insert(schemaObjects.humanData());
                await replicationState.awaitInSync();

                docsOnServer = await config.getAllServerDocs();
                assert.strictEqual(docsOnServer.length, 3);

                // update one
                const doc = await collection.findOne().exec(true);
                await doc.incrementalPatch({ age: 100 });
                await replicationState.awaitInSync();
                docsOnServer = await config.getAllServerDocs();
                assert.strictEqual(docsOnServer.length, 3);
                const serverDoc = ensureNotFalsy(
                    docsOnServer.find(d => config.getPrimaryOfServerDoc(d) === doc.primary)
                );
                assert.strictEqual(serverDoc.age, 100);

                // delete one
                await doc.getLatest().remove();
                await replicationState.awaitInSync();
                docsOnServer = await config.getAllServerDocs();

                if (config.softDeletes) {
                    assert.strictEqual(docsOnServer.length, 3);
                    assert.ok(docsOnServer.find(d => config.isDeleted!(d)));
                } else {
                    assert.strictEqual(docsOnServer.length, 2);
                }

                await collection.database.close();
            });

            it('two collections', async () => {
                await config.cleanUpServer();

                const collectionA = await humansCollection.create(0, undefined, false);
                await collectionA.insert(schemaObjects.humanData('1aaa'));
                const collectionB = await humansCollection.create(0, undefined, false);
                await collectionB.insert(schemaObjects.humanData('1bbb'));

                const replicationStateA = config.startReplication(collectionA);
                ensureReplicationHasNoErrors(replicationStateA);
                await replicationStateA.awaitInitialReplication();

                const replicationStateB = config.startReplication(collectionB);
                ensureReplicationHasNoErrors(replicationStateB);
                await replicationStateB.awaitInitialReplication();

                if (waitTime) { await wait(waitTime); }
                await replicationStateA.awaitInSync();

                await awaitCollectionsHaveEqualState(collectionA, collectionB, 'init sync');

                // insert one
                await collectionA.insert(schemaObjects.humanData('insert-a'));
                await replicationStateA.awaitInSync();
                await replicationStateB.awaitInSync();
                if (waitTime) { await wait(waitTime); }
                await awaitCollectionsHaveEqualState(collectionA, collectionB, 'after insert');

                // delete one
                await collectionB.findOne().remove();
                await replicationStateB.awaitInSync();
                await replicationStateA.awaitInSync();
                if (waitTime) { await wait(waitTime); }
                await awaitCollectionsHaveEqualState(collectionA, collectionB, 'after deletion');

                // insert many
                await collectionA.bulkInsert(
                    new Array(10)
                        .fill(0)
                        .map(() => schemaObjects.humanData(undefined, undefined, 'bulk-insert-A'))
                );
                await replicationStateA.awaitInSync();
                await replicationStateB.awaitInSync();
                if (waitTime) { await wait(waitTime); }
                await awaitCollectionsHaveEqualState(collectionA, collectionB, 'after insert many');

                // insert at both collections at the same time
                await Promise.all([
                    collectionA.insert(schemaObjects.humanData('insert-parallel-a')),
                    collectionB.insert(schemaObjects.humanData('insert-parallel-b'))
                ]);
                await replicationStateA.awaitInSync();
                await replicationStateB.awaitInSync();
                await replicationStateA.awaitInSync();
                await replicationStateB.awaitInSync();
                if (waitTime) { await wait(waitTime); }
                await awaitCollectionsHaveEqualState(collectionA, collectionB, 'after insert both at same time');

                await collectionA.database.close();
                await collectionB.database.close();
            });
        });

        describe('conflict handling', () => {
            it('should keep the master state as default conflict handler', async () => {
                await config.cleanUpServer();

                const c1 = await humansCollection.create(1);
                const c2 = await humansCollection.create(0);

                await config.syncOnce(c1);
                await config.syncOnce(c2);

                const doc1 = await c1.findOne().exec(true);
                const doc2 = await c2.findOne().exec(true);

                // make update on both sides
                await doc1.incrementalPatch({ firstName: 'c1' });
                await doc2.incrementalPatch({ firstName: 'c2' });

                await config.syncOnce(c2);

                // cause conflict
                await config.syncOnce(c1);

                /**
                 * Must have kept the master state c2
                 */
                assert.strictEqual(doc1.getLatest().firstName, 'c2');

                await c1.database.close();
                await c2.database.close();
            });
        });
    });
}
