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
import config from './config.ts';
import { indexedDB as fakeIndexedDB, IDBKeyRange } from 'fake-indexeddb';

import { createRxDatabase, randomToken } from '../../plugins/core/index.mjs';
import { isNode } from '../../plugins/test-utils/index.mjs';
import { getRxStorageDexie } from '../../plugins/storage-dexie/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';

describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async function () {
        /**
         * If your test should only run in nodejs or only run in the browser,
         * you should comment in the return operator and adapt the if statement.
         */
        if (
            !isNode // runs only in node
            // isNode // runs only in the browser
        ) {
            return;
        }

        if (!config.storage.hasMultiInstance) {
            return;
        }

        // create a schema
        const mySchema = {
            version: 0,
            primaryKey: 'passportId',
            type: 'object',
            properties: {
                passportId: {
                    type: 'string',
                    maxLength: 100,
                },
                firstName: {
                    type: 'string',
                },
                lastName: {
                    type: 'string',
                },
                age: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 150,
                },
            },
        };

        /**
         * Always generate a random database-name
         * to ensure that different test runs do not affect each other.
         */
        const name = randomToken(10);

        // create a database
        const db = await createRxDatabase({
            name,
            /**
             * By calling config.storage.getStorage(),
             * we can ensure that all variations of RxStorage are tested in the CI.
             */
            // !!! NEEDS TO BE DEXIE STORAGE (does not have issue with memory storage. I have not tested other storages.)
            // fakeIndexedDB in node will replicate it as well
            storage: wrappedValidateAjvStorage({
                storage: getRxStorageDexie({
                    indexedDB: fakeIndexedDB,
                    IDBKeyRange: IDBKeyRange,
                }),
            }),
            eventReduce: true,
            ignoreDuplicate: true,
        });

        // create a collection
        const collections = await db.addCollections({
            mycollection: {
                schema: mySchema,
            },
        });

        // insert a document
        const doc = await collections.mycollection.insert({
            passportId: 'foobar',
            firstName: 'Bob',
            lastName: 'Kelso',
            age: 56,
        });
        console.log('doc inserted ' + JSON.stringify(doc.toJSON()));

        // define the query
        const query = collections.mycollection.findOne().sort({ age: 'asc' });

        // !!!! SUBSCRIPTION IS IMPORTANT TO REPRODUCE THE BUG
        // I don't think it actually has to be the same query that we execute later.
        // things that seem relevant:
        // - the query is a findOne query
        // - the query does NOT have a selector on `passportId` (or whatever)
        const subscription = query.$.subscribe((result) => {
            console.log('result ' + JSON.stringify(result?.toJSON()));
        });

        // now remove the doc
        console.log('removing doc');
        await doc.remove();
        console.log('doc removed');

        // now execute the query
        console.log('executing query');
        const foundDoc = await query.exec();
        console.log('query executed ' + JSON.stringify(foundDoc?.toJSON()));

        // BUG: The query should return null after the doc is removed, but it doesn't
        // This assertion should fail, proving the bug exists
        if (foundDoc !== null) {
            throw new Error(
                'BUG REPRODUCED: Query returned a document when it should return null after removal. Document: ' +
                    JSON.stringify(foundDoc?.toJSON())
            );
        }

        // I couldn't actually get the assertion to fail? I think I'm writing the test wrong...
        assert.strictEqual(foundDoc, null);

        // cleanup
        subscription.unsubscribe();
        db.close();
    });
});
