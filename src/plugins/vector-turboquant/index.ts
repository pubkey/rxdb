import type { RxPlugin } from '../../types/index.d.ts';
import { addVectorIndex } from './rx-vector-index.ts';

export type * from './types.ts';
export * from './normal-distribution.ts';
export * from './lloyd-max.ts';
export * from './rotation.ts';
export * from './turboquant-index.ts';
export * from './serialize.ts';
export * from './rx-vector-index.ts';

export const RxDBVectorTurboQuantPlugin: RxPlugin = {
    name: 'vector-turboquant',
    rxdb: true,
    prototypes: {
        RxCollection(proto: any) {
            proto.addVectorIndex = addVectorIndex;
        }
    }
};
