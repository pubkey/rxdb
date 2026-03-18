import assert from 'assert';
import {
    createRxDatabase,
    randomToken,
} from '../../plugins/core/index.mjs';
import {
    getDatabaseConnectionParams,
    startRxDBViewer,
    VIEWER_DEFAULT_SIGNALING_SERVER,
} from '../../plugins/viewer/index.mjs';
import type {
    ViewerConnectionParams,
    ViewerState
} from '../../plugins/viewer/index.mjs';
import config from './config.ts';
import {
    schemaObjects,
    schemas,
    isNode,
    isDeno
} from '../../plugins/test-utils/index.mjs';

describe('viewer.test.ts', function () {
    this.timeout(1000 * 20);

    if (isDeno) {
        // WebRTC/WebSocket polyfills not available in Deno
        return;
    }

    let webSocketConstructor: any;
    describe('init', () => {
        it('import WebSocket polyfill on Node.js', async () => {
            if (isNode) {
                const wsModule = await import('ws');
                webSocketConstructor = wsModule.WebSocket;
            }
        });
    });

    function getOptions() {
        return webSocketConstructor
            ? { webSocketConstructor, signalingServerUrl: 'ws://localhost:18006' }
            : { signalingServerUrl: 'ws://localhost:18006' };
    }

    async function createTestDatabase() {
        const db = await createRxDatabase({
            name: randomToken(10),
            storage: config.storage.getStorage(),
        });
        await db.addCollections({
            humans: {
                schema: schemas.human,
            },
        });
        return db;
    }

    describe('getDatabaseConnectionParams()', () => {
        it('should lazily create a viewer server and return connection params', async () => {
            const db = await createTestDatabase();
            const params = getDatabaseConnectionParams(db, getOptions());

            assert.ok(params);
            assert.ok(typeof params.topic === 'string');
            assert.ok(params.topic.length > 0);
            assert.ok(typeof params.signalingServerUrl === 'string');
            assert.strictEqual(params.databaseName, db.name);

            await db.close();
        });

        it('should return the same params on subsequent calls (cached)', async () => {
            const db = await createTestDatabase();
            const params1 = getDatabaseConnectionParams(db, getOptions());
            const params2 = getDatabaseConnectionParams(db, getOptions());

            assert.strictEqual(params1.topic, params2.topic);
            assert.strictEqual(params1.signalingServerUrl, params2.signalingServerUrl);
            assert.strictEqual(params1.databaseName, params2.databaseName);

            await db.close();
        });

        it('should use custom signaling server URL when provided', async () => {
            const db = await createTestDatabase();
            const customUrl = 'ws://localhost:18006';
            const params = getDatabaseConnectionParams(db, {
                ...getOptions(),
                signalingServerUrl: customUrl,
            });

            assert.strictEqual(params.signalingServerUrl, customUrl);

            await db.close();
        });

        it('should use custom topic when provided', async () => {
            const db = await createTestDatabase();
            const customTopic = 'my-custom-topic-' + randomToken(6);
            const params = getDatabaseConnectionParams(db, {
                ...getOptions(),
                topic: customTopic,
            });

            assert.strictEqual(params.topic, customTopic);

            await db.close();
        });

        it('should create different topics for different databases', async () => {
            const db1 = await createTestDatabase();
            const db2 = await createTestDatabase();

            const params1 = getDatabaseConnectionParams(db1, getOptions());
            const params2 = getDatabaseConnectionParams(db2, getOptions());

            assert.notStrictEqual(params1.topic, params2.topic);

            await db1.close();
            await db2.close();
        });
    });

    describe('startRxDBViewer()', () => {
        it('should return a ViewerState with connectionParams and close()', async () => {
            const db = await createTestDatabase();
            const state = await startRxDBViewer(db, getOptions());

            assert.ok(state);
            assert.ok(state.connectionParams);
            assert.ok(typeof state.connectionParams.topic === 'string');
            assert.ok(typeof state.close === 'function');

            await db.close();
        });

        it('should return the same state if called multiple times', async () => {
            const db = await createTestDatabase();
            const state1 = await startRxDBViewer(db, getOptions());
            const state2 = await startRxDBViewer(db, getOptions());

            assert.strictEqual(state1.connectionParams.topic, state2.connectionParams.topic);

            await db.close();
        });

        it('should share state with getDatabaseConnectionParams()', async () => {
            const db = await createTestDatabase();
            const state = await startRxDBViewer(db, getOptions());
            const params = getDatabaseConnectionParams(db);

            assert.strictEqual(state.connectionParams.topic, params.topic);

            await db.close();
        });

        it('should be closable manually', async () => {
            const db = await createTestDatabase();
            const state = await startRxDBViewer(db, getOptions());

            // Close the viewer manually
            await state.close();

            // After closing, getDatabaseConnectionParams creates a new server
            const newParams = getDatabaseConnectionParams(db, getOptions());
            assert.notStrictEqual(state.connectionParams.topic, newParams.topic);

            await db.close();
        });
    });

    describe('auto-close on database close', () => {
        it('should clean up viewer when database is closed', async () => {
            const db = await createTestDatabase();
            const params = getDatabaseConnectionParams(db, getOptions());

            assert.ok(params.topic);

            // Close the database - this should auto-close the viewer
            await db.close();

            // Create a new database and verify a new viewer would get new params
            const db2 = await createTestDatabase();
            const params2 = getDatabaseConnectionParams(db2, getOptions());
            assert.notStrictEqual(params.topic, params2.topic);

            await db2.close();
        });
    });

    describe('VIEWER_DEFAULT_SIGNALING_SERVER', () => {
        it('should export the default signaling server URL', () => {
            assert.ok(typeof VIEWER_DEFAULT_SIGNALING_SERVER === 'string');
            assert.ok(VIEWER_DEFAULT_SIGNALING_SERVER.startsWith('wss://'));
        });
    });
});
