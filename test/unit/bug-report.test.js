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

import RxDB from '../../dist/lib/index';

describe('bug-report.test.js', () => {
    it('query cache should be invalidated after changes caused by replication', async () => {
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
                    type: 'string'
                },
                age: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 150
                }
            }
        };

        // create a database
        const db1 = await RxDB.create({
            name: 'db1',
            adapter: 'memory'
        });
        // create a collection
        const collection1 = await db1.collection({
            name: 'crawlstate',
            schema: mySchema
        });

        // insert a document
        await collection1.insert({
            passportId: 'foobar',
            firstName: 'Bob',
            lastName: 'Kelso',
            age: 56
        });

        // createa another database
        const db2 = await RxDB.create({
            name: 'db2',
            adapter: 'memory'
        });
        // create a collection
        const collection2 = await db2.collection({
            name: 'crawlstate',
            schema: mySchema
        });

        // query for all documents on db2-collection2 (query will be cached)
        let documents = await collection2.find({}).exec();

        // Replicate from db1-collection1 to db2-collection2
        const pullstate = collection2.sync({
            remote: collection1.pouch,
            direction: {pull: true, push: false},
            options: {live: false}
        });
        
        // Wait for replication to complete
        await new Promise((resolve, reject) => {
            pullstate.complete$.subscribe(completed => {
                if(completed){
                    if(completed.ok === true)
                        resolve();
                    else
                        reject(completed.errors);
                }
            });
            pullstate.error$.subscribe(error => {reject(error);});
        });

        // query for all documents on db2-collection2 again (result is read from cache which doesnt contain replicated doc)
        //collection2._queryCache.destroy();
        documents = await collection2.find({}).exec();

        assert.equal(documents.length, 1);

        // clean up afterwards
        db1.destroy();
        db2.destroy();
    });
});
