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
    isNode,
    isDeno
} from '../../plugins/test-utils/index.mjs';
import {
    indexedDB as fakeIndexedDB
} from 'fake-indexeddb';

describe('bug-report.test.js', () => {
    /**
     * Reproduces https://github.com/pubkey/rxdb/issues/8793
     *
     * The reference counting in dexie-helper.ts never closes the
     * underlying Dexie/IndexedDB connections on database close and
     * never evicts the DEXIE_STATE_DB_BY_NAME cache entry.
     * When the application afterwards deletes the IndexedDB databases
     * (for example on logout, to remove user data from a shared device),
     * the leaked connections get force-closed by the delete request.
     * Re-creating a database with the same name in the same JS context
     * then receives the cached, closed Dexie instance and fails with
     * DatabaseClosedError.
     */
    it('should fail because it reproduces the bug', async function () {
        // the defect is located in the dexie storage, other storages are not affected
        if (config.storage.name !== 'dexie') {
            return;
        }

        // in node and deno the dexie tests run on fake-indexeddb, see config.ts
        const idb: any = (isNode || isDeno) ? fakeIndexedDB : (globalThis as any).indexedDB;

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
                },
                lastName: {
                    type: 'string'
                },
                age: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 150
                }
            }
        };

        const name = randomToken(10);
        const collectionName = 'mycollection';

        // create a database, insert a document, close the database again
        const db = await createRxDatabase({
            name,
            storage: config.storage.getStorage()
        });
        const collections = await db.addCollections({
            [collectionName]: {
                schema: mySchema
            }
        });
        await collections[collectionName].insert({
            passportId: 'foobar',
            firstName: 'Bob',
            lastName: 'Kelso',
            age: 56
        });
        await db.close();

        /**
         * Delete the underlying per-collection IndexedDB databases,
         * like an application does on logout to remove user data
         * from the device. Because close() did not release the Dexie
         * connections, this delete request first gets blocked and the
         * connections are force-closed to resume it.
         */
        const dexieDbNames = [
            'rxdb-dexie-' + name + '--' + mySchema.version + '--_rxdb_internal',
            'rxdb-dexie-' + name + '--' + mySchema.version + '--' + collectionName
        ];
        await Promise.all(
            dexieDbNames.map(dexieDbName => new Promise<void>((res, rej) => {
                const deleteRequest = idb.deleteDatabase(dexieDbName);
                deleteRequest.onsuccess = () => res();
                deleteRequest.onerror = () => rej(deleteRequest.error);
            }))
        );

        /**
         * Re-create a database with the same name in the same JS context.
         * Without the fix this throws Dexie's DatabaseClosedError
         * ("Database has been closed") because the state cache still
         * holds the force-closed Dexie instance.
         */
        const db2 = await createRxDatabase({
            name,
            storage: config.storage.getStorage()
        });
        const collections2 = await db2.addCollections({
            [collectionName]: {
                schema: mySchema
            }
        });
        await collections2[collectionName].insert({
            passportId: 'foobar',
            firstName: 'Bob',
            lastName: 'Kelso',
            age: 56
        });
        const myDocument = await collections2[collectionName]
            .findOne({
                selector: {
                    firstName: 'Bob'
                }
            })
            .exec(true);
        assert.strictEqual(myDocument.age, 56);

        // clean up afterwards
        await db2.remove();
    });
});
