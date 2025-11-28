import assert from 'assert';

import {
    randomToken,
    ensureNotFalsy,
    addRxPlugin,
    RxCollection,
    WithDeleted
} from '../plugins/core/index.mjs';
import {
    lastOfArray
} from '../plugins/utils/index.mjs';

import {
    schemaObjects,
    humansCollection,
    ensureReplicationHasNoErrors,
    ensureCollectionsHaveEqualState,
    SimpleHumanDocumentType,
    PrimaryHumanDocType
} from '../plugins/test-utils/index.mjs';
import { RxDBDevModePlugin } from '../plugins/dev-mode/index.mjs';
import config from './unit/config.ts';
import { randomString, wait, waitUntil } from 'async-test-util';
import {
    RxSupabaseReplicationState,
    replicateSupabase
} from '../plugins/replication-supabase/index.mjs';
import { SupabaseClient, createClient } from '@supabase/supabase-js';


const SUPABASE_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SUPABASE_URL = 'http://127.0.0.1:54321';

/**
 * Use a low batchSize in all tests
 * to make it easier to test boundaries.
 */
const batchSize = 5;

type TestDocType = SimpleHumanDocumentType;
const primaryPath = 'passportId';
const tableName = 'humans';

describe('replication-supabase.test.ts', function () {
    addRxPlugin(RxDBDevModePlugin);
    config.storage.init?.();

    async function getServerState(): Promise<WithDeleted<TestDocType>[]> {
        const { data, error } = await supabase
            .from(tableName)
            .select('*');
        if (error) {
            throw error;
        }
        return data;
    }
    async function cleanUpServer() {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .neq(primaryPath, 0);
        if (error) {
            throw error;
        }
    }
    function getRandomDoc() {
        const ret = {
            passportId: randomString(10),
            firstName: randomString(10),
            lastName: randomString(10)
        };
        return ret;
    }
    function syncCollection<RxDocType = TestDocType>(
        collection: RxCollection<RxDocType>,
    ): RxSupabaseReplicationState<RxDocType> {
        const replicationState = replicateSupabase<RxDocType>({
            tableName,
            client: supabase,
            replicationIdentifier: randomToken(10),
            collection,
            pull: {
                batchSize,
                modifier: d => {
                    if (!d.age) {
                        delete d.age;
                    }
                    return d;
                }
            },
            push: {
                batchSize
            }
        });
        ensureReplicationHasNoErrors(replicationState);
        return replicationState;
    }

    async function syncCollectionOnce<RxDocType = TestDocType>(
        collection: RxCollection<RxDocType>,
        push: boolean = true,
        pull: boolean = true
    ) {
        const replicationState = replicateSupabase<RxDocType>({
            tableName,
            client: supabase,
            replicationIdentifier: 'sync-once',
            collection,
            live: false,
            pull: pull ? {
                batchSize,
                modifier: d => {
                    if (!d.age) {
                        delete d.age;
                    }
                    return d;
                }
            } : undefined,
            push: push ? {
                batchSize
            } : undefined
        });
        ensureReplicationHasNoErrors(replicationState);
        await replicationState.awaitInitialReplication();
        await replicationState.awaitInSync();
        await replicationState.cancel();
    }
    async function insertDocument(doc = getRandomDoc()) {
        const { error } = await supabase
            .from(tableName)
            .insert([
                doc
            ])
            .select();
        if (error) {
            throw error;
        }
    }
    async function insertDocuments(amount = 1) {
        await Promise.all(
            new Array(amount).fill(0).map(() => insertDocument())
        );
    }

    let supabase: SupabaseClient;
    describe('basics', () => {
        it('init', () => {
            supabase = createClient(SUPABASE_URL, SUPABASE_TOKEN, {});
        });
        it('should be empty', async () => {
            await cleanUpServer();
            const state = await getServerState();
            assert.strictEqual(state.length, 0, 'server should be empty');
        });
        it('insert documents', async () => {
            await insertDocument();
            await insertDocument();
            await insertDocument();

            const state = await getServerState();
            assert.strictEqual(state.length, 3);
            await cleanUpServer();
        });
    });

    describe('helpers', () => {

    });

    describe('live:false push', () => {
        it('should push the inserted documents', async () => {
            await cleanUpServer();
            const collection = await humansCollection.createPrimary(10, undefined, false);

            // initial push
            await syncCollectionOnce(collection, true, false);
            let state = await getServerState();
            assert.strictEqual(state.length, 10, 'must have pushed all docs to the server');

            // ongoing push
            await collection.bulkInsert(
                new Array(15).fill(0).map(() => schemaObjects.humanData())
            );
            await syncCollectionOnce(collection, true, false);
            state = await getServerState();
            assert.strictEqual(state.length, 25, 'must have pushed ongoing docs to the server');

            await collection.database.remove();
        });
        it('should have pushed the updated documents', async () => {
            await cleanUpServer();
            const collection = await humansCollection.createPrimary(4, undefined, false);

            await syncCollectionOnce(collection);
            let state = await getServerState();
            assert.strictEqual(state.length, 4, 'must have pushed all docs to the server');

            const doc = await collection.findOne().exec(true);
            await doc.incrementalPatch({ firstName: 'foobar' });
            await syncCollectionOnce(collection);

            state = await getServerState();
            const serverDoc = state.find(d => d.passportId === doc.passportId);
            assert.strictEqual(
                ensureNotFalsy(serverDoc).firstName,
                'foobar'
            );

            await collection.database.remove();
        });
    });
    describe('live:false pull', () => {
        it('should pull the documents', async () => {
            await cleanUpServer();
            await insertDocuments(12);
            const collection = await humansCollection.createPrimary(0, undefined, false);

            // initial pull
            await syncCollectionOnce(collection);
            let docs = await collection.find().exec();
            assert.strictEqual(docs.length, 12);

            // ongoing pull
            await insertDocuments(8);
            await syncCollectionOnce(collection);
            docs = await collection.find().exec();
            assert.strictEqual(docs.length, 20, 'should have pulled the ongoing inserted docs');

            // pull updated doc
            const firstDoc = ensureNotFalsy(lastOfArray(docs));
            const { error } = await supabase
                .from(tableName)
                .update({ lastName: 'foobar' })
                .eq(primaryPath, firstDoc.primary)   // replace with the actual row identifier
                .select();
            if (error) {
                throw error;
            }

            await syncCollectionOnce(collection);
            const docAfter = await collection.findOne(firstDoc.primary).exec(true);
            assert.strictEqual(docAfter.lastName, 'foobar');

            await collection.database.remove();
        });
    });
    describe('pull query builder', () => {
        it('should allow restricting the pull query', async () => {
            await cleanUpServer();
            await insertDocument(
                schemaObjects.humanData('builder-allowed', undefined, 'allowed')
            );
            await insertDocument(
                schemaObjects.humanData('builder-blocked', undefined, 'blocked')
            );

            const collection = await humansCollection.createPrimary(
                0,
                undefined,
                false
            );
            const replicationState = replicateSupabase<TestDocType>({
                tableName,
                client: supabase,
                replicationIdentifier: randomToken(10),
                collection,
                live: false,
                pull: {
                    batchSize,
                    queryBuilder: ({ query }) =>
                        query.eq('firstName', 'allowed'),
                },
            });
            ensureReplicationHasNoErrors(replicationState);

            await replicationState.awaitInitialReplication();
            await replicationState.awaitInSync();

            const docs = await collection.find().exec();
            assert.strictEqual(docs.length, 1);
            assert.strictEqual(ensureNotFalsy(docs[0]).firstName, 'allowed');

            await replicationState.cancel();
            await collection.database.remove();
        });
    });
    describe('deletes', () => {
        it('should push the deletion', async () => {
            await cleanUpServer();
            const collection = await humansCollection.create(1);
            await syncCollectionOnce(collection, true, false);
            let state = await getServerState();
            assert.strictEqual(state.length, 1, 'must have pushed the doc to the server');

            const doc = await collection.findOne().exec(true);
            await doc.remove();

            await syncCollectionOnce(collection, true, false);

            state = await getServerState();
            assert.strictEqual(state[0]._deleted, true, 'must have deleted the doc on the server');

            await collection.database.remove();
        });
    });
    describe('conflict handling', () => {
        it('INSERT: should keep the master state as default conflict handler', async () => {
            await cleanUpServer();

            // insert and sync
            const c1 = await humansCollection.create(0);
            const conflictDocId = '1-insert-conflict';
            await c1.insert(schemaObjects.humanData(conflictDocId, undefined, 'insert-first'));
            await syncCollectionOnce(c1);


            // insert same doc-id on other side
            const c2 = await humansCollection.create(0);
            await c2.insert(schemaObjects.humanData(conflictDocId, undefined, 'insert-conflict'));
            await syncCollectionOnce(c2);

            /**
             * Must have kept the first-insert state
             */
            const serverState = await getServerState();
            const doc1 = await c1.findOne().exec(true);
            const doc2 = await c2.findOne().exec(true);
            assert.strictEqual(serverState[0].firstName, 'insert-first');
            assert.strictEqual(doc2.getLatest().firstName, 'insert-first');
            assert.strictEqual(doc1.getLatest().firstName, 'insert-first');

            await c1.database.close();
            await c2.database.close();
        });
        it('UPDATE: should keep the master state as default conflict handler', async () => {
            await cleanUpServer();
            const c1 = await humansCollection.create(0);
            await c1.insert(schemaObjects.humanData('1-conflict'));

            const c2 = await humansCollection.create(0);

            await syncCollectionOnce(c1);
            await syncCollectionOnce(c2);

            const doc1 = await c1.findOne().exec(true);
            const doc2 = await c2.findOne().exec(true);
            assert.strictEqual(doc1.firstName, doc2.firstName, 'equal names');

            // make update on both sides
            await doc2.incrementalPatch({ firstName: 'c2' });
            await syncCollectionOnce(c2);

            // cause conflict
            await doc1.incrementalPatch({ firstName: 'c1' });
            await syncCollectionOnce(c1);

            /**
             * Must have kept the master state c2
             */
            assert.strictEqual(doc2.getLatest().firstName, 'c2', 'doc2 firstName');
            assert.strictEqual(doc1.getLatest().firstName, 'c2', 'doc1 firstName');

            await c1.database.close();
            await c2.database.close();
        });
        it('conflict on delete', async () => {
            await cleanUpServer();
            const c1 = await humansCollection.create(0);
            await c1.insert(schemaObjects.humanData('1-conflict', undefined, 'before-conflict'));

            const c2 = await humansCollection.create(0);
            await syncCollectionOnce(c1);
            await syncCollectionOnce(c2);

            const doc1 = await c1.findOne().exec(true);
            let doc2 = await c2.findOne().exec(true);

            await doc1.remove();
            await syncCollectionOnce(c1);
            const state = await getServerState();
            assert.strictEqual(state[0]._deleted, true);

            await doc2.patch({
                firstName: 'foobar'
            });

            await syncCollectionOnce(c2);
            doc2 = doc2.getLatest();
            assert.strictEqual(doc2.firstName, doc1.firstName, 'should have kept the firstName because of conflict');
            assert.strictEqual(doc2.deleted, true);

            await c1.database.close();
            await c2.database.close();
        });
    });
    describe('live replication', () => {
        it('push replication to client-server', async () => {
            await cleanUpServer();
            const collection = await humansCollection.createPrimary(0, undefined, false);
            await collection.insert(schemaObjects.humanData('aaaa'));
            await collection.insert(schemaObjects.humanData('bbbb'));

            const replicationState = syncCollection(collection);
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();

            let docsOnServer = await getServerState();
            assert.strictEqual(docsOnServer.length, 2, 'must have two docs');

            // insert another one
            await collection.insert(schemaObjects.humanData('cccc'));
            await replicationState.awaitInSync();

            docsOnServer = await getServerState();
            assert.strictEqual(docsOnServer.length, 3, '3 after insert');

            // update one
            const doc = await collection.findOne('aaaa').exec(true);
            await doc.incrementalPatch({ firstName: 'foobar' });
            await replicationState.awaitInSync();
            docsOnServer = await getServerState();
            assert.strictEqual(docsOnServer.length, 3, '3 after update');
            const serverDoc = ensureNotFalsy(docsOnServer.find(d => d[primaryPath] === doc.primary), 'doc with id missing ' + doc.primary);
            assert.strictEqual(serverDoc.firstName, 'foobar');

            // delete one
            await doc.getLatest().remove();
            await replicationState.awaitInSync();
            docsOnServer = await getServerState();
            assert.strictEqual(docsOnServer.filter(d => d._deleted === false).length, 2, '2 after delete');

            await collection.database.close();
        });
        it('should get the event from server-side changes and sync the new data', async () => {
            await cleanUpServer();
            const collection = await humansCollection.createPrimary(0, undefined, false);
            const replicationState = syncCollection(collection);
            await replicationState.awaitInitialReplication();
            await replicationState.awaitInSync();

            await insertDocument();
            await waitUntil(async () => {
                const doc = await collection.findOne().exec();
                return !!doc;
            });

            await collection.database.close();
        });

    });
    describe('other', () => {
        it('two collections', async () => {
            const waitTime = 600;
            await cleanUpServer();
            console.log('... 0');
            const collectionA = await humansCollection.createPrimary(0, undefined, false);
            await collectionA.insert(schemaObjects.humanData('1aaa'));
            const collectionB = await humansCollection.createPrimary(0, undefined, false);
            await collectionB.insert(schemaObjects.humanData('1bbb'));
            console.log('... 1');


            const replicationStateA = syncCollection(collectionA);

            ensureReplicationHasNoErrors(replicationStateA);
            await replicationStateA.awaitInitialReplication();
            await replicationStateA.awaitInSync();
            console.log('... 2');

            const replicationStateB = syncCollection(collectionB);
            ensureReplicationHasNoErrors(replicationStateB);
            await replicationStateB.awaitInitialReplication();

            await wait(waitTime);
            await replicationStateA.awaitInSync();
            console.log('... 3');

            await waitUntil(() => collectionA.count().exec().then(c => c === 2));
            console.log('... 3.1');
            await waitUntil(() => collectionB.count().exec().then(c => c === 2));
            console.log('... 3.2');
            await ensureCollectionsHaveEqualState(collectionA, collectionB, 'init sync');

            // insert one
            await collectionA.insert(schemaObjects.humanData('insert-a'));
            await replicationStateA.awaitInSync();
            console.log('... 4');


            await replicationStateB.awaitInSync();
            await wait(waitTime);
            await ensureCollectionsHaveEqualState(collectionA, collectionB, 'after insert');
            console.log('... 5');

            // delete one
            await collectionB.findOne().remove();
            await replicationStateB.awaitInSync();
            await replicationStateA.awaitInSync();
            await wait(waitTime);
            await ensureCollectionsHaveEqualState(collectionA, collectionB, 'after deletion');
            console.log('... 6');

            // insert many
            await collectionA.bulkInsert(
                new Array(10)
                    .fill(0)
                    .map(() => schemaObjects.humanData(undefined, undefined, 'bulk-insert-A'))
            );
            await replicationStateA.awaitInSync();
            console.log('... 7');

            await replicationStateB.awaitInSync();
            await wait(100);
            await ensureCollectionsHaveEqualState(collectionA, collectionB, 'after insert many');
            console.log('... 8');

            // insert at both collections at the same time
            await Promise.all([
                collectionA.insert(schemaObjects.humanData('insert-parallel-a')),
                collectionB.insert(schemaObjects.humanData('insert-parallel-b'))
            ]);
            console.log('... 9');
            await replicationStateA.awaitInSync();
            await replicationStateB.awaitInSync();
            await replicationStateA.awaitInSync();
            await replicationStateB.awaitInSync();
            await wait(waitTime);
            await ensureCollectionsHaveEqualState(collectionA, collectionB, 'after insert both at same time');
            console.log('... 10');

            await collectionA.database.close();
            await collectionB.database.close();
        });
    });

    describe('issues', () => {
        it('#7513 push.modifier is never applied', async () => {
            await cleanUpServer();

            const collection = await humansCollection.createPrimary(0, undefined, false);


            const replicationState = replicateSupabase<PrimaryHumanDocType>({
                tableName,
                client: supabase,
                replicationIdentifier: randomToken(10),
                collection,
                pull: {
                    batchSize
                },
                push: {
                    batchSize,
                    modifier: d => {
                        d.lastName = 'push-modified';
                        return d;
                    }
                }
            });
            ensureReplicationHasNoErrors(replicationState);

            await collection.insert(schemaObjects.humanData('aaaa'));
            await replicationState.awaitInSync();
            const serverState = await getServerState();
            const firstDoc = ensureNotFalsy(serverState[0]);
            assert.strictEqual(firstDoc.lastName, 'push-modified');

            await collection.database.close();
        });
    });

    describe('last', () => {
        it('clean server', async () => {
            await cleanUpServer();
        });
    });
});
