import type {
    RxPlugin
} from '../../types/index.d.ts';
import { addPipeline } from './rx-pipeline.ts';

export type * from './types.ts';
export * from './flagged-functions.ts';
export * from './rx-pipeline.ts';

export const RxDBPipelinePlugin: RxPlugin = {
    name: 'pipeline',
    rxdb: true,
    prototypes: {
        RxCollection(proto: any) {
            proto.addPipeline = addPipeline;
        }
    }
};
