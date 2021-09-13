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
import assert, { fail } from 'assert';
import AsyncTestUtil from 'async-test-util';

import {
    createRxDatabase,
    randomCouchString
} from '../../plugins/core';

import {
    getRxStoragePouch,
} from '../../plugins/pouchdb';

describe('bug-report.test.js', () => {
    it('reusing the name of a previously removed collection should not result in an unhandled rejection', async () => {
        window.addEventListener('unhandledrejection', () => {
            // we should not get here
            fail()
        });
        const name = randomCouchString(10);
        const test = {
            schema: {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                    },
                },
            },
        };
        const db = await createRxDatabase({
            name,
            storage: getRxStoragePouch('memory'),
        });
        await db.addCollections({ test });

        await db.test.remove();             // < commenting out these two lines
        await db.addCollections({ test });  // < will result in test (trivially) passing.
                                            // with these lines present, subsequent operations 
                                            // on collection succeed, but cause unhandled rejection
        await db.test.insert({ id: 'test' }); 
                                            // not a huge deal on its own(?), but I'm seeing
                                            // other weird (and more difficult to "test")
                                            // issues coinciding with this
        db.destroy();
    });
});
