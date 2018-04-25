/**
 * this is a template for a test.
 * If you found a bug, edit this test to reproduce it
 * and than make a pull-request with that failing test.
 * The maintainer will later move your test to the correct possition in the test-suite.
 *
 * To run this test do:
 * - 'npm run test:node' so it runs in nodejs
 * - 'npm run test:browsers' so it runs in the browser
 */
import assert from 'assert';
import AsyncTestUtil from 'async-test-util';

import RxDB from '../../dist/lib/index';
import * as util from '../../dist/lib/util';

describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async () => {
        // create a schema
        const mySchema = {
            version: 0,
            type: 'object',
            properties: {
                passportId: {
                    type: 'string',
                    primary: true
                },
                firstName: {
                    type: 'string'
                },
                lastName: {
                    type: 'string',
                    index: true
                },
                age: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 150
                }
            }
        };

        // generate a random database-name
        const name = util.randomCouchString(10);

        // create a database
        const db = await RxDB.create({
            name,
            adapter: 'memory',
            ignoreDuplicate: true
        });
        // create a collection
        const collection = await db.collection({
            name: 'crawlstate',
            schema: mySchema
        });

        // insert a document
        await collection.insert({
            passportId: 'foobar',
            firstName: 'Bob',
            //lastName: 'Kelso',
            age: 56
        });

        /**
         * to simulate the event-propagation over multiple browser-tabs,
         * we create the same database again
         */
        const dbInOtherTab = await RxDB.create({
            name,
            adapter: 'memory',
            ignoreDuplicate: true
        });
        // create a collection
        const collectionInOtherTab = await dbInOtherTab.collection({
            name: 'crawlstate',
            schema: mySchema
        });

        // find the document in the other tab
        const myDocument = await collectionInOtherTab
            .findOne()
            .where('firstName')
            .eq('Bob')
            .exec();

        /*
         * assert things,
         * here your tests should fail to show that there is a bug
         */
        assert.equal(myDocument.age, 56);

        // you can also wait for events
        const emitted = [];
        const sub = collectionInOtherTab
            .findOne().$
            .subscribe(doc => emitted.push(doc));
        await AsyncTestUtil.waitUntil(() => emitted.length === 1);


        // clean up afterwards
        sub.unsubscribe();
        db.destroy();
        dbInOtherTab.destroy();
    });
});
