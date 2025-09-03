import assert from 'assert';

import {
    randomToken,
    ensureNotFalsy,
    addRxPlugin,
    RxCollection
} from '../plugins/core/index.mjs';
import {
    lastOfArray
} from '../plugins/utils/index.mjs';

import {
    schemaObjects,
    humansCollection,
    ensureReplicationHasNoErrors,
    ensureCollectionsHaveEqualState,
    SimpleHumanDocumentType
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

    async function getServerState(): Promise<TestDocType[]> {
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
            .neq(primaryPath, 0)
        if (error) {
            throw error;
        }
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
                batchSize
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
                batchSize
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

    let supabase: SupabaseClient;
    describe('basics', () => {
        it('init', async () => {
            supabase = createClient(SUPABASE_URL, SUPABASE_TOKEN, {});
        });
        it('should be empty', async () => {
            await cleanUpServer();
            const state = await getServerState();
            assert.strictEqual(state.length, 0, 'server should be empty');
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
        it('should pushed the updated documents', async () => {
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
});
