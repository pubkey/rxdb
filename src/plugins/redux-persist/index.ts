import type {
    RxDatabase,
    RxPlugin
} from '../../types/index.d.ts';
import {
    getRxStorageReduxPersist,
    REDUX_PERSIST_COLLECTION_NAME,
    REDUX_PERSIST_SCHEMA
} from './redux-persist-helper.ts';

export type {
    RxDBReduxPersistStorage
} from './redux-persist-helper.ts';

export {
    getRxStorageReduxPersist,
    REDUX_PERSIST_COLLECTION_NAME,
    REDUX_PERSIST_SCHEMA
} from './redux-persist-helper.ts';

/**
 * Adds the `getReduxPersistStorage()` method to RxDatabase instances.
 * Returns a storage engine compatible with redux-persist.
 */
export async function getReduxPersistStorage(this: RxDatabase) {
    return getRxStorageReduxPersist(this);
}

export const RxDBReduxPersistPlugin: RxPlugin = {
    name: 'redux-persist',
    rxdb: true,
    prototypes: {
        RxDatabase(proto: any) {
            proto.getReduxPersistStorage = getReduxPersistStorage;
        }
    }
};
