import type {
    RxDatabase,
    RxCollection
} from '../../types/index.d.ts';
import { newRxError } from '../../rx-error.ts';

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

export type ReduxPersistDocType = {
    key: string;
    value: string;
};

/**
 * Creates a redux-persist compatible storage engine
 * that persists into the given RxCollection.
 *
 * The collection must have a schema with at least
 * a `key` (string, primaryKey) and `value` (string) field.
 * You can use `REDUX_PERSIST_SCHEMA` as a convenience.
 */
export function getRxStorageReduxPersist(
    collection: RxCollection<ReduxPersistDocType>
): RxDBReduxPersistStorage {
    if (!collection || typeof collection.findOne !== 'function') {
        throw newRxError('RP1', { collection });
    }

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
