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

import { randomCouchString } from '../../';
import Loki from 'lokijs';

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

        // generate a random database-name
        const name = randomCouchString(10);

        // create a database
        const db = new Loki(name);

        // create a collection
        const mycollection = db.addCollection('mycollection', {
            indices: ['name']
          });

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
        mycollection.insert(doc0);
        mycollection.insert(doc1);
        mycollection.insert(doc2);
        mycollection.insert(doc3);

        /*
         * assert things,
         * here your tests should fail to show that there is a bug
         */
        const docs = mycollection.find();

        assert.strictEqual(docs[0].name, doc0.name);
        assert.strictEqual(docs[1].name, doc1.name);
        assert.strictEqual(docs[2].name, doc2.name);
        assert.strictEqual(docs[3].name, doc3.name);
    });
});
