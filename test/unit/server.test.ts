import assert from 'assert';
import config from './config';
import AsyncTestUtil from 'async-test-util';
import request from 'request-promise-native';
import requestR from 'request';

import {
    createRxDatabase,
    addRxPlugin,
    randomCouchString
} from '../../plugins/core';
import * as humansCollection from '../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as schemas from '../helper/schemas';

config.parallel('server.test.js', () => {
    if (!config.platform.isNode()) return;

    // below imports have to be conditionally imported (only for Node) that's why we use require here instead of import:
    const express = require('express');
    const fs = require('fs');

    const NodeWebsqlAdapter = require('pouchdb-adapter-leveldb');

    const ServerPlugin = require('../../plugins/server');
    addRxPlugin(ServerPlugin);

    let lastPort = 3000;
    const nexPort = () => lastPort++;

    it('should run and sync', async function () {
        this.timeout(12 * 1000);
        const port = nexPort();
        const serverCollection = await humansCollection.create(0);
        await serverCollection.database.server({
            path: '/db',
            port
        });


        // check access to path
        const colUrl = 'http://localhost:' + port + '/db/human';
        const gotJson = await request(colUrl);
        const got = JSON.parse(gotJson);
        assert.strictEqual(got.doc_count, 1);

        const clientCollection = await humansCollection.create(0);

        // sync
        clientCollection.sync({
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
    });
    it('should run and sync as sub app for express', async function () {
        this.timeout(12 * 1000);
        const port = nexPort();
        const serverCollection = await humansCollection.create(0);
        const { app, server } = await serverCollection.database.server({
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
        const colUrl = 'http://localhost:' + port + '/rxdb/human';
        const gotJson = await request(colUrl);

        const got = JSON.parse(gotJson);
        assert.strictEqual(got.doc_count, 1);

        const clientCollection = await humansCollection.create(0);

        // sync
        clientCollection.sync({
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
        const port = nexPort();
        const serverCollection = await humansCollection.create(0);
        await serverCollection.database.server({
            path: '/db',
            port,
            cors: true
        });
        const colUrl = 'http://localhost:' + port + '/db/human';

        await new Promise((res, rej) => {
            requestR({
                method: 'GET',
                url: colUrl,
            }, (error, response) => {
                if (error) rej(error);

                const responseHeaders: any = Object.keys(response.headers).reduce((acc, header) => ({
                    ...acc,
                    [header.toLowerCase()]: response.headers[header]
                }), {});
                const originHeaderName = 'Access-Control-Allow-Origin'.toLowerCase();
                const credentialsHeaderName = 'Access-Control-Allow-Credentials'.toLowerCase();

                const hasOriginHeader = responseHeaders[originHeaderName] === '*';
                const hasCredentialsHeader = responseHeaders[credentialsHeaderName] === 'true';

                if (!hasOriginHeader || !hasCredentialsHeader) {
                    rej(
                        new Error(
                            'cors headers not set: ' +
                            JSON.stringify(response.headers, null, 2)
                        )
                    );
                } else res(null);
            });
        });

        serverCollection.database.destroy();
    });
    it('should send cors when defined for present origin', async function () {
        this.timeout(12 * 1000);
        const port = nexPort();
        const serverCollection = await humansCollection.create(0);
        await serverCollection.database.server({
            path: '/db',
            port,
            cors: true
        });
        const colUrl = 'http://localhost:' + port + '/db/human';

        const origin = 'example.com';
        await new Promise((res, rej) => {
            requestR({
                method: 'GET',
                url: colUrl,
                headers: {
                    'Origin': origin,
                }
            }, (error, response) => {
                if (error) rej(error);

                const responseHeaders: any = Object.keys(response.headers).reduce((acc, header) => ({
                    ...acc,
                    [header.toLowerCase()]: response.headers[header]
                }), {});
                const originHeaderName = 'Access-Control-Allow-Origin'.toLowerCase();
                const credentialsHeaderName = 'Access-Control-Allow-Credentials'.toLowerCase();

                const hasOriginHeader = responseHeaders[originHeaderName] === origin;
                const hasCredentialsHeader = responseHeaders[credentialsHeaderName] === 'true';

                if (!hasOriginHeader || !hasCredentialsHeader) {
                    rej(
                        new Error(
                            'cors headers not set: ' +
                            JSON.stringify(response.headers, null, 2)
                        )
                    );
                } else res(null);
            });
        });

        serverCollection.database.destroy();
    });
    it('should free port when database is destroyed', async () => {
        const port = 5000;
        const col1 = await humansCollection.create(0);
        await col1.database.server({
            port
        });
        await col1.database.destroy();

        const col2 = await humansCollection.create(0);
        await col2.database.server({
            port
        });
        col2.database.destroy();
    });
    it('using node-websql with an absoulte path should work', async () => {
        addRxPlugin(NodeWebsqlAdapter);
        const dbName = config.rootPath + 'test_tmp/' + randomCouchString(10);
        const db1 = await createRxDatabase({
            name: dbName,
            adapter: 'leveldb',
            multiInstance: false
        });
        const col1 = await db1.collection({
            name: 'human',
            schema: schemas.human
        });

        await col1.insert(schemaObjects.human());

        await db1.server({
            port: nexPort()
        });

        await col1.insert(schemaObjects.human());

        db1.destroy();
    });
    it('should work on filesystem-storage', async () => {
        addRxPlugin(NodeWebsqlAdapter);

        const port = nexPort();

        const db1Name = config.rootPath + 'test_tmp/' + randomCouchString(10);
        const db2Name = config.rootPath + 'test_tmp/' + randomCouchString(10);
        fs.mkdirSync(db1Name, { recursive: true });
        fs.mkdirSync(db2Name, { recursive: true });

        const db1 = await createRxDatabase({
            name: db1Name,
            adapter: 'leveldb',
            multiInstance: false
        });
        const col1 = await db1.collection({
            name: 'human',
            schema: schemas.human
        });

        const db2 = await createRxDatabase({
            name: db2Name,
            adapter: 'leveldb',
            multiInstance: false
        });
        const col2 = await db2.collection({
            name: 'human',
            schema: schemas.human
        });

        db1.server({
            port
        });

        await col2.sync({
            remote: 'http://localhost:' + port + '/db/human'
        });

        await col1.insert(schemaObjects.human());
        await col2.insert(schemaObjects.human());

        const findDoc = col1.findOne().exec();
        assert.ok(findDoc);

        // both collections should have 2 documents
        await AsyncTestUtil.waitUntil(async () => {
            const serverDocs = await col1.find().exec();
            const clientDocs = await col2.find().exec();
            return (clientDocs.length === 2 && serverDocs.length === 2);
        });

        db1.destroy();
        db2.destroy();
    });
    it('should work for collections with later schema versions', async function () {
        this.timeout(12 * 1000);
        const port = nexPort();
        const serverCollection = await humansCollection.createMigrationCollection(0);
        await serverCollection.database.server({
            path: '/db',
            port
        });


        // check access to path
        const colUrl = 'http://localhost:' + port + '/db/human';
        const gotJson = await request(colUrl);
        const got = JSON.parse(gotJson);
        assert.strictEqual(got.doc_count, 1);

        const clientCollection = await humansCollection.createMigrationCollection(0);

        // sync
        clientCollection.sync({
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

        clientCollection.database.destroy();
        serverCollection.database.destroy();
    });
    it('should work for dynamic collection-names', async () => {
        const port = nexPort();
        const name = 'foobar';
        const serverCollection = await humansCollection.create(0, name);
        await serverCollection.database.server({
            port
        });
        const clientCollection = await humansCollection.create(0, name);

        // sync
        clientCollection.sync({
            remote: 'http://localhost:' + port + '/db/' + name
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
    });
    it('should throw if collections that created after server()', async () => {
        const port = nexPort();
        const db1 = await createRxDatabase({
            name: randomCouchString(10),
            adapter: 'memory',
            multiInstance: false
        });
        db1.server({
            port
        });
        await AsyncTestUtil.assertThrows(
            () => db1.collection({
                name: 'human',
                schema: schemas.human
            }),
            'RxError',
            'after'
        );

        db1.destroy();
    });
    describe('issues', () => {
        describe('#1447 server path not working', () => {
            it('use the path when given', async function () {
                this.timeout(12 * 1000);
                const port = nexPort();
                const path = '/db2';
                const serverCollection = await humansCollection.create(0);
                await serverCollection.database.server({
                    path,
                    port
                });

                const colUrl = 'http://localhost:' + port + path + '/human';
                const gotJson = await request(colUrl);
                const got = JSON.parse(gotJson);
                assert.strictEqual(got.doc_count, 1);

                serverCollection.database.destroy();
            });
            it('use the path with ending slash', async function () {
                this.timeout(12 * 1000);
                const port = nexPort();
                const path = '/db3/';
                const serverCollection = await humansCollection.create(0);
                await serverCollection.database.server({
                    path,
                    port
                });

                const colUrl = 'http://localhost:' + port + path + 'human';
                const gotJson = await request(colUrl);
                const got = JSON.parse(gotJson);
                assert.strictEqual(got.doc_count, 1);

                serverCollection.database.destroy();
            });
            it('should be able to use the root /', async function () {
                this.timeout(12 * 1000);
                const port = nexPort();
                const path = '/';
                const serverCollection = await humansCollection.create(0);
                await serverCollection.database.server({
                    path,
                    port
                });

                const colUrl = 'http://localhost:' + port + path + 'human';
                const gotJson = await request(colUrl);
                const got = JSON.parse(gotJson);
                assert.strictEqual(got.doc_count, 1);

                serverCollection.database.destroy();
            });
            it('having a collection with leveldb and no doc, will not make sync working', async function () {
                const dbName = config.rootPath + 'test_tmp/' + randomCouchString(10);
                const db = await createRxDatabase({
                    name: dbName,
                    adapter: 'leveldb',
                    multiInstance: false
                });
                const col = await db.collection({
                    name: 'human',
                    schema: schemas.human
                });
                const port = nexPort();
                await db.server({
                    port
                });
                await AsyncTestUtil.waitUntil(async () => {
                    try {
                        const gotJson = await request('http://localhost:' + port + '/db/' + col.name);
                        const got = JSON.parse(gotJson);
                        return !!got.doc_count;
                    } catch (err) {
                        return false;
                    }
                });
                db.destroy();
            });
        });
    });
});
