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
import {
    isDeno,
    isFastMode,
    isNode
} from '../../plugins/test-utils/index.mjs';
import {
    indexedDB as fakeIndexedDB
} from 'fake-indexeddb';

describe('bug-report.test.js', () => {
    /**
     * Reproduces https://github.com/pubkey/rxdb/issues/8793
     *
     * The reference counting in dexie-helper.ts never closes the
     * underlying Dexie connections and never evicts the state cache entry.
     * When the application afterwards deletes the IndexedDB databases,
     * for example on logout to remove user data from a shared device,
     * the leaked connections get force-closed by the delete request.
     * Creating a database with the same name again in the same JS context
     * then gets the closed Dexie instance out of the cache and throws
     * DatabaseClosedError.
     */
    it('should fail because it reproduces the bug', async function () {

        // the defect is located in dexie-helper.ts, other storages are not affected
        if (config.storage.name !== 'dexie') {
            return;
        }

        // in nodejs and deno the dexie tests run on fake-indexeddb, see config.ts
        const idb: any = (isNode || isDeno || isFastMode()) ? fakeIndexedDB : (globalThis as any).indexedDB;

        // create a schema
        const mySchema = {
            version: 0,
            primaryKey: 'passportId',
            type: 'object',
            properties: {
                passportId: {
                    type: 'string',
                    maxLength: 100
                },
                firstName: {
                    type: 'string'
                }
            }
        };

        /**
         * Always generate a random database-name
         * to ensure that different test runs do not affect each other.
         */
        const name = randomToken(10);

        const createDb = async () => {
            const database = await createRxDatabase({
                name,
                storage: config.storage.getStorage()
            });
            await database.addCollections({
                mycollection: {
                    schema: mySchema
                }
            });
            return database;
        };

        // create a database, insert a document and close it again
        const db = await createDb();
        await db.mycollection.insert({
            passportId: 'foobar',
            firstName: 'Bob'
        });
        await db.close();

        /**
         * Delete the IndexedDB databases that belong to the RxDatabase,
         * like an application does on logout.
         * Because close() did not release the Dexie connections,
         * these delete requests force-close them.
         */
        const idbNames: string[] = (await idb.databases())
            .map((d: any) => d.name)
            .filter((dbName: string) => dbName.includes(name));
        assert.ok(idbNames.length > 0);
        await Promise.all(
            idbNames.map(dbName => new Promise<void>((res, rej) => {
                const deleteRequest = idb.deleteDatabase(dbName);
                deleteRequest.onsuccess = () => res();
                deleteRequest.onerror = () => rej(deleteRequest.error);
            }))
        );

        /**
         * Create the same database again.
         * Without a fix this throws the DatabaseClosedError of dexie
         * because the state cache still contains the force-closed instance.
         */
        const db2 = await createDb();
        await db2.mycollection.insert({
            passportId: 'foobar',
            firstName: 'Bob'
        });
        const doc = await db2.mycollection.findOne().exec(true);
        assert.strictEqual(doc.firstName, 'Bob');

        // clean up afterwards
        await db2.close();
    });
});
