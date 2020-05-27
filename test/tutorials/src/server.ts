/**
 * this is the test for the server-tutorial
 * IMPORTANT: whenever you change something here,
 * ensure it is also changed in /docs-src/tutorials/server.md
 */

import {
    addRxPlugin,
    createRxDatabase
} from 'rxdb';
import * as MemoryAdapter from 'pouchdb-adapter-memory';
addRxPlugin(MemoryAdapter);

import { RxDBServerPlugin } from 'rxdb/plugins/server';
addRxPlugin(RxDBServerPlugin);

import * as PouchHttpPlugin from 'pouchdb-adapter-http';
addRxPlugin(PouchHttpPlugin);

import AsyncTestUtil from 'async-test-util';
import * as request from 'request-promise-native';
import * as assert from 'assert';

import * as os from 'os';
import * as path from 'path';

async function run() {


    // create database
    const db = await createRxDatabase({
        name: 'mydb',
        adapter: 'memory'
    });

    // create a collection
    const mySchema = {
        version: 0,
        type: 'object',
        properties: {
            key: {
                type: 'string',
                primary: true
            },
            value: {
                type: 'string'
            }
        }
    };
    await db.collection({
        name: 'items',
        schema: mySchema
    });

    // insert one document
    await db.items.insert({
        key: 'foo',
        value: 'bar'
    });

    // spawn the server
    const serverState = db.server({
        path: '/db',
        port: 3000,
        cors: true,
        pouchdbExpressOptions: {
            inMemoryConfig: true, // do not write a config.json
            // save logs in tmp folder
            logPath: path.join(os.tmpdir(), 'rxdb-server-log.txt')
        }
    });
    console.log('You can now open http://localhost:3000/db');
    // and should see something like '{"express-pouchdb":"Welcome!","version":"4.1.0","pouchdb-adapters":["memory"],"vendor":{"name":"PouchDB authors","version":"4.1.0"},"uuid":"b2de36bf-7d4f-4ad1-89a4-da08ec0de227"}'

    // check if collection is there
    const colUrl = 'http://localhost:3000/db/items';
    console.log('You can now open ' + colUrl);

    // check access to path
    const gotJson = await request(colUrl);
    const got = JSON.parse(gotJson);
    assert.strictEqual(got.doc_count, 1);

    /**
     * on the client
     */
    const clientDB = await createRxDatabase({
        name: 'clientdb',
        adapter: 'memory'
    });

    // create a collection
    await clientDB.collection({
        name: 'items',
        schema: mySchema
    });

    // replicate with server
    clientDB.items.sync({
        remote: 'http://localhost:3000/db/items'
    });

    await AsyncTestUtil.waitUntil(async () => {
        const docs = await clientDB.items.find().exec();
        return docs.length === 1;
    });

    // close the server
    serverState.server.close();

    // clean up
    db.destroy();
    clientDB.destroy();
    process.exit();
}



run();
