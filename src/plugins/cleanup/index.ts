import type {
    RxCollection,
    RxPlugin
} from '../../types/index.d.ts';
import { DEFAULT_CLEANUP_POLICY } from './cleanup-helper.ts';
import { startCleanupForRxState } from './cleanup-state.ts';
import { cleanupRxCollection, startCleanupForRxCollection } from './cleanup.ts';
import { addRxPlugin } from '../../plugin.ts';
import { RxDBLeaderElectionPlugin } from '../leader-election/index.ts';

export const RxDBCleanupPlugin: RxPlugin = {
    name: 'cleanup',
    rxdb: true,
    /**
     * With cleanupPolicy.waitForLeadership, the automatic cleanup
     * calls RxDatabase.waitForLeadership() which only exists
     * with the leader-election plugin.
     */
    init() {
        addRxPlugin(RxDBLeaderElectionPlugin);
    },
    prototypes: {
        RxCollection: (proto: any) => {
            proto.cleanup = async function (this: RxCollection, minimumDeletedTime?: number): Promise<boolean> {
                const cleanupPolicy = Object.assign(
                    {},
                    DEFAULT_CLEANUP_POLICY,
                    this.database.cleanupPolicy ? this.database.cleanupPolicy : {}
                );

                if (typeof minimumDeletedTime !== 'undefined') {
                    cleanupPolicy.minimumDeletedTime = minimumDeletedTime;
                }

                // run cleanup() until it returns true
                return cleanupRxCollection(this, cleanupPolicy);
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
export * from './cleanup-helper.ts';
