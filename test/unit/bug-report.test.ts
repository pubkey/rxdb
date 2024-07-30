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
import { addRxPlugin, createRxDatabase, MangoQuery, } from '../../plugins/core/index.mjs';
import { wrappedKeyCompressionStorage } from '../../plugins/key-compression/index.mts';
import { getRxStorageDexie } from '../../plugins/storage-dexie/index.mts';
import { isNode } from '../../plugins/test-utils/index.mjs';
import { RxJsonSchema } from '../../src/index.ts';
import { RxDBDevModePlugin } from '../../plugins/dev-mode/index.mts';

describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async function () {

        if ( isNode ) {
            return;
        }

        // create a schema
        const schema = {
            version: 0,
            keyCompression: true,
            primaryKey: 'passportId',
            type: 'object',
            properties: {
                passportId: {
                    type: 'string',
                    maxLength: 128,
                },
                firstName: {
                    type: 'string',
                    maxLength: 128,
                },
                lastName: {
                    type: 'string',
                    maxLength: 128,
                },
                adult: {
                    type: 'boolean'
                }
            },
            required: [ 'passportId', 'adult' ],
            indexes: [
                'firstName',
                'lastName',
                'adult',
                [ 'firstName', 'lastName', 'adult' ]
            ]
        } as const satisfies RxJsonSchema<any>;

        const name = `a${(Math.random() + 1).toString(36).substring(7)}`;
        const storage = wrappedKeyCompressionStorage({ storage: getRxStorageDexie() });

        addRxPlugin(RxDBDevModePlugin);

        const db = await createRxDatabase({
            name,
            storage,
            eventReduce: true,
            ignoreDuplicate: true
        });
        const collections = await db.addCollections({
            ['test-collection']: {
                schema
            }
        });

        // insert a document
        await collections['test-collection'].bulkUpsert([
            {
                passportId: '1',
                firstName: 'Bob',
                lastName: 'Kelso',
                adult: true
            },
            {
                passportId: '2',
                firstName: 'Andrew',
                lastName: 'Wright',
                adult: true
            },
            {
                passportId: '3',
                firstName: 'Tommy',
                lastName: 'Little',
                adult: false
            }
        ] );

        const queryObject: MangoQuery = {
            selector:{
                adult: true
            },
            index: [ 'adult' ]
        };
        assert.ok( ( await collections['test-collection'].find(queryObject).exec() ).length === 2 );

        db.destroy();
    });
});
