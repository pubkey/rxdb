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

import {
    createRxDatabase, randomCouchString, addRxPlugin
} from '../../';

describe('bug-report.test.js', () => {
    it('should fail because it reproduces a bug with deleted documents showing up in find().sort()', async () => {
        // create a schema
        const mySchema = {
            version: 0,
            type: 'object',
            properties: {
                num: {
                    type: 'integer'
                }
            },
            indexes: [
                'num'
            ]
        };


        // generate a random database-name
        const name = randomCouchString(10);

        // use indexeddb adapter to create a database
        addRxPlugin(require('pouchdb-adapter-indexeddb'));
        const db = await createRxDatabase({
            name,
            adapter: 'indexeddb',
        });
        // create a collection
        const collection = await db.collection({
            name: 'mycollection',
            schema: mySchema
        });

        // insert a single document
        await collection.insert({ num: 1234 });

        // find all the documents - there should be only one returned
        let docs = await collection.find().exec();
        assert.strictEqual(docs.length, 1);

        // delete the document - there should be none left now
        let doc = docs.pop();
        await doc.remove();
        docs = await collection.find().exec();
        assert.strictEqual(docs.length, 0);

        /* 
         * with the sole document being deleted, it should also not 
         * show up if a sort() is applied to the find():
         */
        docs = await collection.find().sort('-num').exec();
        assert.strictEqual(docs.length, 0);


        // clean up afterwards
        db.destroy();
    });
});
