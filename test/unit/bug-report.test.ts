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
import { ref } from 'vue';

import {
    createRxDatabase,
    randomCouchString
} from '../../plugins/core';

import {
    getRxStoragePouch,
} from '../../plugins/pouchdb';


describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async () => {


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

        /**
         * to simulate the event-propagation over multiple browser-tabs,
         * we create the same database again
         */
        const dbInOtherTab = await createRxDatabase({
            name,
            storage: getRxStoragePouch('memory'),
            eventReduce: true,
            ignoreDuplicate: true
        });
        // create a collection
        const collectionInOtherTab = await dbInOtherTab.addCollections({
            mycollection: {
                schema: mySchema
            }
        });

        // find the document in the other tab
        const myDocument = await collectionInOtherTab.mycollection
            .findOne()
            .where('firstName')
            .eq('Bob')
            .exec();

        /*
         * assert things,
         * here your tests should fail to show that there is a bug
         */
        assert.strictEqual(myDocument.age, 56);

        // you can also wait for events
        const emitted = [];
        const sub = collectionInOtherTab.mycollection
            .findOne().$
            .subscribe(doc => emitted.push(doc));
        await AsyncTestUtil.waitUntil(() => emitted.length === 1);

        const docRef = ref(myDocument);

        docRef.value.atomicPatch({ firstName: 'notBob' });
        /*
	myDocument.collection
	.find()
	.where('firstName')
	.eq('Bob')
	.update({
            $set: {
                firstName: 'notBob'
	    }
	});
       */



        // clean up afterwards
        sub.unsubscribe();
        db.destroy();
        dbInOtherTab.destroy();
    });
});
