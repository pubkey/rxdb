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
import config, { setDefaultStorage } from './config';

import { createRxDatabase, randomCouchString } from '../../';

describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async () => {
        /**
         * If your test should only run in nodejs or only run in the browser,
         * you should comment in the return operator and addapt the if statement.
         */
        if (
            // !config.platform.isNode() // runs only in node
            config.platform.isNode() // runs only in the browser
        ) {
            return;
        }

        if (!config.storage.hasMultiInstance) {
            return;
        }

        // create a schema
        const mySchema = {
            title: 'hero schema',
            description: 'describes a simple hero',
            version: 0,
            primaryKey: 'name',
            type: 'object',
            properties: {
                name: {
                    maxLength: 20,
                    type: 'string',
                },
                color: {
                    type: 'string',
                },
            },
            required: ['name', 'color'],
        };

        // generate a random database-name
        const name = randomCouchString(10);

        setDefaultStorage('lokijs');

        // create a database
        const db = await createRxDatabase({
            name,
            /**
             * By calling config.storage.getStorage(),
             * we can ensure that all variations of RxStorage are tested in the CI.
             */
            storage: config.storage.getStorage(),
            eventReduce: true,
            ignoreDuplicate: true,
        });
        // create a collection
        const collections = await db.addCollections({
            mycollection: {
                schema: mySchema,
            },
        });

        const mycollection = collections.mycollection;

        // define documents
        const doc0 = {
            name: 'Batman',
            color: 'red',
        };
        const doc1 = {
            name: 'Antman',
            color: 'blue',
        };
        const doc2 = {
            name: 'Deadpool',
            color: 'green',
        };
        const doc3 = {
            name: 'Captain America',
            color: 'yellow',
        };

        // insert a document
        await mycollection.insert(doc0);
        await mycollection.insert(doc1);
        await mycollection.insert(doc2);
        await mycollection.insert(doc3);

        /*
         * assert things,
         * here your tests should fail to show that there is a bug
         */
        const docs = await mycollection.find().exec();

        assert.strictEqual(docs[0].name, doc0.name);
        assert.strictEqual(docs[1].name, doc1.name);
        assert.strictEqual(docs[2].name, doc2.name);
        assert.strictEqual(docs[3].name, doc3.name);

        // clean up afterwards
        db.destroy();
    });
});
