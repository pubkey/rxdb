/**
 * this is a template for a test.
 * If you found a bug, edit this test to reproduce it
 * and than make a pull-request with that failing test.
 * The maintainer will later move your test to the correct possition in the test-suite.
 *
 * To run this test do:
 * - 'npm run test:node' so it runs in nodejs
 * - 'npm run test:browser' so it runs in the browser
 */
import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import config from './config';

import { createRxDatabase, randomCouchString } from '../../plugins/core';

import { getRxStoragePouch } from '../../plugins/pouchdb';

describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async () => {
        // create a schema
        const mySchema = {
            version: 0,
            primaryKey: {
                key: 'id',
                fields: ['b_firstName', 'a_lastName'],
                separator: '|',
            },
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                },
                passportId: {
                    type: 'string',
                },
                b_firstName: {
                    type: 'string',
                },
                a_lastName: {
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

        // create a database
        const db = await createRxDatabase({
            name,
            storage: getRxStoragePouch('memory'),
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
            b_firstName: 'Bob',
            a_lastName: 'Kelso',
            age: 56,
        });

        /**
         * to simulate the event-propagation over multiple browser-tabs,
         * we create the same database again
         */

        const mySchema1 = {
            version: 1,
            primaryKey: {
                key: 'id',
                fields: ['b_firstName', 'a_lastName'],
                separator: '|',
            },
            type: 'object',
            properties: {
                hey: {
                    type: 'string',
                },
                id: {
                    type: 'string',
                },
                passportId: {
                    type: 'string',
                },
                b_firstName: {
                    type: 'string',
                },
                a_lastName: {
                    type: 'string',
                },
                age: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 150,
                },
            },
        };

        const dbInOtherTab = await createRxDatabase({
            name,
            storage: getRxStoragePouch('memory'),
            eventReduce: true,
            ignoreDuplicate: true,
        });
        // create a collection
        const collectionInOtherTab = await dbInOtherTab.addCollections({
            mycollection: {
                schema: mySchema1,
                migrationStrategies: {
                    1: (oldDoc) => {
                        oldDoc.hey = 'hey';
                        return oldDoc;
                    },
                },
            },
        });

        // find the document in the other tab
        const myDocument = await collectionInOtherTab.mycollection
            .findOne()
            .where('b_firstName')
            .eq('Bob')
            .exec();

        /*
         * assert things,
         * here your tests should fail to show that there is a bug
         */
        assert.strictEqual(myDocument.hey, 'hey');

        // you can also wait for events
        const emitted = [];
        const sub = collectionInOtherTab.mycollection
            .findOne()
            .$.subscribe((doc) => emitted.push(doc));
        await AsyncTestUtil.waitUntil(() => emitted.length === 1);

        // clean up afterwards
        sub.unsubscribe();
        db.destroy();
        dbInOtherTab.destroy();
    });
});
