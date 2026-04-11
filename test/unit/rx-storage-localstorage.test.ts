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
