import type {
    RxStorageStatics
} from './types/index.d.ts';
import { DEFAULT_CHECKPOINT_SCHEMA } from './rx-schema-helper.ts';


/**
 * Most RxStorage implementations use these static functions.
 * But you can use anything that implements the interface,
 * for example if your underlying database already has a query engine.
 */
export const RxStorageDefaultStatics: RxStorageStatics = {
    checkpointSchema: DEFAULT_CHECKPOINT_SCHEMA
};
