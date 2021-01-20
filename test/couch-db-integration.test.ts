/**
 * this test checks the integration with couchdb
 * run 'npm run test:couchdb' to use it
 * You need a running couchdb-instance on port 5984
 * Run 'npm run couch:start' to spawn a docker-container
 */
import assert from 'assert';
import AsyncTestUtil from 'async-test-util';

import {
    addRxPlugin
} from '../';
addRxPlugin(require('pouchdb-adapter-memory'));
addRxPlugin(require('pouchdb-adapter-http'));

import * as humansCollection from './helper/humans-collection';
import * as schemaObjects from './helper/schema-objects';

describe('couchdb-db-integration.test.js', () => {
    const COUCHDB_URL = 'http://127.0.0.1:5984/testreplicat';
    // const COUCHDB_NAME = 'testreplication';
    const fetchOptions: RequestInit = {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        headers: {
            'Content-Type': 'application/json',
        },

        body:  JSON.stringify({req: 'request'})
    };

    it('create remote database', async () => {
        fetchOptions.method = 'PUT';
     const resp =  await fetch(COUCHDB_URL, fetchOptions);
     const respJson = await resp.json();
     assert.strictEqual(respJson.ok, true);
    });

    it('sync to couchdb', async () => {
        const col = await humansCollection.create(0);

        const couchName = COUCHDB_URL;
        console.log(couchName);
        const replicationState = await col.sync({
            remote: couchName,
            waitForLeadership: false,
            direction: {
                pull: true,
                push: true
            }
        });
        replicationState.docs$.subscribe(docData => console.log('Doc data', docData));

        // add 3 docs
        await Promise.all(
            new Array(3)
            .fill(0)
            .map(() => col.insert(schemaObjects.human()))
        );
        const docs1 = await col.find().exec();

        assert.strictEqual(docs1.length, 3);

     //   assert.strictEqual(docs1.length, 2);

        // create a new collection
        const col2 = await humansCollection.create(0);
        await col2.sync({
            remote: couchName,
            waitForLeadership: false,
            direction: {
                pull: true,
                push: true
            }
        });

        await AsyncTestUtil.waitUntil(async () => {
            const docs = await col2.find().exec();
            return docs.length === 3;
        });

        col.database.destroy();
        col2.database.destroy();
    });

    // it('sa;sls', () => {
    //     assert.strictEqual(2, 5);
    // });
});


