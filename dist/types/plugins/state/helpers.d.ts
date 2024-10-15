import type { DeepReadonly, RxJsonSchema } from '../../types';
import type { RxStateDocument } from './types';
export declare const RX_STATE_SCHEMA_TITLE = "RxStateCollection";
export declare const RX_STATE_ID_LENGTH = 14;
export declare const RX_STATE_COLLECTION_SCHEMA: DeepReadonly<RxJsonSchema<RxStateDocument>>;
export declare function nextRxStateId(lastId?: string): string;
/**
 * Only non-primitives can be used as a key in WeakMap
 */
export declare function isValidWeakMapKey(key: any): boolean;
