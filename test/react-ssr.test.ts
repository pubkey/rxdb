/**
 * SSR (Server-Side Rendering) tests for the React plugin.
 * These tests run WITHOUT jsdom to ensure the React plugin
 * does not accidentally use browser globals like window or document
 * which are not available in SSR environments (e.g. Next.js SSR, Remix loaders).
 *
 * In SSR, useEffect does not run. So hooks return their initial state
 * (loading=true, results=[], etc.). The important thing is that they
 * do not crash or reference browser-only globals.
 */
import assert from 'assert';
import React from 'react';
import { renderToString } from 'react-dom/server';

import {
    createRxDatabase,
    randomToken,
    addRxPlugin,
    RxDatabase,
    RxCollection,
} from '../plugins/core/index.mjs';
import {
    schemas,
} from '../plugins/test-utils/index.mjs';
import { RxDBDevModePlugin } from '../plugins/dev-mode/index.mjs';
import { getRxStorageMemory } from '../plugins/storage-memory/index.mjs';
import { wrappedValidateAjvStorage } from '../plugins/validate-ajv/index.mjs';

import {
    RxDatabaseProvider,
    useRxDatabase,
    useRxQuery,
    useLiveRxQuery,
    useRxCollection,
    useRxDocument,
    useReplicationStatus,
} from '../plugins/react/index.mjs';

addRxPlugin(RxDBDevModePlugin);

async function createDatabase(): Promise<RxDatabase> {
    const db = await createRxDatabase({
        name: randomToken(10),
        storage: wrappedValidateAjvStorage({ storage: getRxStorageMemory() }),
    });
    await db.addCollections({
        humans: {
            schema: schemas.simpleHuman
        }
    });
    return db;
}

describe('react-ssr.test.ts', () => {
    it('should be able to import all React plugin exports without DOM globals', () => {
        /**
         * If any of these imports referenced window/document at module level,
         * this test would have already failed before reaching here.
         */
        assert.strictEqual(typeof RxDatabaseProvider, 'function');
        assert.strictEqual(typeof useRxDatabase, 'function');
        assert.strictEqual(typeof useRxQuery, 'function');
        assert.strictEqual(typeof useLiveRxQuery, 'function');
        assert.strictEqual(typeof useRxCollection, 'function');
        assert.strictEqual(typeof useRxDocument, 'function');
        assert.strictEqual(typeof useReplicationStatus, 'function');
    });

    it('should render the RxDatabaseProvider with renderToString', async () => {
        const db = await createDatabase();

        const html = renderToString(
            React.createElement(
                RxDatabaseProvider,
                { database: db, children: React.createElement('div', null, 'SSR content') }
            )
        );

        assert.ok(html.includes('SSR content'));

        await db.close();
    });

    it('should render useRxDatabase inside RxDatabaseProvider with renderToString', async () => {
        const db = await createDatabase();

        function UseRxDatabaseComponent() {
            const database = useRxDatabase();
            return React.createElement('div', null, 'db:' + database.name);
        }

        const html = renderToString(
            React.createElement(
                RxDatabaseProvider,
                { database: db },
                React.createElement(UseRxDatabaseComponent)
            )
        );

        assert.ok(html.includes('db:' + db.name));

        await db.close();
    });

    it('should render useRxCollection inside RxDatabaseProvider with renderToString', async () => {
        const db = await createDatabase();

        function UseRxCollectionComponent() {
            /**
             * In SSR, useEffect does not run so the collection
             * will be null on the initial render pass.
             */
            const collection = useRxCollection('humans');
            return React.createElement('div', null, 'collection:' + (collection ? collection.name : 'null'));
        }

        const html = renderToString(
            React.createElement(
                RxDatabaseProvider,
                { database: db },
                React.createElement(UseRxCollectionComponent)
            )
        );

        /**
         * useRxCollection uses useEffect internally to set the collection.
         * Since useEffect does not run during SSR, the collection is null.
         */
        assert.ok(html.includes('collection:'));

        await db.close();
    });

    it('should render useRxQuery inside RxDatabaseProvider with renderToString', async () => {
        const db = await createDatabase();
        const collection: RxCollection = db.collections.humans;

        function UseRxQueryComponent() {
            const { results, loading, error } = useRxQuery({
                collection,
                query: { selector: {} }
            });
            return React.createElement('div', null,
                'loading:' + loading + ',count:' + results.length + ',error:' + error
            );
        }

        const html = renderToString(
            React.createElement(
                RxDatabaseProvider,
                { database: db },
                React.createElement(UseRxQueryComponent)
            )
        );

        /**
         * During SSR, useEffect does not run so the query never executes.
         * The hook returns its initial state: loading=true, results=[], error=null.
         */
        assert.ok(html.includes('loading:true'));
        assert.ok(html.includes('count:0'));
        assert.ok(html.includes('error:null'));

        await db.close();
    });

    it('should render useLiveRxQuery inside RxDatabaseProvider with renderToString', async () => {
        const db = await createDatabase();
        const collection: RxCollection = db.collections.humans;

        function UseLiveRxQueryComponent() {
            const { results, loading, error } = useLiveRxQuery({
                collection,
                query: { selector: {} }
            });
            return React.createElement('div', null,
                'loading:' + loading + ',count:' + results.length + ',error:' + error
            );
        }

        const html = renderToString(
            React.createElement(
                RxDatabaseProvider,
                { database: db },
                React.createElement(UseLiveRxQueryComponent)
            )
        );

        /**
         * Same as useRxQuery - useEffect does not fire during SSR,
         * so the live subscription never starts.
         */
        assert.ok(html.includes('loading:true'));
        assert.ok(html.includes('count:0'));
        assert.ok(html.includes('error:null'));

        await db.close();
    });

    it('should render useRxDocument inside RxDatabaseProvider with renderToString', async () => {
        const db = await createDatabase();
        const collection: RxCollection = db.collections.humans;

        function UseRxDocumentComponent() {
            /**
             * In SSR, useEffect does not run so the subscription never starts.
             * The hook returns its initial state: loading=false, result=null.
             */
            const { result, loading, error } = useRxDocument(collection, 'some-id');
            return React.createElement('div', null,
                'loading:' + loading + ',result:' + result + ',error:' + error
            );
        }

        const html = renderToString(
            React.createElement(
                RxDatabaseProvider,
                { database: db },
                React.createElement(UseRxDocumentComponent)
            )
        );

        assert.ok(html.includes('loading:false'));
        assert.ok(html.includes('result:null'));
        assert.ok(html.includes('error:null'));

        await db.close();
    });

    it('should render useReplicationStatus with renderToString without crashing', () => {
        function UseReplicationStatusComponent() {
            /**
             * In SSR, useEffect does not run so the replication subscriptions
             * never start. The hook returns its default state.
             */
            const { syncing, error, lastSyncedAt, canceled } = useReplicationStatus(null);
            return React.createElement('div', null,
                'syncing:' + syncing +
                ',error:' + error +
                ',lastSyncedAt:' + lastSyncedAt +
                ',canceled:' + canceled
            );
        }

        const html = renderToString(
            React.createElement(UseReplicationStatusComponent)
        );

        assert.ok(html.includes('syncing:false'));
        assert.ok(html.includes('error:null'));
        assert.ok(html.includes('lastSyncedAt:null'));
        assert.ok(html.includes('canceled:false'));
    });
});
