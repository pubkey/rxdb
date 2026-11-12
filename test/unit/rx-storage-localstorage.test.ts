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
    RxJsonSchema,
    RxAttachment
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
    /**
     * Creates its own localstorage RxStorage,
     * so it runs with every storage of the test config.
     */
    it('a write that fails because setItem() throws must not leave a partial write behind', async () => {
        const mock = getLocalStorageMock();
        let throwOnKeyPrefix: string | undefined;
        const quotaLocalStorage: typeof localStorage = {
            get length() {
                return mock.length;
            },
            clear: () => { },
            key: (index: number) => mock.key(index),
            getItem: (key: string) => mock.getItem(key),
            removeItem: (key: string) => mock.removeItem(key),
            setItem: (key: string, value: string) => {
                if (throwOnKeyPrefix && key.startsWith(throwOnKeyPrefix)) {
                    throwOnKeyPrefix = undefined;
                    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
                }
                mock.setItem(key, value);
            }
        };
        const db = await createRxDatabase({
            name: randomToken(10),
            storage: wrappedValidateAjvStorage({
                storage: getRxStorageLocalstorage({ localStorage: quotaLocalStorage })
            }),
            multiInstance: false
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
        const col = cols.docs;
        await col.insert({ id: 'a', name: 'Alice' });

        // insert: the document is written, the index is not
        throwOnKeyPrefix = 'RxDB-ls-idx-';
        await assert.rejects(
            () => col.insert({ id: 'b', name: 'Bob' }),
            (err: any) => err.name === 'QuotaExceededError'
        );
        const docOfFailedInsert = await col.findOne('b').exec();
        assert.ok(!docOfFailedInsert, 'the document of the rejected insert must not be stored');
        await col.insert({ id: 'b', name: 'Bob' });
        const ids = (await col.find({ sort: [{ id: 'asc' }] }).exec()).map(d => d.id);
        assert.deepStrictEqual(ids, ['a', 'b']);

        // update: document and index are written, the change event is not
        const docA = await col.findOne('a').exec(true);
        throwOnKeyPrefix = 'RxDB-ls-changes-';
        await assert.rejects(
            () => docA.patch({ name: 'Alice2' }),
            (err: any) => err.name === 'QuotaExceededError'
        );
        const patched = await docA.patch({ name: 'Alice3' });
        assert.strictEqual(patched.name, 'Alice3');

        // attachment: document with the attachment stub is written, the attachment data is not
        const docB = await col.findOne('b').exec(true);
        throwOnKeyPrefix = 'RxDB-ls-attachment-';
        await assert.rejects(
            () => docB.putAttachment({
                id: 'big.txt',
                data: new Blob(['too big for the quota'], { type: 'text/plain' }),
                type: 'text/plain'
            }),
            (err: any) => err.name === 'QuotaExceededError'
        );
        await docB.getLatest().putAttachment({
            id: 'small.txt',
            data: new Blob(['ok'], { type: 'text/plain' }),
            type: 'text/plain'
        });
        const attachments: RxAttachment<any>[] = docB.getLatest().allAttachments();
        assert.deepStrictEqual(attachments.map(a => a.id), ['small.txt']);
        assert.strictEqual(await attachments[0].getStringData(), 'ok');

        await db.remove();
    });

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
