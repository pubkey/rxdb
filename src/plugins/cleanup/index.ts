import type {
    RxPlugin
} from '../../types';
import { startCleanupForRxCollection } from './cleanup';

export const RxDBCleanupPlugin: RxPlugin = {
    name: 'cleanup',
    rxdb: true,
    prototypes: {},
    hooks: {
        createRxCollection: {
            after: (i) => {
                startCleanupForRxCollection(i.collection);
            }
        }
    }
};

export * from './cleanup';
