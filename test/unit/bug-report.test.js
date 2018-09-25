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
// import AsyncTestUtil from 'async-test-util';

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
                    type: ['string', 'null']
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
            queryChangeDetection: true,
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
            age: 56
        });
        await collection.insert({
            passportId: 'foobaz',
            firstName: 'Bob',
            lastName: null,
            age: 56
        });

        // you can also wait for events

        const queryOK = collection.find({});
        const docsOK = await queryOK.exec();
        assert.equal(docsOK.length, 2);

        const query = collection.find({ lastName: null });
        const docs = await query.exec();
        assert.equal(docs.length, 2);

        /*
        sconst emitted = [];
        const sub = query.$.subscribe(docs => emitted.push(docs.length));
        await collection.insert({
            passportId: 'baz',
            firstName: 'John',
            age: 22
        });

        await AsyncTestUtil.waitUntil(() => emitted.length === 2);

        assert.equal(emitted[1], 3);
        
        // clean up afterwards
        sub.unsubscribe();
        */

        db.destroy();
    });
});
