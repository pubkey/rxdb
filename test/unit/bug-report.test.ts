/**
 * this is a template for a test.
 * If you found a bug, edit this test to reproduce it
 * and than make a pull-request with that failing test.
 * The maintainer will later move your test to the correct position in the test-suite.
 *
 * To run this test do:
 * - 'npm run test:node' so it runs in nodejs
 * - 'npm run test:browser' so it runs in the browser
 */
import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import fetch from 'node-fetch';
import { replicateCouchDB } from '../../plugins/replication-couchdb';
import { RxDBUpdatePlugin } from '../../plugins/update';
import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder';
// import { fetch } from 'whatwg-fetch';
import config from './config';

import {
    addRxPlugin,
    createRxDatabase,
    isRxDocument,
    randomCouchString,
} from '../../';

const fetchPolyfill = (username, password) => (url, options) => {
    // flat clone the given options to not mutate the input
    const optionsWithAuth = Object.assign({}, options);
    // ensure the headers property exists
    if (!optionsWithAuth.headers) {
        optionsWithAuth.headers = {};
    }

    // add bearer token to headers
    optionsWithAuth.headers['Authorization'] = `Basic ${Buffer.from(
        username + ':' + password
    ).toString('base64')}`;

    // call the original fetch function with our custom options.
    return fetch(url, optionsWithAuth);
};

describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async () => {
        /**
         * If your test should only run in nodejs or only run in the browser,
         * you should comment in the return operator and adapt the if statement.
         */
        // if (
        //     !config.platform.isNode() // runs only in node
        //     // config.platform.isNode() // runs only in the browser
        // ) {
        //     // return;
        // }

        if (!config.storage.hasMultiInstance) {
            return;
        }

        // create a schema
        const mySchema = {
            version: 0,
            primaryKey: 'passportId',
            type: 'object',
            properties: {
                passportId: {
                    type: 'string',
                    maxLength: 100,
                },
                firstName: {
                    type: 'string',
                },
                lastName: {
                    type: 'string',
                },
                age: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 150,
                },
            },
        };

        // generate a random database-name
        const name = randomCouchString(10);

        // Add plugins
        addRxPlugin(RxDBQueryBuilderPlugin);
        addRxPlugin(RxDBUpdatePlugin);

        // create a database
        const db = await createRxDatabase({
            name,
            /**
             * By calling config.storage.getStorage(),
             * we can ensure that all variations of RxStorage are tested in the CI.
             */
            storage: config.storage.getStorage(),
            eventReduce: true,
            ignoreDuplicate: true,
        });
        // create a collection
        const collections = await db.addCollections({
            mycollection: {
                schema: mySchema,
            },
        });

        // insert a document
        await collections.mycollection.insert({
            passportId: 'foobar',
            firstName: 'Bob',
            lastName: 'Kelso',
            age: 56,
        });

        // you can also wait for events
        let item;
        db.mycollection.findOne().$.subscribe((doc) => (item = doc));
        await AsyncTestUtil.waitUntil(() => item);
        assert.strictEqual(isRxDocument(item), true);

        /*
         * assert things,
         * here your tests should fail to show that there is a bug
         */

        // Couchdb url and credentials here
        // I have a local instance running at localhost
        // Edit as needed
        const syncURL = '127.0.0.1:5984';
        const username = 'root';
        const password = 'root';
        const replicationState = replicateCouchDB({
            // replicationIdentifier: 'replicate-' + name,
            url: `http://root:root@${syncURL}` + '/mycollection' + '/',
            collection: db.collections.mycollection,
            fetch: fetchPolyfill(username, password),
            live: true,
            pull: {
                batchSize: 60,
                heartbeat: 60000,
            },
            push: {
                batchSize: 60,
            },
        });

        replicationState.error$.subscribe((err) => {
            console.log('error');
            throw Error(err.message);
        });

        await replicationState.awaitInitialReplication();

        // Edit the item multiple times
        // In this test the replication usually fails on the first edit
        // But in production it is pretty random, I've added 3 edits just in case
        await item.update({
            $set: {
                firstName: randomCouchString(10),
            },
        });

        await item.update({
            $set: {
                firstName: randomCouchString(10),
            },
        });

        await item.update({
            $set: {
                firstName: randomCouchString(10),
            },
        });

        // Repeatedly edit the document

        // clean up afterwards
        db.destroy();
    });
});
