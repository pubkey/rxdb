import assert from 'assert';

import config from './config.ts';
import {
    createRxDatabase,
    randomToken
} from '../../plugins/core/index.mjs';
import {
    DB_VIEWER_CHANNEL,
    DB_VIEWER_PROTOCOL_VERSION,
    DB_VIEWER_URL,
    DbViewerBridge,
    estimateBytes,
    isDbViewerMessage,
    mountRxDBDbViewer,
    toWireConnection
} from '../../plugins/db-viewer/index.mjs';
import { schemaObjects, schemas } from '../../plugins/test-utils/index.mjs';

/**
 * The UI of the database viewer is a separate static page that is loaded
 * into an iframe, so what is left to test here is the half that ships inside
 * RxDB: the message guards, the bridge that answers the page, and the
 * collectors it answers with.
 */
describe('db-viewer.test.ts', () => {

    async function createDatabase() {
        const database = await createRxDatabase({
            name: randomToken(10),
            storage: config.storage.getStorage(),
            eventReduce: true,
            ignoreDuplicate: true
        });
        await database.addCollections({
            humans: { schema: schemas.human }
        });
        return database;
    }

    describe('isDbViewerMessage()', () => {
        const valid = {
            channel: DB_VIEWER_CHANNEL,
            version: DB_VIEWER_PROTOCOL_VERSION,
            kind: 'request'
        };
        it('should accept a message of the current protocol', () => {
            assert.strictEqual(isDbViewerMessage(valid), true);
        });
        it('should reject the other postMessage traffic of the page', () => {
            assert.strictEqual(isDbViewerMessage(null), false);
            assert.strictEqual(isDbViewerMessage('hello'), false);
            assert.strictEqual(isDbViewerMessage({ kind: 'request' }), false);
            assert.strictEqual(isDbViewerMessage({ ...valid, channel: 'other' }), false);
        });
        it('should reject a different protocol version', () => {
            assert.strictEqual(
                isDbViewerMessage({ ...valid, version: DB_VIEWER_PROTOCOL_VERSION + 1 }),
                false
            );
        });
    });

    describe('toWireConnection()', () => {
        it('should keep a local connection as it is', () => {
            assert.deepStrictEqual(toWireConnection({ state: 'local' }), { state: 'local' });
        });
        /**
         * A function cannot be structured-cloned into the iframe,
         * so it has to become a flag on the way out.
         */
        it('should replace the disconnect callback with a flag', () => {
            const wire: any = toWireConnection({
                state: 'connected',
                device: 'iPhone',
                transport: 'webrtc',
                writeable: true,
                onDisconnect: () => undefined
            });
            assert.strictEqual(wire.canDisconnect, true);
            assert.strictEqual(typeof wire.onDisconnect, 'undefined');
        });
        it('should report that there is nothing to disconnect', () => {
            const wire: any = toWireConnection({
                state: 'connected',
                device: 'iPhone',
                transport: 'webrtc',
                writeable: false
            });
            assert.strictEqual(wire.canDisconnect, false);
        });
    });

    describe('estimateBytes()', () => {
        it('should measure the serialized size', () => {
            assert.strictEqual(estimateBytes({ a: 1 }), JSON.stringify({ a: 1 }).length);
        });
        it('should not throw on a circular document', () => {
            const circular: any = { a: 1 };
            circular.self = circular;
            assert.strictEqual(estimateBytes(circular), 0);
        });
    });

    describe('the bridge', () => {
        /**
         * The bridge only ever talks to the window of its own iframe, so the
         * test gives it a stand-in that records what was posted.
         */
        function createFakeIframe() {
            const posted: any[] = [];
            const contentWindow = {
                postMessage: (message: any) => posted.push(message)
            };
            return { posted, iframe: { contentWindow } as any };
        }

        function createBridge(database: any, iframe: any, overrides: any = {}) {
            return new DbViewerBridge(database, iframe, 'https://rxdb.info', {
                surface: 'tab',
                pageSize: 100,
                storageName: 'memory',
                dump: null,
                connection: { state: 'local' },
                navigation: { kind: 'collection', name: 'humans' },
                onClose: () => undefined,
                ...overrides
            });
        }

        /**
         * Drives a message through the real `message` listener, which is
         * where the guards of the bridge actually sit.
         */
        function send(
            bridge: any,
            iframe: any,
            message: any,
            overrides: { origin?: string; source?: any; } = {}
        ) {
            bridge.receive({
                source: 'source' in overrides ? overrides.source : iframe.contentWindow,
                origin: overrides.origin ?? 'https://rxdb.info',
                data: message
            });
        }

        function request(method: string, params: any = {}, id = 1) {
            return {
                channel: DB_VIEWER_CHANNEL,
                version: DB_VIEWER_PROTOCOL_VERSION,
                kind: 'request',
                id,
                method,
                params
            };
        }

        function hello() {
            return {
                channel: DB_VIEWER_CHANNEL,
                version: DB_VIEWER_PROTOCOL_VERSION,
                kind: 'hello'
            };
        }

        function settle() {
            return new Promise(resolve => setTimeout(resolve, 150));
        }

        it('should answer the hello with a welcome', async () => {
            const database = await createDatabase();
            const { posted, iframe } = createFakeIframe();
            const bridge = createBridge(database, iframe);
            send(bridge, iframe, hello());
            assert.strictEqual(posted.length, 1);
            assert.strictEqual(posted[0].kind, 'welcome');
            bridge.destroy();
            await database.close();
        });

        it('should ignore a message from a different origin', async () => {
            const database = await createDatabase();
            const { posted, iframe } = createFakeIframe();
            const bridge = createBridge(database, iframe);
            send(bridge, iframe, hello(), { origin: 'https://evil.example.com' });
            assert.strictEqual(posted.length, 0);
            bridge.destroy();
            await database.close();
        });

        it('should ignore a message from a window that is not the iframe', async () => {
            const database = await createDatabase();
            const { posted, iframe } = createFakeIframe();
            const bridge = createBridge(database, iframe);
            send(bridge, iframe, hello(), { source: { postMessage: () => undefined } });
            assert.strictEqual(posted.length, 0);
            bridge.destroy();
            await database.close();
        });

        it('should answer a snapshot with the collections and the schema', async () => {
            const database = await createDatabase();
            const { posted, iframe } = createFakeIframe();
            const bridge = createBridge(database, iframe);
            send(bridge, iframe, request('snapshot'));
            await settle();

            const response = posted.find(message => message.kind === 'response');
            assert.ok(response, 'the bridge did not answer');
            assert.strictEqual(response.ok, true);
            assert.strictEqual(response.result.databaseName, database.name);
            assert.strictEqual(response.result.protocolVersion, DB_VIEWER_PROTOCOL_VERSION);
            assert.strictEqual(response.result.collections.length, 1);
            assert.strictEqual(response.result.collections[0].name, 'humans');
            assert.strictEqual(response.result.collections[0].primaryPath, 'passportId');
            assert.ok(response.result.collections[0].jsonSchema.properties.firstName);
            bridge.destroy();
            await database.close();
        });

        /**
         * Everything the bridge answers is posted into another document, so
         * nothing it sends may carry a function or a class instance.
         */
        it('should only answer with values that survive a structured clone', async () => {
            const database = await createDatabase();
            const { posted, iframe } = createFakeIframe();
            const bridge = createBridge(database, iframe);
            send(bridge, iframe, request('snapshot'));
            await settle();

            const response = posted.find(message => message.kind === 'response');
            assert.ok(response);
            assert.doesNotThrow(() => structuredClone(response));
            bridge.destroy();
            await database.close();
        });

        it('should read documents through the documents method', async () => {
            const database = await createDatabase();
            await database.humans.bulkInsert([
                schemaObjects.humanData('aa', 20, 'Alice'),
                schemaObjects.humanData('bb', 30, 'Bob')
            ]);
            const { posted, iframe } = createFakeIframe();
            const bridge = createBridge(database, iframe);
            send(bridge, iframe, request('documents', {
                collectionName: 'humans',
                selector: {},
                sort: { field: 'passportId', direction: 'asc' },
                skip: 0,
                limit: 100
            }));
            await settle();

            const response = posted.find(message => message.kind === 'response');
            assert.strictEqual(response.ok, true);
            assert.strictEqual(response.result.total, 2);
            assert.strictEqual(response.result.documents.length, 2);
            assert.strictEqual(response.result.documents[0].passportId, 'aa');
            bridge.destroy();
            await database.close();
        });

        it('should write a document that the viewer upserted', async () => {
            const database = await createDatabase();
            const { posted, iframe } = createFakeIframe();
            const bridge = createBridge(database, iframe);
            send(bridge, iframe, request('upsert', {
                collectionName: 'humans',
                document: schemaObjects.humanData('cc', 44, 'Carol')
            }));
            await settle();

            const response = posted.find(message => message.kind === 'response');
            assert.strictEqual(response.ok, true);
            const stored = await database.humans.findOne('cc').exec();
            assert.ok(stored, 'the document was not written');
            assert.strictEqual(stored.firstName, 'Carol');
            bridge.destroy();
            await database.close();
        });

        it('should refuse to write while read-only', async () => {
            const database = await createDatabase();
            const { posted, iframe } = createFakeIframe();
            const bridge = createBridge(database, iframe, {
                surface: 'dump',
                dump: { fileName: 'dump.json', exportedAt: Date.now() }
            });
            send(bridge, iframe, request('upsert', {
                collectionName: 'humans',
                document: schemaObjects.humanData('dd', 44, 'Dave')
            }));
            await settle();

            const response = posted.find(message => message.kind === 'response');
            assert.strictEqual(response.ok, false);
            assert.ok(response.error.includes('read-only'));
            const stored = await database.humans.findOne('dd').exec();
            assert.strictEqual(stored, null);
            bridge.destroy();
            await database.close();
        });

        it('should report an unknown method as a failed response', async () => {
            const database = await createDatabase();
            const { posted, iframe } = createFakeIframe();
            const bridge = createBridge(database, iframe);
            send(bridge, iframe, request('somethingElse'));
            await settle();

            const response = posted.find(message => message.kind === 'response');
            assert.strictEqual(response.ok, false);
            assert.ok(response.error.includes('unknown method'));
            bridge.destroy();
            await database.close();
        });

        it('should explain which index a query used', async () => {
            const database = await createDatabase();
            await database.humans.bulkInsert([
                schemaObjects.humanData('aa', 20, 'Alice'),
                schemaObjects.humanData('bb', 30, 'Bob')
            ]);
            const { posted, iframe } = createFakeIframe();
            const bridge = createBridge(database, iframe);
            send(bridge, iframe, request('explain', {
                collectionName: 'humans',
                selector: {},
                sort: { field: 'passportId', direction: 'asc' }
            }));
            await settle();

            const response = posted.find(message => message.kind === 'response');
            assert.strictEqual(response.ok, true);
            assert.ok(Array.isArray(response.result.index));
            assert.strictEqual(response.result.returned, 2);
            assert.ok(Array.isArray(response.result.findings));
            bridge.destroy();
            await database.close();
        });

        it('should report the real types next to the declared ones', async () => {
            const database = await createDatabase();
            await database.humans.bulkInsert([
                schemaObjects.humanData('aa', 20, 'Alice')
            ]);
            const { posted, iframe } = createFakeIframe();
            const bridge = createBridge(database, iframe);
            send(bridge, iframe, request('schemaReport', {
                collectionName: 'humans',
                sampleSize: 100
            }));
            await settle();

            const response = posted.find(message => message.kind === 'response');
            assert.strictEqual(response.ok, true);
            assert.strictEqual(response.result.sampledCount, 1);
            const firstName = response.result.fields.find(
                (field: any) => field.path === 'firstName'
            );
            assert.ok(firstName);
            assert.deepStrictEqual(firstName.seenTypes, ['string']);
            assert.strictEqual(firstName.declaredType, 'string');
            assert.strictEqual(firstName.indexed, true);
            bridge.destroy();
            await database.close();
        });

        it('should count the documents of the storage', async () => {
            const database = await createDatabase();
            await database.humans.bulkInsert([
                schemaObjects.humanData('aa', 20, 'Alice'),
                schemaObjects.humanData('bb', 30, 'Bob')
            ]);
            const { posted, iframe } = createFakeIframe();
            const bridge = createBridge(database, iframe);
            send(bridge, iframe, request('storageReport', { collectionName: 'humans' }));
            await settle();

            const response = posted.find(message => message.kind === 'response');
            assert.strictEqual(response.ok, true);
            assert.strictEqual(response.result.documentCount, 2);
            bridge.destroy();
            await database.close();
        });

        /**
         * Pushes only start after the viewer said hello, otherwise the bridge
         * would post into a document that is not listening yet.
         */
        it('should not push before the viewer announced itself', async () => {
            const database = await createDatabase();
            const { posted, iframe } = createFakeIframe();
            const bridge = createBridge(database, iframe);
            bridge.start();
            await database.humans.insert(schemaObjects.humanData('ee', 20, 'Erin'));
            await settle();
            assert.strictEqual(posted.length, 0);
            bridge.destroy();
            await database.close();
        });

        it('should push a change once the viewer said hello', async () => {
            const database = await createDatabase();
            const { posted, iframe } = createFakeIframe();
            const bridge = createBridge(database, iframe);
            bridge.start();
            send(bridge, iframe, hello());
            await database.humans.insert(schemaObjects.humanData('ff', 20, 'Frank'));
            await settle();

            const change = posted.find(
                message => message.kind === 'push' && message.stream === 'change'
            );
            assert.ok(change, 'no change was pushed');
            assert.strictEqual(change.payload.collectionName, 'humans');
            assert.strictEqual(change.payload.operation, 'INSERT');
            assert.strictEqual(change.payload.documentId, 'ff');
            assert.strictEqual(change.payload.source, 'local');
            bridge.destroy();
            await database.close();
        });

        it('should mark a write that the viewer itself made', async () => {
            const database = await createDatabase();
            const { posted, iframe } = createFakeIframe();
            const bridge = createBridge(database, iframe);
            bridge.start();
            send(bridge, iframe, hello());
            send(bridge, iframe, request('upsert', {
                collectionName: 'humans',
                document: schemaObjects.humanData('gg', 44, 'Grace')
            }));
            await settle();

            const change = posted.find(
                message => message.kind === 'push' &&
                    message.stream === 'change' &&
                    message.payload.documentId === 'gg'
            );
            assert.ok(change, 'no change was pushed');
            assert.strictEqual(change.payload.source, 'db-viewer');
            bridge.destroy();
            await database.close();
        });
    });

    describe('mountRxDBDbViewer()', () => {
        it('should point at the page that is published with the docs', () => {
            assert.strictEqual(DB_VIEWER_URL, 'https://rxdb.info/html/db-viewer.html');
        });
        it('should throw a readable error when there is no DOM', async function () {
            if (typeof document !== 'undefined') {
                this.skip();
                return;
            }
            const database = await createDatabase();
            assert.throws(
                () => mountRxDBDbViewer(database),
                (error: any) => error.code === 'DBV1'
            );
            await database.close();
        });
    });
});
