/**
 * this is the test for the server-tutorial
 * IMPORTANT: whenever you change something here,
 * ensure it is also changed in /docs-src/tutorials/server.md
 */

import {
    addRxPlugin,
    createRxDatabase,
    RxJsonSchema,
} from 'rxdb';
import {
    addPouchPlugin,
    getRxStoragePouch
} from 'rxdb/plugins/pouchdb';
import * as MemoryAdapter from 'pouchdb-adapter-memory';
addPouchPlugin(MemoryAdapter);

import { RxDBServerCouchDBPlugin } from 'rxdb/plugins/server-couchdb';
addRxPlugin(RxDBServerCouchDBPlugin);

import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
addRxPlugin(RxDBLeaderElectionPlugin);

import * as PouchHttpPlugin from 'pouchdb-adapter-http';
addPouchPlugin(PouchHttpPlugin);

import AsyncTestUtil from 'async-test-util';
import * as assert from 'assert';

import * as os from 'os';
import * as path from 'path';


declare type ItemDocumentData = {
    key: string;
    value: string;
};

async function run() {


    // create database
    const db = await createRxDatabase({
        name: 'mydb',
        storage: getRxStoragePouch('memory')
    });

    // create a collection
    const mySchema: RxJsonSchema<ItemDocumentData> = {
        version: 0,
        type: 'object',
        primaryKey: 'key',
        properties: {
            key: {
                type: 'string'
            },
            value: {
                type: 'string'
            }
        },
        required: ['key']
    };
    await db.addCollections({
        items: {
            schema: mySchema
        }
    });

    // insert one document
    await db.items.insert({
        key: 'foo',
        value: 'bar'
    });

    // spawn the server
    const serverState = await db.serverCouchDB({
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
    const colUrl = 'http://0.0.0.0:3000/db/items';
    console.log('You can now open ' + colUrl);

    // check access to path
    const res = await fetch(colUrl);
    const got = JSON.parse(await res.json());
    assert.strictEqual(got.doc_count, 1);

    /**
     * on the client
     */
    const clientDB = await createRxDatabase({
        name: 'clientdb',
        storage: getRxStoragePouch('memory')
    });

    // create a collection
    await clientDB.addCollections({
        items: {
            schema: mySchema
        }
    });

    // replicate with server
    clientDB.items.syncCouchDB({
        remote: 'http://0.0.0.0:3000/db/items'
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
