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
// import config from './config';
import {createRxDatabase, randomCouchString} from '../../plugins/core';

import {getRxStorageLoki} from '../../plugins/lokijs';
import {RxReplicationStateBase,} from '../../plugins/replication';


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


const runTest = async (name: string, storage = getRxStorageLoki(), write = true) => {
    // create a database
    const db = await createRxDatabase({
        name,
        storage,
        //  Event reduce make the collections.find() observers working when writing but actually after refresh I don't have the data
        //  Note: In the second case, loading data from IndexedDB it does not help
        //  In anycase I think that should work without this feature enabled right
        // eventReduce: true,
        ignoreDuplicate: true
    });


    //  Test metrics
    const numDocs = 10;

    // create a collection
    const collections = await db.addCollections({
        mycollection: {
            schema: mySchema
        }
    });

    //  Record subscription
    const updates: any[] = []
    const errors: any[] = []

    const sub = collections.mycollection.find().$.subscribe({
        next: (data: any) => {
            updates.push(data)
        },
        error: (err: any) => {
            errors.push(err)
        }
    });

    if (write) {
        //  Simple helper to create data
        const createObject = (id: string) => ({
            passportId: id,
            firstName: id,
            lastName: id,
            age: 56,
        })

        //  Simulate a primitive first replication of a account data (paginated)
        const replication = new RxReplicationStateBase('__id__', collections.mycollection)
        const docs = Array.apply(null, Array(numDocs)).map<any>((_, index) => createObject(
            `doc-${index}`
        ))
        await replication.handleDocumentsFromRemote(docs)
    }

    // if (write) {
    //     await AsyncTestUtil.waitUntil(() => updates.length > 1 || errors.length > 1);
    // } else { // The second test unit has a bug so the subscription is not triggered twice [0, numDocs]
    await new Promise(resolve => setTimeout(resolve, 300))
    // }

    //  Verify that the subscription has been correctly triggered
    const expectedSizes = [0, numDocs]
    const resultedSizes = updates.map(update => update.length)
    assert.deepStrictEqual(resultedSizes, expectedSizes);

    //  Confirm that collection.find() get it too
    const resultedNumDocs = (await collections.mycollection.find().exec()).length
    assert.deepStrictEqual(resultedNumDocs, numDocs);

    // clean up afterwards
    sub.unsubscribe();
    db.destroy();
}


describe('bug-lokijs.test.ts', () => {
    it('collection.find() do not get data', async () => {
        // generate a random database-name
        const name = randomCouchString(10);

        await runTest(name)
    });
    it('collection.find() do not have data after load from IndexedDB', async () => {
        // generate a random database-name
        const name = randomCouchString(10);

        const LokiIncrementalIndexedDBAdapter = require('lokijs/src/incremental-indexeddb-adapter')
        const storage = getRxStorageLoki({
            adapter: new LokiIncrementalIndexedDBAdapter()
        })

        //  Run writing test
        await runTest(name, storage, true)

        //  Run read only
        await runTest(name, storage, false)

        //  Cleanup IDB
        const db = await createRxDatabase({
            name,
            storage
        })
        await db.remove()
    });
});
