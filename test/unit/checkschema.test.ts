import { createRxDatabase } from '../../';
import config from './config';

describe('TypeError: Cannot read properties of null (reading hasOwnProperty)', () => {
    it('should pass because the bug is fixed', async () => {
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

        // add this plugin triggers the bug, but seems it's added in the test setup
        // addRxPlugin(RxDBDevModePlugin);

        // create a database
        const db = await createRxDatabase({
            name: 'test-app',
            /**
             * By calling config.storage.getStorage(),
             * we can ensure that all variations of RxStorage are tested in the CI.
             */
            storage: config.storage.getStorage(),
        });

        // create a collection
        await db
            .addCollections({
                users: {
                    schema: userSchema,
                },
            });

        await db.destroy()
    });
});
