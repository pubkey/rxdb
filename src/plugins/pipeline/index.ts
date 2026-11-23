import type {
    RxPlugin
} from '../../types/index.d.ts';
import { addPipeline } from './rx-pipeline.ts';
import { addRxPlugin } from '../../plugin.ts';
import { RxDBLeaderElectionPlugin } from '../leader-election/index.ts';

export type * from './types.ts';
export * from './flagged-functions.ts';
export * from './rx-pipeline.ts';

export const RxDBPipelinePlugin: RxPlugin = {
    name: 'pipeline',
    rxdb: true,
    /**
     * With options.waitForLeadership, addPipeline()
     * calls RxDatabase.waitForLeadership() which only exists
     * with the leader-election plugin.
     */
    init() {
        addRxPlugin(RxDBLeaderElectionPlugin);
    },
    prototypes: {
        RxCollection(proto: any) {
            proto.addPipeline = addPipeline;
        }
    }
};
