import type {
    RxDatabase,
    RxPlugin,
    RxState
} from '../../types/index.d.ts';
import { getFromMapOrCreate } from '../utils/utils-map.ts';

export type * from './types.ts';

export async function addPipeline() {

}

export const RxDBPipelinePlugin: RxPlugin = {
    name: 'pipeline',
    rxdb: true,
    prototypes: {
        RxCollection(proto: any) {
            proto.addPipeline = addPipeline;
        }
    }
};
