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
// import config from './config';

import {
    createRxDatabase,
    randomCouchString
} from '../../plugins/core';

import {
    getRxStoragePouch,
} from '../../plugins/pouchdb';
import {
    RxReplicationStateBase,
} from '../../plugins/replication';


describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async () => {

        /**
         * If your test should only run in nodejs or only run in the browser,
         * you should comment in the return operator and addapt the if statement.
         */
        // if (
        //     config.platform.isNode() // runs only in node
        //     // config.platform.isNode() // runs only in the browser
        // ) {
        //     return;
        // }

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


        //  Simple helper to create data
        const createObject = (id: string) => ({
            passportId: id,
            firstName: id,
            lastName: id,
            age: 56
        })



        //  Record subscription
        const updates: any[] = []
        const errors: any[] = []

        const sub = collections.mycollection.findByIds$([
            'a', 'b', 'c', 'd'
        ]).subscribe({
            next: data => {
                // eslint-disable-next-line
                console.info('Got update', data)
                updates.push(data)
            },
            error: err => {
                // eslint-disable-next-line
                console.error('Got error', err)
                errors.push(err)
            }
        })

        //  The subscription should return a map
        await AsyncTestUtil.waitUntil(() => updates.length > 0 || errors.length > 0);


        //  test we have a map and no error
        assert.strictEqual(updates.length, 1);
        assert.strictEqual(errors.length, 0);

        //  I found out in my app it returns a map of keys => undefined but in this test the map is empty
        // assert.strictEqual(updates[0].size, 4);

        //  Our object should be not known
        assert.strictEqual(updates[0].get('a'), undefined);
        assert.strictEqual(updates[0].get('b'), undefined);
        assert.strictEqual(updates[0].get('c'), undefined);
        assert.strictEqual(updates[0].get('d'), undefined);



        //  Simulate a primitive replication
        const replication = new RxReplicationStateBase('__id__', collections.mycollection)
        await replication.handleDocumentsFromRemote([
            createObject('a'),
            createObject('b'),
            createObject('c'),
            createObject('d'),
        ])


        //  Now we should have 2 updates or 1 error
        await AsyncTestUtil.waitUntil(() => updates.length > 1 || errors.length > 0);


        //  Verify we do have strictly two updates and no error
        assert.strictEqual(updates.length, 2);
        assert.strictEqual(errors.length, 0);

        //  The map should be of size 4
        assert.strictEqual(updates[1].size, 4);

        //  And contains the right data
        assert.strictEqual(updates[1].get('a')?.passportId, 'a');
        assert.strictEqual(updates[1].get('b')?.passportId, 'b');
        assert.strictEqual(updates[1].get('c')?.passportId, 'c');
        assert.strictEqual(updates[1].get('d')?.passportId, 'd');


        //  Let's try to update something different that should be ignored
        await replication.handleDocumentsFromRemote([
            createObject('e'),
            createObject('f'),
            createObject('g'),
            createObject('h'),
        ])

        //  Wait a bit to see if we catch anything
        await new Promise(resolve => setTimeout(resolve, 500))


        //  Verify that the subscription has not been triggered and no error has been added
        assert.strictEqual(updates.length, 2);
        assert.strictEqual(errors.length, 0);


        // clean up afterwards
        sub.unsubscribe();
        db.destroy();
    });
});
