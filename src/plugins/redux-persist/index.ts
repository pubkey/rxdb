import type {
    RxPlugin
} from '../../types/index.d.ts';

export type {
    RxDBReduxPersistStorage,
    ReduxPersistDocType
} from './redux-persist-helper.ts';

export {
    getRxStorageReduxPersist,
    REDUX_PERSIST_SCHEMA
} from './redux-persist-helper.ts';

export const RxDBReduxPersistPlugin: RxPlugin = {
    name: 'redux-persist',
    rxdb: true
};
