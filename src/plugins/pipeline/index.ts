import type {
    RxDatabase,
    RxPlugin,
    RxState
} from '../../types/index.d.ts';
import { getFromMapOrCreate } from '../utils/utils-map.ts';
import { addPipeline } from './rx-pipeline.ts';
import type { RxPipelineOptions } from './types.ts';

export type * from './types.ts';

export const RxDBPipelinePlugin: RxPlugin = {
    name: 'pipeline',
    rxdb: true,
    prototypes: {
        RxCollection(proto: any) {
            proto.addPipeline = addPipeline;
        }
    }
};
