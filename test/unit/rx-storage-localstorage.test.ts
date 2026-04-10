/**
 * Exploratory tests for localstorage storage to find bugs empirically.
 */
import assert from 'assert';
import config from './config.ts';
import {
    createRxDatabase,
    randomToken,
    prepareQuery,
    fillWithDefaultSettings,
    normalizeMangoQuery,
    RxJsonSchema,
    RxDocumentData
} from '../../plugins/core/index.mjs';
import { clone } from 'async-test-util';

declare type TestDocType = {
    id: string;
    name: string;
    age: number;
};

import {
    getRxStorageLocalstorage,
    getLocalStorageMock
} from '../../plugins/storage-localstorage/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
import { RxDBAttachmentsPlugin } from '../../plugins/attachments/index.mjs';
import { addRxPlugin } from '../../plugins/core/index.mjs';
addRxPlugin(RxDBAttachmentsPlugin);

describe('rx-storage-localstorage.test.ts', () => {
    if (config.storage.name !== 'localstorage') {
        return;
    }

    const rawSchema = {
        version: 0,
        primaryKey: 'id',
        type: 'object' as const,
        properties: {
            id: { type: 'string' as const, maxLength: 100 },
            name: { type: 'string' as const, maxLength: 100 },
            age: { type: 'integer' as const, minimum: 0, maximum: 150, multipleOf: 1 }
        },
        required: ['id', 'name', 'age'] as const,
        indexes: ['age']
    };

    describe('count() contract', () => {
        /**
         * count() must always return the same number
         * as (await collection.find(sameQuery).exec()).length.
         */
        it('count() with limit must equal find().exec().length', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                eventReduce: false
            });
            const cols = await db.addCollections({ humans: { schema: rawSchema } });
            const col = cols.humans;

            const docs = [];
            for (let i = 0; i < 10; i++) {
                docs.push({ id: 'doc-' + i, name: 'name-' + i, age: 20 + i });
            }
            await col.bulkInsert(docs);

            // Use the storage instance directly to test count with limit,
            // since dev-mode blocks limit on collection.count().
            const schema: RxJsonSchema<RxDocumentData<TestDocType>> = fillWithDefaultSettings(clone(rawSchema));
            const queryWithLimit = normalizeMangoQuery<TestDocType>(schema, {
                selector: {
                    _deleted: { $eq: false },
                    age: { $gte: 20 }
                } as any,
                sort: [{ _deleted: 'asc' as const }, { age: 'asc' as const }, { id: 'asc' as const }],
                skip: 0,
                limit: 3
            });
            const preparedQuery = prepareQuery<TestDocType>(schema, queryWithLimit);

            const queryResult = await col.storageInstance.query(preparedQuery);
            const countResult = await col.storageInstance.count(preparedQuery);

            assert.strictEqual(
                countResult.count,
                queryResult.documents.length,
                'count() must equal query().documents.length'
            );

            await db.close();
        });
    });

    describe('query correctness after cleanup', () => {
        it('queries must return correct results after cleanup removes deleted documents', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                eventReduce: false
            });
            const cols = await db.addCollections({ humans: { schema: rawSchema } });
            const col = cols.humans;

            // Insert 5 documents
            await col.bulkInsert([
                { id: 'a', name: 'Alice', age: 10 },
                { id: 'b', name: 'Bob', age: 20 },
                { id: 'c', name: 'Carol', age: 30 },
                { id: 'd', name: 'Dave', age: 40 },
                { id: 'e', name: 'Eve', age: 50 }
            ]);

            // Delete b and d
            await col.bulkRemove(['b', 'd']);

            // Query non-deleted before cleanup
            const beforeCleanup = await col.find({ selector: {} }).exec();
            assert.strictEqual(beforeCleanup.length, 3, 'should have 3 non-deleted docs before cleanup');

            // Cleanup via storage instance
            while (!await col.storageInstance.cleanup(0)) { }

            // Query non-deleted AFTER cleanup
            const afterCleanup = await col.find({ selector: {} }).exec();
            assert.strictEqual(afterCleanup.length, 3, 'should still have 3 non-deleted docs after cleanup');
            const ids = afterCleanup.map(d => d.id).sort();
            assert.deepStrictEqual(ids, ['a', 'c', 'e'], 'remaining docs should be a, c, e');

            // Query by indexed field after cleanup
            const age30Plus = await col.find({ selector: { age: { $gte: 30 } } }).exec();
            assert.strictEqual(age30Plus.length, 2, 'should find 2 docs with age >= 30');
            const age30Ids = age30Plus.map(d => d.id).sort();
            assert.deepStrictEqual(age30Ids, ['c', 'e'], 'age>=30 docs should be c and e');

            // Insert a new doc and verify it appears in queries
            await col.insert({ id: 'f', name: 'Frank', age: 35 });
            const withNewDoc = await col.find({ selector: { age: { $gte: 30 } } }).exec();
            assert.strictEqual(withNewDoc.length, 3, 'should find 3 docs with age >= 30 after insert');

            await db.close();
        });

        it('re-inserting a document after cleanup should work', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                eventReduce: false
            });
            const cols = await db.addCollections({ humans: { schema: rawSchema } });
            const col = cols.humans;

            await col.insert({ id: 'reuse', name: 'Original', age: 25 });
            const doc = await col.findOne('reuse').exec(true);
            await doc.remove();
            while (!await col.storageInstance.cleanup(0)) { }

            // Re-insert with same ID
            await col.insert({ id: 'reuse', name: 'Replacement', age: 99 });
            const reinserted = await col.findOne('reuse').exec(true);
            assert.strictEqual(reinserted.name, 'Replacement');
            assert.strictEqual(reinserted.age, 99);

            await db.close();
        });
    });

    describe('cleanup after bulkRemove (same _meta.lwt)', () => {
        it('cleanup should work correctly after bulkRemove gives all docs the same lwt', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                eventReduce: false
            });
            const cols = await db.addCollections({ humans: { schema: rawSchema } });
            const col = cols.humans;

            await col.bulkInsert([
                { id: 'x1', name: 'X1', age: 10 },
                { id: 'x2', name: 'X2', age: 20 },
                { id: 'x3', name: 'X3', age: 30 },
                { id: 'keep', name: 'Keep', age: 40 }
            ]);

            // bulkRemove sends all deletes in one bulkWrite → same _meta.lwt
            await col.bulkRemove(['x1', 'x2', 'x3']);

            // Cleanup
            while (!await col.storageInstance.cleanup(0)) { }

            // Only 'keep' should remain
            const remaining = await col.find().exec();
            assert.strictEqual(remaining.length, 1);
            assert.strictEqual(remaining[0].id, 'keep');

            // Verify queries on indexed field still work
            const age40 = await col.find({ selector: { age: { $gte: 40 } } }).exec();
            assert.strictEqual(age40.length, 1);

            const age10 = await col.find({ selector: { age: 10 } }).exec();
            assert.strictEqual(age10.length, 0);

            // Insert new docs and verify they're findable
            await col.insert({ id: 'new1', name: 'New', age: 50 });
            const all = await col.find({ selector: { age: { $gte: 10 } } }).exec();
            assert.strictEqual(all.length, 2);

            await db.close();
        });
    });

    describe('remove() should clean up all data', () => {
        it('remove() must not leave attachment data behind in localStorage', async () => {
            const mock = getLocalStorageMock();
            const storage = wrappedValidateAjvStorage({
                storage: getRxStorageLocalstorage({ localStorage: mock })
            });
            const dbName = randomToken(10);
            const db = await createRxDatabase({
                name: dbName,
                storage,
                eventReduce: false
            });

            const schemaWithAttachments = {
                version: 0,
                primaryKey: 'id',
                type: 'object' as const,
                properties: {
                    id: { type: 'string' as const, maxLength: 100 },
                    name: { type: 'string' as const, maxLength: 100 }
                },
                required: ['id', 'name'] as const,
                attachments: {}
            };

            const cols = await db.addCollections({
                docs: { schema: schemaWithAttachments }
            });
            const col = cols.docs;

            // Insert a document
            const doc = await col.insert({ id: 'att-test', name: 'Test' });

            // Put an attachment
            await doc.putAttachment({
                id: 'myfile.txt',
                data: new Blob(['hello attachment'], { type: 'text/plain' }),
                type: 'text/plain'
            });

            // Check for keys with this database name before remove
            const dbPrefix = 'RxDB-ls-';
            function getDbKeys(): string[] {
                const keys: string[] = [];
                for (let i = 0; i < mock.length; i++) {
                    const key = mock.key(i);
                    if (key && key.startsWith(dbPrefix) && key.includes(dbName)) {
                        keys.push(key);
                    }
                }
                return keys;
            }

            const keysBefore = getDbKeys();
            assert.ok(keysBefore.length > 0, 'should have keys in localStorage before remove');
            assert.ok(
                keysBefore.some(k => k.includes('attachment')),
                'should have attachment keys before remove'
            );

            // Remove the database (calls storageInstance.remove())
            await db.remove();

            // After remove, no keys for this database should remain
            const keysAfter = getDbKeys();
            assert.strictEqual(
                keysAfter.length,
                0,
                'remove() should clean up all data from localStorage, but found leaked keys: ' +
                    keysAfter.join(', ')
            );
        });
    });

    describe('persistence across close/reopen', () => {
        it('documents should survive close and reopen', async () => {
            const dbName = randomToken(10);
            const db1 = await createRxDatabase({
                name: dbName,
                storage: config.storage.getStorage(),
                eventReduce: false
            });
            const cols1 = await db1.addCollections({ humans: { schema: rawSchema } });
            await cols1.humans.bulkInsert([
                { id: 'p1', name: 'Persistent1', age: 11 },
                { id: 'p2', name: 'Persistent2', age: 22 }
            ]);
            await db1.close();

            // Reopen
            const db2 = await createRxDatabase({
                name: dbName,
                storage: config.storage.getStorage(),
                eventReduce: false
            });
            const cols2 = await db2.addCollections({ humans: { schema: rawSchema } });
            const docs = await cols2.humans.find().exec();
            assert.strictEqual(docs.length, 2, 'both documents should persist after reopen');

            const p1 = await cols2.humans.findOne('p1').exec(true);
            assert.strictEqual(p1.name, 'Persistent1');

            await db2.close();
        });
    });

    describe('update and query indexed fields', () => {
        it('updating an indexed field should make old value unfindable and new value findable', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                eventReduce: false
            });
            const cols = await db.addCollections({ humans: { schema: rawSchema } });
            const col = cols.humans;

            await col.insert({ id: 'upd', name: 'Updatable', age: 25 });

            // Query by old value
            let age25 = await col.find({ selector: { age: 25 } }).exec();
            assert.strictEqual(age25.length, 1);

            // Update indexed field
            const doc = await col.findOne('upd').exec(true);
            await doc.patch({ age: 99 });

            // Old value should not be findable
            age25 = await col.find({ selector: { age: 25 } }).exec();
            assert.strictEqual(age25.length, 0, 'old age value should not be findable');

            // New value should be findable
            const age99 = await col.find({ selector: { age: 99 } }).exec();
            assert.strictEqual(age99.length, 1, 'new age value should be findable');
            assert.strictEqual(age99[0].id, 'upd');

            await db.close();
        });

        it('updating one of two docs sharing same indexed value should keep the other findable', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                eventReduce: false
            });
            const cols = await db.addCollections({ humans: { schema: rawSchema } });
            const col = cols.humans;

            await col.insert({ id: 'alice', name: 'Alice', age: 25 });
            await col.insert({ id: 'bob', name: 'Bob', age: 25 });

            // Both findable at age=25
            let age25 = await col.find({ selector: { age: 25 }, sort: [{ id: 'asc' }] }).exec();
            assert.strictEqual(age25.length, 2);

            // Update bob to different age
            const bob = await col.findOne('bob').exec(true);
            await bob.patch({ age: 99 });

            // alice still findable at age=25
            age25 = await col.find({ selector: { age: 25 } }).exec();
            assert.strictEqual(age25.length, 1, 'alice should still be findable at age=25');
            assert.strictEqual(age25[0].id, 'alice');

            // bob findable at age=99
            const age99 = await col.find({ selector: { age: 99 } }).exec();
            assert.strictEqual(age99.length, 1);
            assert.strictEqual(age99[0].id, 'bob');

            await db.close();
        });
        it('multiple updates to same indexed field should maintain correct index', async () => {
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
                eventReduce: false
            });
            const cols = await db.addCollections({ humans: { schema: rawSchema } });
            const col = cols.humans;

            await col.insert({ id: 'multi', name: 'Multi', age: 10 });

            // Update multiple times
            let doc = await col.findOne('multi').exec(true);
            await doc.patch({ age: 20 });
            doc = await col.findOne('multi').exec(true);
            await doc.patch({ age: 30 });
            doc = await col.findOne('multi').exec(true);
            await doc.patch({ age: 40 });

            // Only latest value findable
            for (const oldAge of [10, 20, 30]) {
                const oldResult = await col.find({ selector: { age: oldAge } }).exec();
                assert.strictEqual(oldResult.length, 0, `age=${oldAge} should not be findable`);
            }
            const latestResult = await col.find({ selector: { age: 40 } }).exec();
            assert.strictEqual(latestResult.length, 1, 'age=40 should be findable');

            await db.close();
        });
    });
});
