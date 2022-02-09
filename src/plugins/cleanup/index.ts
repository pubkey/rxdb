import type {
    RxCollection,
    RxPlugin
} from '../../types';
import { startCleanupForRxCollection } from './cleanup';

export const RxDBCleanupPlugin: RxPlugin = {
    name: 'cleanup',
    rxdb: true,
    prototypes: {},
    hooks: {
        createRxCollection(collection: RxCollection) {
            startCleanupForRxCollection(collection);
        }
    }
};

export * from './cleanup';
