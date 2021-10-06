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

import {
    createRxDatabase,
    randomCouchString
} from '../../plugins/core';

import {
    getRxStoragePouch,
} from '../../plugins/pouchdb';


describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async () => {

        /**
         * If your test should only run in nodejs or only run in the browser,
         * you should comment in the return operator and addapt the if statement.
         */
        if (
            !config.platform.isNode() // runs only in node
            // config.platform.isNode() // runs only in the browser
        ) {
            // return;
        }

        // create a schema
        const mySchema = {
            version: 0,
            primaryKey: 'passportId',
            type: 'object',
            properties: {
                passportId: {
                    type: 'string'
                },
                firstName: {
                    type: 'string'
                },
                lastName: {
                    type: 'string'
                },
                age: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 150
                }
            }
        };

        // generate a random database-name
        const name = randomCouchString(10);

        // create a database
        const db = await createRxDatabase({
            name,
            storage: getRxStoragePouch('memory'),
            eventReduce: true,
            ignoreDuplicate: true
        });
        // create a collection
        const collections = await db.addCollections({
            mycollection: {
                schema: mySchema
            }
        });

        // insert a document
        await collections.mycollection.insert({
            passportId: 'foobar',
            firstName: 'Bob',
            lastName: 'Kelso',
            age: 56
        });

        const person = await db.mycollection.findOne().exec()

        person.$.subscribe((data) => {
            delete data['_rev'];
            delete data['_attachments'];
        })

        const changeAgeTo50 = (state) => {
            state.age = 50
        }

        person.atomicUpdate((state) => {
            changeAgeTo50(state)
            return state
        })

        assert.strictEqual(person.age, 50);

        // clean up afterwards
        db.destroy();
    });
});
