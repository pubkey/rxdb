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
import config from './config';

import {
    createRxDatabase,
    randomCouchString
} from '../../';

describe('bug-report.test.js', () => {
    it('BUG: insert -> remove -> insert -> remove will fail with pouchdb', async () => {

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
            title: 'example schema',
            version: 0,
            description: 'describes an example collection schema',
            primaryKey: 'name',
            type: 'object',
            properties: {
              name: {
                $comment: 'primary key MUST have a maximum length!',
                type: 'string',
                maxLength: 100,
              },
              gender: {
                type: 'string',
              },
              birthyear: {
                type: 'integer',
                final: true,
                minimum: 1900,
                maximum: 2099,
              },
            },
            required: ['name', 'gender'],
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
        await collections.mycollection.insert({
            name: 'test1',
            gender: 'male',
            birthyear: 2000
        });

        // remove a document
        await collections.mycollection.findOne({
            selector: {
                name: 'test1'
            }
        }).remove();

        // insert document again
        await collections.mycollection.insert({
            name: 'test1',
            gender: 'male',
            birthyear: 2000
        });

        // remove document again
        await collections.mycollection.findOne({
            selector: {
                name: 'test1'
            }
        }).remove();

        // clean up afterwards
        db.destroy();
    });
});
