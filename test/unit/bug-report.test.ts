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
    randomToken
} from '../../plugins/core/index.mjs';
describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async function () {

        const schemaScalar = {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    maxLength: 100
                },
                name: {
                    type: 'string'
                },
                number: {
                    type: 'number'
                }
            }
        };

        const schemaComposite = {
            version: 0,
            primaryKey: {
                key: 'id',
                fields: ['name', 'number'],
                separator: '|'
            },
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    maxLength: 100
                },
                name: {
                    type: 'string'
                },
                number: {
                    type: 'number'
                }
            }
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
            storage: config.storage.getStorage(),
            eventReduce: true,
            ignoreDuplicate: true
        });
        // create a collection
        const collections = await db.addCollections({
            collectionScalar: {
                schema: schemaScalar
            },
            collectionComposite: {
                schema: schemaComposite
            }
        });
        collections.collectionScalar.preInsert( (data) => {
            data.id = data.id ?? randomToken(10);
        }, false);
        collections.collectionComposite.preInsert( (data) => {
            data.name = data.name ?? randomToken(10);
            data.number = data.number ?? 42;
        }, false);

        // insert a document
        const docScalar = await collections.collectionScalar.insert({});     /// works
        assert( docScalar.id.length === 10 );
        const docComposite = await collections.collectionComposite.insert({});  /// fails
        assert( docComposite.id.length === 10 + 3 );

        db.close();
    });
});
