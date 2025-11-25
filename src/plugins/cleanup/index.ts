import { runAsyncPluginHooks } from '../../hooks.ts';
import type {
    RxCollection,
    RxPlugin
} from '../../types/index.d.ts';
import { DEFAULT_CLEANUP_POLICY } from './cleanup-helper.ts';
import { startCleanupForRxState } from './cleanup-state.ts';
import { cleanupRxCollection, startCleanupForRxCollection } from './cleanup.ts';

export const RxDBCleanupPlugin: RxPlugin = {
    name: 'cleanup',
    rxdb: true,
    prototypes: {
        RxCollection: (proto: any) => {
            proto.cleanup = async function (this: RxCollection, minimumDeletedTime?: number): Promise<void> {
                const cleanupPolicy = Object.assign(
                    {},
                    DEFAULT_CLEANUP_POLICY,
                    this.database.cleanupPolicy ? this.database.cleanupPolicy : {}
                );

                if (typeof minimumDeletedTime === 'undefined') {
                    minimumDeletedTime = cleanupPolicy.minimumDeletedTime;
                }

                // run cleanup() until it returns true
                await cleanupRxCollection(this, cleanupPolicy);
            };
        }
    },
    hooks: {
        createRxCollection: {
            after: (i) => {
                startCleanupForRxCollection(i.collection);
            }
        },
        createRxState: {
            after: (i) => {
                startCleanupForRxState(i.state);
            }
        }
    }
};

export * from './cleanup.ts';
