import assert from 'assert';
import config from './config';
import AsyncTestUtil, { wait, waitUntil } from 'async-test-util';

import {
    createRxDatabase,
    addRxPlugin,
    randomCouchString,
    RxCollection,
    RxChangeEvent
} from '../../';

import {
    addPouchPlugin,
    getRxStoragePouch
} from '../../plugins/pouchdb';

import {
    replicateWithWebsocketServer,
    startWebsocketServer
} from '../../plugins/replication-websocket';

import {
    wrappedValidateAjvStorage
} from '../../plugins/validate-ajv';


import * as humansCollection from '../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as schemas from '../helper/schemas';
import { nextPort } from '../helper/port-manager';
import { filter, firstValueFrom } from 'rxjs';

config.parallel('server-couchdb.test.ts', () => {
    if (
        !config.platform.isNode() ||
        config.storage.name !== 'pouchdb'
    ) {
        return;
    }

    // below imports have to be conditionally imported (only for Node) that's why we use require here instead of import:
    const express = require('express');
    const fs = require('fs');
    const path = require('path');
    const levelDown = require('leveldown');

    const NodeWebsqlAdapter = require('pouchdb-adapter-leveldb');

    const { RxDBServerCouchDBPlugin } = require('../../plugins/server-couchdb');
    addRxPlugin(RxDBServerCouchDBPlugin);

    it('should run and sync', async function () {
        this.timeout(12 * 1000);
        const port = await nextPort();
        const serverCollection = await humansCollection.create(0, 'human');
        await serverCollection.database.serverCouchDB({
            path: '/db',
            port
        });

        // check access to path
        const colUrl = 'http://0.0.0.0:' + port + '/db/human';
        const res = await fetch(colUrl);
        const got = await res.json();

        assert.strictEqual(got.doc_count, 1);

        const clientCollection = await humansCollection.create(0, 'humanclient');

        // sync
        clientCollection.syncCouchDB({
            remote: colUrl,
            direction: {
                pull: true,
                push: true
            }
        });

        // insert one doc on each side
        const insertServer = schemaObjects.human();
        insertServer.firstName = 'server';
        await serverCollection.insert(insertServer);

        await wait(200);

        const insertClient = schemaObjects.human();
        insertClient.firstName = 'client';
        await clientCollection.insert(insertClient);

        await AsyncTestUtil.waitUntil(async () => {
            const serverDocs = await serverCollection.find().exec();
            return serverDocs.length === 2;
        });

        clientCollection.database.destroy();
        serverCollection.database.destroy();
    });
    it('should run and sync as sub app for express', async function () {
        this.timeout(12 * 1000);
        const port = await nextPort();
        const serverCollection = await humansCollection.create(0);
        const { app, server } = await serverCollection.database.serverCouchDB({
            path: '/',
            port,
            cors: false,
            startServer: false
        });

        // check if server was returned
        if (server !== null) {
            return Promise.reject(
                new Error('Server was created')
            );
        }

        // create new express app and mount sub app
        const customApp = express();
        customApp.use('/rxdb', app);
        const customServer = customApp.listen(port);

        // check access to path
        const colUrl = 'http://0.0.0.0:' + port + '/rxdb/human';
        const res = await fetch(colUrl);
        const got = await res.json();
        assert.strictEqual(got.doc_count, 1);

        const clientCollection = await humansCollection.create(0);

        // sync
        clientCollection.syncCouchDB({
            remote: colUrl
        });

        // insert one doc on each side
        await clientCollection.insert(schemaObjects.human());
        await serverCollection.insert(schemaObjects.human());

        // both collections should have 2 documents
        await AsyncTestUtil.waitUntil(async () => {
            const serverDocs = await serverCollection.find().exec();
            const clientDocs = await clientCollection.find().exec();
            return (clientDocs.length === 2 && serverDocs.length === 2);
        });

        clientCollection.database.destroy();
        serverCollection.database.destroy();

        // custom server has to closed independently
        customServer.close();
    });
    it('should send cors when defined for missing origin', async function () {
        this.timeout(12 * 1000);
        const port = await nextPort();
        const serverCollection = await humansCollection.create(0);
        await serverCollection.database.serverCouchDB({
            path: '/db',
            port,
            cors: true
        });
        const colUrl = 'http://0.0.0.0:' + port + '/db/human';

        const response = await fetch(colUrl);
        const originHeaderName = 'Access-Control-Allow-Origin'.toLowerCase();
        const credentialsHeaderName = 'Access-Control-Allow-Credentials'.toLowerCase();

        const hasOriginHeader = response.headers.get(originHeaderName) === '*';
        const hasCredentialsHeader = response.headers.get(credentialsHeaderName) === 'true';

        if (!hasOriginHeader || !hasCredentialsHeader) {
            throw new Error(
                'cors headers not set: ' +
                JSON.stringify(response.headers, null, 2)
            );
        }
        serverCollection.database.destroy();
    });
    it('should send cors when defined for present origin', async function () {
        this.timeout(12 * 1000);
        const port = await nextPort();
        const serverCollection = await humansCollection.create(0);
        await serverCollection.database.serverCouchDB({
            path: '/db',
            port,
            cors: true
        });
        const origin = 'example.com';
        const colUrl = 'http://0.0.0.0:' + port + '/db/human';
        const response = await fetch(colUrl, {
            headers: {
                'Origin': origin,
            }
        });
        const originHeaderName = 'Access-Control-Allow-Origin'.toLowerCase();
        const credentialsHeaderName = 'Access-Control-Allow-Credentials'.toLowerCase();

        const hasOriginHeader = response.headers.get(originHeaderName) === origin;
        const hasCredentialsHeader = response.headers.get(credentialsHeaderName) === 'true';

        if (!hasOriginHeader || !hasCredentialsHeader) {
            throw new Error(
                'cors headers not set: ' +
                JSON.stringify(response.headers, null, 2)
            );
        }

        serverCollection.database.destroy();
    });
    it('should free port when database is destroyed', async () => {
        const port = await nextPort();
        const col1 = await humansCollection.create(0);
        await col1.database.serverCouchDB({
            port
        });
        await col1.database.destroy();

        const col2 = await humansCollection.create(0);
        await col2.database.serverCouchDB({
            port
        });
        await col2.database.destroy();
    });
    it('using node-websql with an absolute path should work', async () => {
        addPouchPlugin(NodeWebsqlAdapter);
        const dbName = config.rootPath + 'test_tmp/' + randomCouchString(10);
        const db1 = await createRxDatabase({
            name: dbName,
            storage: getRxStoragePouch('leveldb'),
            multiInstance: false
        });
        const cols1 = await db1.addCollections({
            human: {
                schema: schemas.human
            }
        });
        const col1 = cols1.human;

        await col1.insert(schemaObjects.human());

        await db1.serverCouchDB({
            port: await nextPort()
        });

        await col1.insert(schemaObjects.human());

        await db1.destroy();
    });
    it('using full leveldown-module should work', async () => {
        addPouchPlugin(NodeWebsqlAdapter);
        const db1 = await createRxDatabase({
            name: config.rootPath + 'test_tmp/' + randomCouchString(10),
            storage: getRxStoragePouch(levelDown),
            multiInstance: false
        });
        const cols1 = await db1.addCollections({
            human: {
                schema: schemas.human
            }
        });
        const col1 = cols1.human;

        await col1.insert(schemaObjects.human());

        const port = await nextPort();
        await db1.serverCouchDB({
            port
        });

        await col1.insert(schemaObjects.human());

        await AsyncTestUtil.waitUntil(async () => {
            const serverDocs = await col1.find().exec();
            return (serverDocs.length === 2);
        });


        await db1.destroy();
    });


    it('should work on filesystem-storage', async function () {
        addPouchPlugin(NodeWebsqlAdapter);

        const port = await nextPort();
        console.log('should work on filesystem-storage port: ' + port);

        const directoryName = 'couchdb-filesystem-test';
        const testDir = path.join(
            config.rootPath,
            'test_tmp'
        );

        // clean up from previous run
        const dirs: string[] = fs.readdirSync(testDir);
        dirs
            .filter(dir => dir.startsWith(directoryName))
            .forEach(dir => fs.rmdirSync(path.join(testDir, dir), { recursive: true, force: true }));

        const clientDBName = path.join(testDir, directoryName + '-client');
        const serverDBName = path.join(testDir, directoryName + '-server');
        fs.mkdirSync(clientDBName, { recursive: true });
        fs.mkdirSync(serverDBName, { recursive: true });

        const clientDatabase = await createRxDatabase({
            name: clientDBName,
            storage: getRxStoragePouch('leveldb'),
            multiInstance: false
        });
        const cols1 = await clientDatabase.addCollections({
            human: {
                schema: schemas.human
            }
        });
        const clientCollection = cols1.human;

        const serverDatabase = await createRxDatabase({
            name: serverDBName,
            storage: getRxStoragePouch('leveldb'),
            multiInstance: false
        });
        const cols2 = await serverDatabase.addCollections({
            human: {
                schema: schemas.human
            }
        });
        const serverCollection = cols2.human;
        const emitted: any[] = [];
        serverCollection.$.subscribe(e => {
            emitted.push(e);
        });

        const couchdbServer = await serverDatabase.serverCouchDB({
            port
        });
        assert.ok(couchdbServer.pouchApp);

        const replicationState = await clientCollection.syncCouchDB({
            remote: 'http://0.0.0.0:' + port + '/db/human',
            direction: {
                push: true,
                pull: true
            },
            options: {
                live: true
            }
        });
        replicationState.error$.subscribe(err => {
            console.log('# replication error:');
            console.dir(err);
        });

        // both collections should have 2 documents
        await serverCollection.insert(schemaObjects.human('server-doc'));
        await waitUntil(() => serverCollection.find().exec().then(r => r.length === 1));
        await waitUntil(() => clientCollection.find().exec().then(r => r.length === 1));

        await clientCollection.insert(schemaObjects.human('client-doc'));
        // both collections should have 2 docs
        await waitUntil(() => clientCollection.find().exec().then(r => r.length === 2));
        await waitUntil(async () => {
            const docs = await serverCollection.find().exec();
            if (docs.length > 2) {
                throw new Error('too many documents');
            }
            return docs.length === 2;
        });

        // must have emitted both events
        assert.strictEqual(emitted.length, 2);
        await clientDatabase.destroy();
        await serverDatabase.destroy();
    });
    it('should work for collections with later schema versions', async function () {
        this.timeout(12 * 1000);
        const port = await nextPort();
        const serverCollection = await humansCollection.createMigrationCollection(0);
        const serverResponse = await serverCollection.database.serverCouchDB({
            path: '/db',
            port
        });
        assert.ok(serverResponse);


        // check access to path
        const colUrl = 'http://0.0.0.0:' + port + '/db/human';
        const res = await fetch(colUrl);
        const got = await res.json();
        assert.strictEqual(got.doc_count, 1);

        const clientCollection = await humansCollection.createMigrationCollection(0);

        // sync
        clientCollection.syncCouchDB({
            remote: colUrl
        });

        // insert one doc on each side
        await clientCollection.insert(schemaObjects.simpleHumanV3());
        await serverCollection.insert(schemaObjects.simpleHumanV3());

        // both collections should have 2 documents
        await AsyncTestUtil.waitUntil(async () => {
            const serverDocs = await serverCollection.find().exec();
            const clientDocs = await clientCollection.find().exec();
            return (clientDocs.length === 2 && serverDocs.length === 2);
        });

        await clientCollection.database.destroy();
        await serverCollection.database.destroy();
    });
    it('should work for dynamic collection-names', async () => {
        const port = await nextPort();
        const name = 'foobar';
        const serverCollection = await humansCollection.create(0, name);
        await serverCollection.database.serverCouchDB({
            port
        });
        const clientCollection = await humansCollection.create(0, name);

        // sync
        clientCollection.syncCouchDB({
            remote: 'http://0.0.0.0:' + port + '/db/' + name
        });

        // insert one doc on each side
        await clientCollection.insert(schemaObjects.human());
        await serverCollection.insert(schemaObjects.human());

        // both collections should have 2 documents
        await AsyncTestUtil.waitUntil(async () => {
            const serverDocs = await serverCollection.find().exec();
            const clientDocs = await clientCollection.find().exec();
            return (clientDocs.length === 2 && serverDocs.length === 2);
        });

        await clientCollection.database.destroy();
        await serverCollection.database.destroy();
    });
    it('should throw if collections that created after server()', async () => {
        const port = await nextPort();
        const db1 = await createRxDatabase({
            name: randomCouchString(10),
            storage: getRxStoragePouch('memory'),
            multiInstance: false
        });
        await db1.serverCouchDB({
            port
        });
        await AsyncTestUtil.assertThrows(
            () => db1.addCollections({
                human: {
                    schema: schemas.human
                }
            }),
            'RxError',
            'after'
        );
        await db1.destroy();
    });
    it('should throw on startup when port is already used', async () => {
        const port = await nextPort();
        const db1 = await createRxDatabase({
            name: randomCouchString(10),
            storage: getRxStoragePouch('memory'),
            multiInstance: false
        });
        await db1.serverCouchDB({
            port
        });

        // wait until started up
        await AsyncTestUtil.waitUntil(async () => {
            try {
                const res = await fetch('http://0.0.0.0:' + port + '/db/');
                await res.json();
                return true;
            } catch (err) {
                return false;
            }
        });

        const db2 = await createRxDatabase({
            name: randomCouchString(10),
            storage: getRxStoragePouch('memory'),
            multiInstance: false
        });

        let hasThrown = false;
        try {
            await db2.serverCouchDB({ port });
        } catch (err) {
            hasThrown = true;
        }
        assert.ok(hasThrown);

        db1.destroy();
        db2.destroy();
    });
    it('using couchdb AND websocket replication must work correctly', async () => {
        const couchPort = await nextPort();
        const couchUrl = 'http://0.0.0.0:' + couchPort + '/db/human';
        const websocketPort = await nextPort();
        const websocketUrl = 'ws://localhost:' + websocketPort;

        const datastoreDBName = config.rootPath + 'test_tmp/datastore-' + randomCouchString(10);
        type Collections = {
            human: RxCollection<schemas.HumanDocumentType>;
        };

        const datastoreDB = await createRxDatabase<Collections>({
            name: datastoreDBName,
            storage: wrappedValidateAjvStorage({
                storage: getRxStoragePouch('leveldb')
            }),
            multiInstance: false
        });
        await datastoreDB.addCollections({
            human: {
                schema: schemas.human
            }
        });

        await datastoreDB.serverCouchDB({
            port: couchPort
        });
        await startWebsocketServer({
            database: datastoreDB,
            port: websocketPort
        });


        const couchClientDBName = config.rootPath + 'test_tmp/couchclient-' + randomCouchString(10);
        const couchClientDB = await createRxDatabase<Collections>({
            name: couchClientDBName,
            storage: wrappedValidateAjvStorage({
                storage: getRxStoragePouch('leveldb')
            }),
            multiInstance: false
        });
        await couchClientDB.addCollections({
            human: {
                schema: schemas.human
            }
        });
        await couchClientDB.human.syncCouchDB({
            remote: couchUrl,
            direction: {
                push: true,
                pull: true
            },
            options: {
                live: true
            }
        });


        /**
         * We also create an instance that replicates via non-live one-time couchdb replication.
         */
        const couchOnceClientDBName = config.rootPath + 'test_tmp/couchonceclient-' + randomCouchString(10);
        const couchOnceClientDB = await createRxDatabase<Collections>({
            name: couchOnceClientDBName,
            storage: wrappedValidateAjvStorage({
                storage: getRxStoragePouch('leveldb')
            }),
            multiInstance: false
        });
        await couchOnceClientDB.addCollections({
            human: {
                schema: schemas.human
            }
        });
        async function syncCouchOnce() {
            const state = await couchOnceClientDB.human.syncCouchDB({
                remote: couchUrl,
                direction: {
                    push: true,
                    pull: true
                },
                options: {
                    live: false,
                    retry: true,
                    batch_size: 10,
                    batches_limit: 1
                }
            });
            await firstValueFrom(
                state.complete$.pipe(
                    filter(x => !!x),
                )
            );
        }
        await syncCouchOnce();



        const websocketClientDB = await createRxDatabase<Collections>({
            name: randomCouchString(10),
            storage: getRxStoragePouch('memory'),
            multiInstance: false
        });
        await websocketClientDB.addCollections({
            human: {
                schema: schemas.human
            }
        });

        const websocketReplicationState = await replicateWithWebsocketServer({
            collection: websocketClientDB.human,
            url: websocketUrl
        });
        await websocketReplicationState.awaitInSync();

        async function waitUntilDocExists(
            collection: RxCollection,
            docId: string
        ) {
            await waitUntil(() => {
                const doc = collection.findOne(docId).exec();
                return !!doc;
            });
        }

        const emittedDatastore: RxChangeEvent<schemas.HumanDocumentType>[] = [];
        datastoreDB.$.subscribe(ev => {
            emittedDatastore.push(ev);
        });
        const emittedCouchClient: RxChangeEvent<schemas.HumanDocumentType>[] = [];
        couchClientDB.$.subscribe(ev => emittedCouchClient.push(ev));
        const emittedWebsocketClient: RxChangeEvent<schemas.HumanDocumentType>[] = [];
        websocketClientDB.$.subscribe(ev => emittedWebsocketClient.push(ev));


        // insert datastore
        await datastoreDB.human.insert(schemaObjects.human('doc-datastore'));
        await waitUntilDocExists(websocketClientDB.human, 'doc-datastore');
        await waitUntilDocExists(couchClientDB.human, 'doc-datastore');
        await syncCouchOnce();
        await waitUntilDocExists(couchOnceClientDB.human, 'doc-datastore');

        // insert websocket
        await websocketClientDB.human.insert(schemaObjects.human('doc-websocket'));
        await waitUntilDocExists(datastoreDB.human, 'doc-websocket');
        await waitUntilDocExists(couchClientDB.human, 'doc-websocket');
        await syncCouchOnce();
        await waitUntilDocExists(couchOnceClientDB.human, 'doc-websocket');

        // insert couch client
        await couchClientDB.human.insert(schemaObjects.human('doc-couch'));
        await waitUntilDocExists(datastoreDB.human, 'doc-couch');
        await waitUntilDocExists(websocketClientDB.human, 'doc-couch');
        await syncCouchOnce();
        await waitUntilDocExists(couchOnceClientDB.human, 'doc-couch');

        // insert couch once client
        await couchOnceClientDB.human.insert(schemaObjects.human('doc-couch-once'));
        await syncCouchOnce();
        await waitUntilDocExists(datastoreDB.human, 'doc-couch-once');
        await waitUntilDocExists(couchClientDB.human, 'doc-couch-once');
        await waitUntilDocExists(websocketClientDB.human, 'doc-couch-once');


        // check events
        async function ensureCorrectEmits(ar: RxChangeEvent<schemas.HumanDocumentType>[]) {
            await waitUntil(() => ar.length === 4);
        }
        await ensureCorrectEmits(emittedDatastore);
        await ensureCorrectEmits(emittedCouchClient);
        await ensureCorrectEmits(emittedWebsocketClient);

        await Promise.all([
            datastoreDB.destroy(),
            couchClientDB.destroy(),
            couchOnceClientDB.destroy(),
            websocketClientDB.destroy()
        ]);
    });
    describe('issues', () => {
        describe('#1447 server path not working', () => {
            it('use the path when given', async function () {
                this.timeout(12 * 1000);
                const port = await nextPort();
                const subPath = '/db2';
                const serverCollection = await humansCollection.create(0);
                await serverCollection.database.serverCouchDB({
                    subPath,
                    port
                });

                const colUrl = 'http://0.0.0.0:' + port + subPath + '/human';
                const res = await fetch(colUrl);
                const got = await res.json();
                assert.strictEqual(got.doc_count, 1);

                serverCollection.database.destroy();
            });
            it('use the path with ending slash', async function () {
                this.timeout(12 * 1000);
                const port = await nextPort();
                const subPath = '/db3/';
                const serverCollection = await humansCollection.create(0);
                await serverCollection.database.serverCouchDB({
                    subPath,
                    port
                });

                const colUrl = 'http://0.0.0.0:' + port + subPath + 'human';
                const res = await fetch(colUrl);
                const got = await res.json();
                assert.strictEqual(got.doc_count, 1);

                serverCollection.database.destroy();
            });
            it('should be able to use the root /', async function () {
                this.timeout(12 * 1000);
                const port = await nextPort();
                const subPath = '/';
                const serverCollection = await humansCollection.create(0);
                await serverCollection.database.serverCouchDB({
                    subPath,
                    port
                });

                const colUrl = 'http://0.0.0.0:' + port + subPath + 'human';
                const res = await fetch(colUrl);
                const got = await res.json();
                assert.strictEqual(got.doc_count, 1);

                serverCollection.database.destroy();
            });
            it('having a collection with leveldb and no docs, will break the replication', async function () {
                const dbName = config.rootPath + 'test_tmp/' + randomCouchString(10);
                const db = await createRxDatabase({
                    name: dbName,
                    storage: getRxStoragePouch('leveldb'),
                    multiInstance: false
                });
                const cols = await db.addCollections({
                    human: {
                        schema: schemas.human
                    }
                });
                const col = cols.human;

                const port = await nextPort();
                await db.serverCouchDB({
                    port
                });
                await AsyncTestUtil.waitUntil(async () => {
                    try {
                        const res = await fetch('http://localhost:' + port + '/db/' + col.name);
                        const got = await res.json();
                        return !!got.doc_count;
                    } catch (err) {
                        console.dir(err);
                        return false;
                    }
                });
                db.destroy();
            });
        });
    });
});
