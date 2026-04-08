/**
 * SSR (Server-Side Rendering) tests for the React plugin.
 * These tests run WITHOUT jsdom to ensure the React plugin
 * does not accidentally use browser globals like window or document
 * which are not available in SSR environments (e.g. Next.js SSR, Remix loaders).
 */
import assert from 'assert';
import React from 'react';
import { renderToString } from 'react-dom/server';

import {
    createRxDatabase,
    randomToken,
    addRxPlugin,
    RxDatabase,
} from '../plugins/core/index.mjs';
import { RxDBDevModePlugin } from '../plugins/dev-mode/index.mjs';
import { getRxStorageMemory } from '../plugins/storage-memory/index.mjs';
import { wrappedValidateAjvStorage } from '../plugins/validate-ajv/index.mjs';

import {
    RxDatabaseProvider,
    useRxDatabase,
    useRxQuery,
    useLiveRxQuery,
    useRxCollection,
} from '../plugins/react/index.mjs';

addRxPlugin(RxDBDevModePlugin);

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
    });

    it('should render the RxDatabaseProvider with renderToString', async () => {
        const db: RxDatabase = await createRxDatabase({
            name: randomToken(10),
            storage: wrappedValidateAjvStorage({ storage: getRxStorageMemory() }),
        });

        const html = renderToString(
            React.createElement(
                RxDatabaseProvider,
                { database: db, children: React.createElement('div', null, 'SSR content') }
            )
        );

        assert.ok(html.includes('SSR content'));

        await db.close();
    });
});
