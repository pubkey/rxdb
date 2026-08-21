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

import {
    createRxDatabase,
    randomToken,
    addRxPlugin
} from '../../plugins/core/index.mjs';
import {
    RxDBCleanupPlugin
} from '../../plugins/cleanup/index.mjs';
addRxPlugin(RxDBCleanupPlugin);

describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async function () {
        // insert -> remove -> cleanup -> insert the same primary key again:
        // the second insert succeeds but queries do not see the document.

        const mySchema = {
            version: 0,
            primaryKey: 'passportId',
            type: 'object',
            properties: {
                passportId: {
                    type: 'string',
                    maxLength: 100
                }
            }
        };

        const name = randomToken(10);
        const db = await createRxDatabase({
            name,
            storage: config.storage.getStorage(),
            eventReduce: true,
            ignoreDuplicate: true
        });
        const collections = await db.addCollections({
            mycollection: {
                schema: mySchema
            }
        });

        // first lifecycle of the document
        await collections.mycollection.insert({ passportId: 'foobar' });
        const doc = await collections.mycollection.findOne('foobar').exec(true);
        await doc.remove();
        await collections.mycollection.cleanup(0);

        // insert the same primary key again
        await collections.mycollection.insert({ passportId: 'foobar' });

        // the document was just inserted, so it must be found
        const found = await collections.mycollection.findOne('foobar').exec();
        assert.ok(found, 'findOne() must return the document that was just inserted');

        db.close();
    });
});
