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
import { createRxDatabase, addRxPlugin } from '../../';
import { RxDBDevModePlugin } from '../../plugins/dev-mode';
import config from './config';
import assert from 'assert';

describe('TypeError: Cannot read properties of null (reading hasOwnProperty)', () => {
    it('should fail because it reproduces the bug', async () => {
        // create a schema
        const userSchema = {
            title: 'user schema',
            description: 'describes a user',
            type: 'object',
            version: 0,

            // re-enable once not use dexie.js engine for the web since it does not support it
            keyCompression: false,

            primaryKey: 'id',
            properties: {
                id: {
                    type: 'string',
                    maxLength: 100,
                },
                birthday: {
                    type: ['string', 'null'],
                    default: null,
                },
                createTime: {
                    type: 'string',
                },
            },
            required: ['id', 'createTime', 'updateTime'],
        };

        // generate a random database-name
        const name = 'test-app';

        addRxPlugin(RxDBDevModePlugin);

        // create a database
        const db = await createRxDatabase({
            name,
            /**
             * By calling config.storage.getStorage(),
             * we can ensure that all variations of RxStorage are tested in the CI.
             */
            storage: config.storage.getStorage(),
        });

        let err = null;

        // create a collection
        await db
            .addCollections({
                users: {
                    schema: userSchema,
                },
            })
            .catch((e) => {
                err = e;
            });

        assert.ok(err === null);
    });
});
