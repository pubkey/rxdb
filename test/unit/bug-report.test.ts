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
import config from './config.ts';

import {
    addRxPlugin,
    createRxDatabase,
    randomToken,
    RxCollection,
} from '../../plugins/core/index.mjs';
import { isNode } from '../../plugins/test-utils/index.mjs';
import { RxDBMigrationPlugin } from '../../plugins/migration-schema/index.mjs';

describe('bug-report.test.js', () => {
    addRxPlugin(RxDBMigrationPlugin);
    it('Should migrate correctly when adding a migration strategy even if it was not present before', async function () {
        /**
         * If your test should only run in nodejs or only run in the browser,
         * you should comment in the return operator and adapt the if statement.
         */
        if (
            !isNode // runs only in node
            // isNode // runs only in the browser
        ) {
            // return;
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
        const db = await createDB();
        // create a collection
        const collections = await db.addCollections({
            mycollection: {
                autoMigrate: true,
                migrationStrategies: {},
                schema: mySchema,
            },
        });

        // insert a document
        await insertDoc(collections.mycollection);

        // clean up afterwards
        db.close();

        try {
            const db2 = await createDB();
            await db2.addCollections({
                mycollection: {
                    autoMigrate: true,
                    migrationStrategies: {},
                    schema: getModifiedSchema(),
                },
            });
            db2.close();
        } catch (e) {
            console.log('Fails because we did not add the migration strategy at this point');
            // We expect this to fail
        }

        const db3 = await createDB();

        // This should work (as we have a migration strategy at this point), but it keeps failing.
        await db3.addCollections({
            mycollection: {
                autoMigrate: true,
                migrationStrategies: {
                    1: (doc) => {
                        return {
                            ...doc,
                            dob: '1990-01-01',
                        };
                    },
                },
                schema: getModifiedSchema(),
            },
        });

        db3.close();

        function createDB() {
            return createRxDatabase({
                name,
                storage: config.storage.getStorage(),
                eventReduce: true,
                ignoreDuplicate: true,
            });
        }

        function insertDoc(collection: RxCollection<any>) {
            return collection.insert({
                passportId: 'foobar',
                firstName: 'Bob',
                lastName: 'Kelso',
                age: 56,
            });
        }

        function getModifiedSchema() {
            return {
                ...mySchema,
                version: 1,
                properties: {
                    ...mySchema.properties,
                    dob: { type: 'string' },
                },
            };
        }
    });
});
