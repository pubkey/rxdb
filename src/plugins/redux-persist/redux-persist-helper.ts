import type {
    RxDatabase,
    RxCollection
} from '../../types/index.d.ts';
import { newRxError } from '../../rx-error.ts';

export const REDUX_PERSIST_COLLECTION_NAME = 'rxdbreduxpersist';

export const REDUX_PERSIST_SCHEMA = {
    version: 0,
    primaryKey: 'key',
    type: 'object',
    properties: {
        key: {
            type: 'string',
            maxLength: 256
        },
        value: {
            type: 'string'
        }
    },
    required: ['key', 'value']
} as const;

/**
 * A storage engine compatible with redux-persist
 * that stores data in an RxDB collection.
 */
export type RxDBReduxPersistStorage = {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
};

type ReduxPersistDocType = {
    key: string;
    value: string;
};

async function ensureReduxPersistCollection(
    db: RxDatabase
): Promise<RxCollection<ReduxPersistDocType>> {
    if (!db.collections[REDUX_PERSIST_COLLECTION_NAME]) {
        await db.addCollections({
            [REDUX_PERSIST_COLLECTION_NAME]: {
                schema: REDUX_PERSIST_SCHEMA
            }
        });
    }
    return db.collections[REDUX_PERSIST_COLLECTION_NAME];
}

/**
 * Creates a redux-persist compatible storage engine backed by RxDB.
 * Usage:
 * ```ts
 * import { getRxStorageReduxPersist } from 'rxdb/plugins/redux-persist';
 * const storage = await getRxStorageReduxPersist(myRxDatabase);
 * const persistConfig = { key: 'root', storage };
 * ```
 */
export async function getRxStorageReduxPersist(
    database: RxDatabase
): Promise<RxDBReduxPersistStorage> {
    if (!database || !database.name) {
        throw newRxError('RP1', { database });
    }

    const collection = await ensureReduxPersistCollection(database);

    const storage: RxDBReduxPersistStorage = {
        async getItem(key: string): Promise<string | null> {
            const doc = await collection.findOne({
                selector: { key }
            }).exec();
            if (!doc) {
                return null;
            }
            return doc.value;
        },

        async setItem(key: string, value: string): Promise<void> {
            await collection.upsert({
                key,
                value
            });
        },

        async removeItem(key: string): Promise<void> {
            const doc = await collection.findOne({
                selector: { key }
            }).exec();
            if (doc) {
                await doc.remove();
            }
        }
    };

    return storage;
}
