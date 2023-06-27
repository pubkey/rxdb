/**
 * this is a template for a test.
 * If you found a bug, edit this test to reproduce it
 * and than make a pull-request with that failing test.
 * The maintainer will later move your test to the correct position in the test-suite.
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
} from '../../';

describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async () => {
        // create a schema
        const mySchema = {
            version: 0,
            primaryKey: 'passportId',
            type: 'object',
            properties: {
                passportId: {
                    type: 'string',
                    maxLength: 100
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

        /**
         * Always generate a random database-name
         * to ensure that different test runs do not affect each other.
         */
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

        const docs = [{
            passportId: 'foobar',
            firstName: 'Bob',
            lastName: 'Kelso',
            age: 56
        }, {
            passportId: 'foobar2',
            firstName: 'Bob2',
            lastName: 'Kelso2',
            age: 562
        }];
        await collections.mycollection.bulkInsert(docs);

        const emitted = [];
        const sub = collections.mycollection
            .findOne('foobar').$
            .subscribe(doc => emitted.push(doc));

        await AsyncTestUtil.waitUntil(() => emitted.length === 1);
        assert.deepEqual(emitted[0]?.toJSON(), docs[0]);

        await collections.mycollection.bulkRemove(docs.map((doc) => doc.passportId));
        await AsyncTestUtil.waitUntil(() => emitted.length === 2);
        assert.strictEqual(emitted[1], null, 'Should be gone now');

        // clean up afterwards
        sub.unsubscribe();
        db.destroy();
    });
});
