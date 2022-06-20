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
import config from './config';

import {
    createRxDatabase,
    randomCouchString
} from '../../';

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

        if (!config.storage.hasMultiInstance) {
            return;
        }

        // create a schema
        const mySchema = {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    maxLength: 100,
                    primary: true,
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
            /**
             * By calling config.storage.getStorage(),
             * we can ensure that all variations of RxStorage are tested in the CI.
             */
            storage: config.storage.getStorage(),
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
        await collections.mycollection.bulkUpsert([
            { id: 'id0001', firstName: 'Arnold', lastName: 'Snarold'},
            { id: 'id0002', firstName: 'Brian', lastName: 'Koolun'},
            { id: 'id0003', firstName: 'Ramish', lastName: 'Signna'},
            { id: 'id0004', firstName: 'Ian', lastName: 'Putternal'},
            { id: 'id0005', firstName: 'Milian', lastName: 'Sanchez'},
            { id: 'id0006', firstName: 'Kascey', lastName: 'Piannal'},
          ]);

        /**
         * to simulate the event-propagation over multiple browser-tabs,
         * we create the same database again
         */
        const dbInOtherTab = await createRxDatabase({
            name,
            storage: config.storage.getStorage(),
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
        const set1 = await collectionInOtherTab.mycollection.find({
            selector: {
              '$or': [
                { firstName: {'$eq': 'Ian' } },
                { lastName: {'$eq': 'Piannal' } }
              ]
            }
          }).exec();

        /*
         * assert things,
         * here your tests should fail to show that there is a bug
         * our first test should return 2 matches
        */
        assert.strictEqual(set1.length, 2);

        const set2 = await collectionInOtherTab.mycollection.find({
            selector: {
              firstName: { '$regex': /.*ian.*/gi}
            }
          }).exec();

        //  this second set should return 4 items ('Biran', 'Ian' & 'Milian')
        assert.strictEqual(set2.length, 3);


        const set3 = await collectionInOtherTab.mycollection.find({
            selector: {
              '$or': [
                { firstName: {'$regex': /.*ian.*/gi } },
                { surName: {'$regex': /.*ian.*/gi } }
              ]
            }
          }).exec();

        //  this second set should return 4 items ('Biran', 'Ian', 'Milian' and b/c of surname 'Kascey Piannal' )
        assert.strictEqual(set3.length, 4);


        // clean up afterwards
        sub.unsubscribe();
        db.destroy();
        dbInOtherTab.destroy();
    });
});
