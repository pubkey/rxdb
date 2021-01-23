/**
 * this test checks the integration with couchdb
 * run 'npm run test:couchdb' to use it
 * You need a running couchdb-instance on port 5984
 * Run 'npm run couch:start' to spawn a docker-container
 */
import assert from 'assert';
import AsyncTestUtil from 'async-test-util';

import {
    addRxPlugin,
    randomCouchString
} from '../';
addRxPlugin(require('pouchdb-adapter-memory'));
addRxPlugin(require('pouchdb-adapter-http'));

import * as humansCollection from './helper/humans-collection';
import * as schemaObjects from './helper/schema-objects';

describe('couchdb-db-integration.test.js', () => {
    const COUCHDB_URL = 'http://127.0.0.1:5984/';

    it('sync to couchdb', async () => {
        const col = await humansCollection.create(0);

        const couchName = COUCHDB_URL + randomCouchString(12);
        console.log(couchName);
        const replicationState = await col.sync({
            remote: couchName,
            waitForLeadership: false,
            direction: {
                pull: true,
                push: true
            }
        });
        replicationState.docs$.subscribe(docData => console.dir(docData));

        // add 3 docs
        await Promise.all(
            new Array(3)
            .fill(0)
            .map(() => col.insert(schemaObjects.human()))
        );
        const docs1 = await col.find().exec();
        assert.strictEqual(docs1.length, 3);


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
});
