import assert from 'assert';
import config from './config.ts';
import {
    createRxDatabase,
    randomToken,
    addRxPlugin,
    prepareQuery,
    normalizeMangoQuery,
    fillWithDefaultSettings,
    clone,
    RxJsonSchema
} from '../../plugins/core/index.mjs';
import {
    getRxStorageLocalstorage,
    getLocalStorageMock
} from '../../plugins/storage-localstorage/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
import { RxDBAttachmentsPlugin } from '../../plugins/attachments/index.mjs';

addRxPlugin(RxDBAttachmentsPlugin);

/**
 * Tests specific to the localstorage storage where the behavior
 * cannot be observed through the generic rx-storage-implementations
 * test suite.
 */
describe('rx-storage-localstorage.test.ts', () => {
    if (config.storage.name !== 'localstorage') {
        return;
    }
    it('remove() must delete all localStorage keys for the database, including attachments', async () => {
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

        const cols = await db.addCollections({
            docs: {
                schema: {
                    version: 0,
                    primaryKey: 'id',
                    type: 'object',
                    properties: {
                        id: { type: 'string', maxLength: 100 },
                        name: { type: 'string', maxLength: 100 }
                    },
                    required: ['id', 'name'],
                    attachments: {}
                }
            }
        });

        const doc = await cols.docs.insert({ id: 'att-test', name: 'Test' });
        await doc.putAttachment({
            id: 'myfile.txt',
            data: new Blob(['hello attachment'], { type: 'text/plain' }),
            type: 'text/plain'
        });

        function getDbKeys(): string[] {
            const keys: string[] = [];
            for (let i = 0; i < mock.length; i++) {
                const key = mock.key(i);
                if (key && key.includes(dbName)) {
                    keys.push(key);
                }
            }
            return keys;
        }

        const keysBefore = getDbKeys();
        assert.ok(
            keysBefore.some(k => k.includes('attachment')),
            'should have attachment keys before remove'
        );

        await db.remove();

        const keysAfter = getDbKeys();
        assert.strictEqual(
            keysAfter.length,
            0,
            'remove() must clean up all keys, but found leaked: ' + keysAfter.join(', ')
        );
    });

    it('cleanup() must work on data that was stored with the cleanup index without the primary key', async () => {
        const mock = getLocalStorageMock();
        const dbName = randomToken(10);
        const schema: RxJsonSchema<{ id: string; name: string; }> = {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: { type: 'string', maxLength: 100 },
                name: { type: 'string', maxLength: 100 }
            },
            required: ['id', 'name']
        };
        async function openCollection() {
            const db = await createRxDatabase({
                name: dbName,
                storage: wrappedValidateAjvStorage({
                    storage: getRxStorageLocalstorage({ localStorage: mock })
                }),
                multiInstance: false
            });
            const cols = await db.addCollections({ docs: { schema } });
            return cols.docs;
        }

        const colBefore = await openCollection();
        await colBefore.bulkInsert(['a', 'b', 'c', 'd'].map(id => ({ id, name: id })));
        await colBefore.bulkRemove(['b', 'c', 'd']);
        await colBefore.database.close();

        /**
         * Rewrite the stored cleanup index of the collection
         * into the layout [_deleted, _meta.lwt] where the
         * index strings do not end with the primary key.
         */
        const newIndexSuffix = '--docs--0_deleted|_meta.lwt|id';
        const legacyIndexSuffix = '--docs--0_deleted|_meta.lwt';
        let newIndexKey: string | undefined;
        for (let i = 0; i < mock.length; i++) {
            const key = mock.key(i);
            if (key && key.includes(dbName) && key.endsWith(newIndexSuffix)) {
                newIndexKey = key;
            }
        }
        assert.ok(newIndexKey, 'cleanup index not found');
        const legacyIndexKey = newIndexKey.slice(0, -1 * newIndexSuffix.length) + legacyIndexSuffix;
        const storedIndex: string[][] = JSON.parse(mock.getItem(newIndexKey) as string);
        assert.strictEqual(storedIndex.length, 4);
        mock.setItem(
            legacyIndexKey,
            JSON.stringify(storedIndex.map(row => [row[0].slice(0, -100), row[1]]))
        );
        mock.removeItem(newIndexKey);

        const col = await openCollection();
        assert.strictEqual(mock.getItem(legacyIndexKey), null);

        // update a document that was written with the previous index layout
        const docA = await col.findOne('a').exec(true);
        await docA.incrementalPatch({ name: 'a2' });
        await col.cleanup(0);
        await col.cleanup(0);

        const docs = await col.find().exec();
        assert.deepStrictEqual(docs.map(d => d.name), ['a2']);

        await col.bulkInsert(['b', 'c', 'd'].map(id => ({ id, name: id })));
        await col.bulkRemove(['a', 'c']);
        await col.cleanup(0);
        const remaining = await col.find({ sort: [{ id: 'asc' }] }).exec();
        assert.deepStrictEqual(remaining.map(d => d.id), ['b', 'd']);

        await col.database.remove();
        for (let i = 0; i < mock.length; i++) {
            const key = mock.key(i);
            assert.ok(!key || !key.includes(dbName), 'leaked key ' + key);
        }
    });

    /**
     * count() must respect skip and limit and return the
     * same amount as query().documents.length .
     * The generic query-correctness suite skips count checks
     * when limit/skip is present because some storages implement
     * count() with a different contract, so this regression test
     * lives here.
     */
    it('count() must return the same amount as query().documents.length (with limit)', async () => {
        const dbName = randomToken(10);
        const db = await createRxDatabase({
            name: dbName,
            storage: config.storage.getStorage(),
            eventReduce: false
        });
        const rawSchema: RxJsonSchema<{ id: string; age: number; }> = {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: { type: 'string', maxLength: 100 },
                age: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 150,
                    multipleOf: 1
                }
            },
            required: ['id', 'age'],
            indexes: ['age']
        };
        const cols = await db.addCollections({ humans: { schema: rawSchema } });
        const col = cols.humans;

        await col.bulkInsert(
            new Array(10).fill(0).map((_, i) => ({ id: 'doc-' + i, age: 20 + i }))
        );

        const schema = fillWithDefaultSettings(clone(rawSchema));
        const preparedQuery = prepareQuery(
            schema,
            normalizeMangoQuery(schema, {
                selector: {
                    _deleted: { $eq: false },
                    age: { $gte: 20 }
                } as any,
                sort: [
                    { _deleted: 'asc' as const },
                    { age: 'asc' as const },
                    { id: 'asc' as const }
                ],
                skip: 0,
                limit: 3
            })
        );

        const queryResult = await col.storageInstance.query(preparedQuery);
        const countResult = await col.storageInstance.count(preparedQuery);

        assert.strictEqual(
            countResult.count,
            queryResult.documents.length,
            'count() must equal query().documents.length'
        );
        assert.strictEqual(countResult.count, 3, 'count should be limited to 3');

        await db.close();
    });
});
