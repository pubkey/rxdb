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
     * May return a Promise to support plugins where the replication factory is async.
     */
    startReplication(collection: RxCollection<any>): RxReplicationState<any, any> | Promise<RxReplicationState<any, any>>;

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
    softDeletes?: boolean;

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

    /**
     * When provided, attachment replication tests are run.
     * The callback should perform a one-shot sync for a collection whose
     * schema has `attachments: {}` defined, targeting the same server endpoint.
     */
    syncOnceWithAttachments?(collection: RxCollection<any>): Promise<void>;

    /**
     * When provided, a test is run that verifies attachment binary data is NOT
     * replicated when attachments are disabled (e.g. `attachments: false`).
     * The callback should perform a one-shot sync for a collection whose schema
     * has `attachments: {}` defined, but with attachment replication turned off.
     */
    syncOnceWithAttachmentsDisabled?(collection: RxCollection<any>): Promise<void>;
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

                const replicationState = await Promise.resolve(config.startReplication(collection));
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

                const replicationStateA = await Promise.resolve(config.startReplication(collectionA));
                ensureReplicationHasNoErrors(replicationStateA);
                await replicationStateA.awaitInitialReplication();

                const replicationStateB = await Promise.resolve(config.startReplication(collectionB));
                ensureReplicationHasNoErrors(replicationStateB);
                await replicationStateB.awaitInitialReplication();

                if (waitTime) { await wait(waitTime); }
                /**
                 * Explicitly resync both sides before checking equality.
                 * This makes the test independent of realtime event delivery speed:
                 * even if realtime events were slow or missed, the explicit pull
                 * from the server ensures both sides have the latest data.
                 */
                replicationStateA.reSync();
                replicationStateB.reSync();
                await replicationStateA.awaitInSync();
                await replicationStateB.awaitInSync();

                await awaitCollectionsHaveEqualState(collectionA, collectionB, 'init sync');

                // insert one
                await collectionA.insert(schemaObjects.humanData('insert-a'));
                await replicationStateA.awaitInSync();
                await replicationStateB.awaitInSync();
                if (waitTime) { await wait(waitTime); }
                replicationStateA.reSync();
                replicationStateB.reSync();
                await replicationStateA.awaitInSync();
                await replicationStateB.awaitInSync();
                await awaitCollectionsHaveEqualState(collectionA, collectionB, 'after insert');

                // delete one
                await collectionB.findOne().remove();
                await replicationStateB.awaitInSync();
                await replicationStateA.awaitInSync();
                if (waitTime) { await wait(waitTime); }
                replicationStateA.reSync();
                replicationStateB.reSync();
                await replicationStateA.awaitInSync();
                await replicationStateB.awaitInSync();
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
                replicationStateA.reSync();
                replicationStateB.reSync();
                await replicationStateA.awaitInSync();
                await replicationStateB.awaitInSync();
                await awaitCollectionsHaveEqualState(collectionA, collectionB, 'after insert many');

                // insert at both collections at the same time
                await Promise.all([
                    collectionA.insert(schemaObjects.humanData('insert-parallel-a')),
                    collectionB.insert(schemaObjects.humanData('insert-parallel-b'))
                ]);
                await replicationStateA.awaitInSync();
                await replicationStateB.awaitInSync();
                if (waitTime) { await wait(waitTime); }
                replicationStateA.reSync();
                replicationStateB.reSync();
                await replicationStateA.awaitInSync();
                await replicationStateB.awaitInSync();
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

        if (config.syncOnceWithAttachments) {
            describe('attachment replication', () => {
                it('should replicate an inserted attachment', async () => {
                    await config.cleanUpServer();

                    const c1 = await humansCollection.createAttachments(0);
                    const c2 = await humansCollection.createAttachments(0);

                    const doc1 = await c1.insert(schemaObjects.humanData('att-insert-base'));
                    await doc1.putAttachment({
                        id: 'test.txt',
                        data: new Blob(['hello replication'], { type: 'text/plain' }),
                        type: 'text/plain'
                    });

                    await config.syncOnceWithAttachments!(c1);
                    await config.syncOnceWithAttachments!(c2);

                    const doc2 = await c2.findOne('att-insert-base').exec(true);
                    const att2 = doc2.getAttachment('test.txt');
                    assert.ok(att2, 'attachment must exist on second collection');
                    assert.strictEqual(await att2.getStringData(), 'hello replication');

                    await c1.database.close();
                    await c2.database.close();
                });

                it('should replicate an updated attachment', async () => {
                    await config.cleanUpServer();

                    const c1 = await humansCollection.createAttachments(0);
                    const c2 = await humansCollection.createAttachments(0);

                    const doc1 = await c1.insert(schemaObjects.humanData('att-update-base'));
                    await doc1.putAttachment({
                        id: 'file.txt',
                        data: new Blob(['v1'], { type: 'text/plain' }),
                        type: 'text/plain'
                    });

                    await config.syncOnceWithAttachments!(c1);
                    await config.syncOnceWithAttachments!(c2);

                    // Update on c1
                    const doc1v2 = await c1.findOne('att-update-base').exec(true);
                    await doc1v2.putAttachment({
                        id: 'file.txt',
                        data: new Blob(['v2'], { type: 'text/plain' }),
                        type: 'text/plain'
                    });
                    await config.syncOnceWithAttachments!(c1);
                    await config.syncOnceWithAttachments!(c2);

                    const doc2 = await c2.findOne('att-update-base').exec(true);
                    const att2 = doc2.getAttachment('file.txt');
                    assert.ok(att2, 'updated attachment must exist');
                    assert.strictEqual(await att2.getStringData(), 'v2');

                    await c1.database.close();
                    await c2.database.close();
                });

                it('should replicate a deleted attachment', async () => {
                    await config.cleanUpServer();

                    const c1 = await humansCollection.createAttachments(0);
                    const c2 = await humansCollection.createAttachments(0);

                    const doc1 = await c1.insert(schemaObjects.humanData('att-delete-base'));
                    await doc1.putAttachment({
                        id: 'remove.txt',
                        data: new Blob(['bye'], { type: 'text/plain' }),
                        type: 'text/plain'
                    });

                    await config.syncOnceWithAttachments!(c1);
                    await config.syncOnceWithAttachments!(c2);

                    // Delete on c1
                    const doc1v2 = await c1.findOne('att-delete-base').exec(true);
                    await doc1v2.getAttachment('remove.txt')!.remove();
                    await config.syncOnceWithAttachments!(c1);
                    await config.syncOnceWithAttachments!(c2);

                    const doc2 = await c2.findOne('att-delete-base').exec(true);
                    assert.strictEqual(
                        doc2.getAttachment('remove.txt'),
                        null,
                        'deleted attachment must not exist on second collection'
                    );

                    await c1.database.close();
                    await c2.database.close();
                });

                it('should keep the master attachment state on conflict', async () => {
                    await config.cleanUpServer();

                    const c1 = await humansCollection.createAttachments(0);
                    const c2 = await humansCollection.createAttachments(0);

                    const doc1 = await c1.insert(schemaObjects.humanData('att-conflict-base'));
                    await doc1.putAttachment({
                        id: 'shared.txt',
                        data: new Blob(['initial'], { type: 'text/plain' }),
                        type: 'text/plain'
                    });

                    // Both collections get the initial state
                    await config.syncOnceWithAttachments!(c1);
                    await config.syncOnceWithAttachments!(c2);

                    // c2 updates the attachment and pushes first (becomes master)
                    const doc2 = await c2.findOne('att-conflict-base').exec(true);
                    await doc2.putAttachment({
                        id: 'shared.txt',
                        data: new Blob(['from c2 - master'], { type: 'text/plain' }),
                        type: 'text/plain'
                    });
                    await config.syncOnceWithAttachments!(c2);

                    // c1 also updates but pushes later → conflict → master (c2) wins
                    const doc1v2 = await c1.findOne('att-conflict-base').exec(true);
                    await doc1v2.putAttachment({
                        id: 'shared.txt',
                        data: new Blob(['from c1 - should lose'], { type: 'text/plain' }),
                        type: 'text/plain'
                    });
                    await config.syncOnceWithAttachments!(c1);

                    // Extra rounds to converge: some backends need additional sync
                    // cycles for the conflict-resolved attachment state to propagate.
                    await config.syncOnceWithAttachments!(c2);
                    await config.syncOnceWithAttachments!(c1);

                    const doc1Final = await c1.findOne('att-conflict-base').exec(true);
                    const att1Final = doc1Final.getAttachment('shared.txt');
                    assert.ok(att1Final, 'attachment must still exist after conflict resolution');

                    const content = await att1Final.getStringData();
                    assert.strictEqual(content, 'from c2 - master', 'master state (c2) must win the conflict');

                    await c1.database.close();
                    await c2.database.close();
                });
            });
        }

        if (config.syncOnceWithAttachmentsDisabled) {
            describe('attachment replication disabled', () => {
                it('should not replicate attachment data when attachments are disabled', async () => {
                    await config.cleanUpServer();

                    const c1 = await humansCollection.createAttachments(0);
                    const c2 = await humansCollection.createAttachments(0);

                    const doc1 = await c1.insert(schemaObjects.humanData('att-disabled'));
                    await doc1.putAttachment({
                        id: 'no-sync.txt',
                        data: new Blob(['secret'], { type: 'text/plain' }),
                        type: 'text/plain'
                    });

                    await config.syncOnceWithAttachmentsDisabled!(c1);
                    await config.syncOnceWithAttachmentsDisabled!(c2);

                    const doc2 = await c2.findOne('att-disabled').exec(true);
                    assert.ok(doc2, 'document should be replicated even with attachments disabled');
                    const att2 = doc2.getAttachment('no-sync.txt');
                    if (att2) {
                        const content = await att2.getStringData().catch(() => '');
                        assert.notStrictEqual(content, 'secret', 'attachment binary data must not have been replicated');
                    }

                    await c1.database.close();
                    await c2.database.close();
                });
            });
        }
    });
}
