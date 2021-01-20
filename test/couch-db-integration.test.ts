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
    const COUCHDB_URL = 'http://admin:admin@127.0.0.1:5984/testreplicat';
    let remotePassportId = '';

    const fetchOptions: RequestInit = {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        headers: {
            'Content-Type': 'application/json',
        },
        body:  JSON.stringify({req: 'request'})
    };

    it('create couchdb database', async () => {
        // delete remote db if exist
     fetchOptions.method = 'DELETE';
     await fetch(COUCHDB_URL, fetchOptions);

        // create remote db
     fetchOptions.method = 'PUT';
     const resp =  await fetch(COUCHDB_URL, fetchOptions);
     const respJson = await resp.json();
     assert.strictEqual(respJson.ok, true);
    });

    it('sync all to couchdb', async () => {
        const col = await humansCollection.create(0);
        const replicationState = await col.sync({
            remote: COUCHDB_URL,
            waitForLeadership: false,
            direction: {
                pull: true,
                push: true
            }
        });
        replicationState.docs$.subscribe(docData => '');

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
            remote: COUCHDB_URL,
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
        // console.log('test 2 finished');
    });

    it('sync all from couch db', async () => {
        const col = await humansCollection.create(0, 'human', true, false);
        const replicationState = await col.sync({
            remote: COUCHDB_URL,
            waitForLeadership: false,
            direction: {
                pull: true,
                push: true
            }
        });
        replicationState.docs$.subscribe(docData => '');
        const docs = new Array(3)
            .fill(0)
            .map(() => schemaObjects.human());
       // console.log('New doc -', docs);
        remotePassportId = docs[1].passportId;
        const body = {
            docs: docs
        };
        fetchOptions.method = 'POST';
        fetchOptions.body = JSON.stringify(body);
        await fetch(COUCHDB_URL + '/_bulk_docs', fetchOptions);
        // const respJson = await resp.json();
        await new Promise(resolve => setTimeout(resolve, 600));
        const docs1 = await col.find().exec();
       // console.log('Bulk res -', docs1.length);

        assert.strictEqual(docs1.length, 6);
        col.database.destroy();
    });

    it('sync one from couch db', async () => {
        const col = await humansCollection.create(0, 'human', true, false);
        const replicationState = await col.sync({
            remote: COUCHDB_URL,
            waitForLeadership: false,
            direction: {
                pull: true,
                push: true
            },
            query: col.find({ selector: {
                    'passportId': { '$eq': remotePassportId }
                }})
        });
        replicationState.docs$.subscribe(docData => '');
        await new Promise(resolve => setTimeout(resolve, 600));
        const docs1 = await col.find().exec();
        // console.log('Sync one res -', docs1.length);

        assert.strictEqual(docs1.length, 1);
    });

    it('delete couchdb database', async () => {
        // delete remote db if exist
        fetchOptions.method = 'DELETE';
        const resp = await fetch(COUCHDB_URL, fetchOptions);
        const respJson = await resp.json();

        // create remote db
        // fetchOptions.method = 'PUT';
        // const resp =  await fetch(COUCHDB_URL, fetchOptions);
        // const respJson = await resp.json();
        assert.strictEqual(respJson.ok, true);
    });
});


