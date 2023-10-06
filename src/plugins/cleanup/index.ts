import type {
    RxPlugin
} from '../../types/index.d.ts';
import { startCleanupForRxCollection } from './cleanup.ts';

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

export * from './cleanup.ts';
