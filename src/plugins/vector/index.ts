import type {
    RxPlugin
} from '../../types/index.d.ts';
import { addVectorIndex } from './rx-vector-index.ts';

export type * from './types.ts';
export * from './vector-distance.ts';
export * from './vector-index.ts';
export * from './rx-vector-index.ts';

export const RxDBVectorPlugin: RxPlugin = {
    name: 'vector',
    rxdb: true,
    prototypes: {
        RxCollection(proto: any) {
            proto.addVectorIndex = addVectorIndex;
        }
    }
};
