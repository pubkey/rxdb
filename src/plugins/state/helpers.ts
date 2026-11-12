import { overwritable } from '../../overwritable.ts';
import { newRxError } from '../../rx-error.ts';
import type { DeepReadonly, RxJsonSchema } from '../../types';
import type { RxStateDocument } from './types';
import { getProperty } from '../utils/index.ts';

export const RX_STATE_SCHEMA_TITLE = 'RxStateCollection';
export const RX_STATE_ID_LENGTH = 14;
export const RX_STATE_COLLECTION_SCHEMA: DeepReadonly<RxJsonSchema<RxStateDocument>> = {
    title: RX_STATE_SCHEMA_TITLE,
    primaryKey: 'id',
    version: 0,
    type: 'object',
    properties: {
        id: {
            type: 'string',
            /**
             * We store numbers in string format like '0001'
             * with a left-pad.
             */
            maxLength: RX_STATE_ID_LENGTH,
            minLength: RX_STATE_ID_LENGTH,
            pattern: '[0-9]+'
        },
        sId: {
            type: 'string',
            maxLength: 10,
            minLength: 10
        },
        ops: {
            type: 'array',
            minItems: 1,
            items: {
                type: 'object',
                properties: {
                    k: {
                        type: 'string'
                    },
                    v: {
                        /**
                         * Do not define a type for the value
                         * because anything is allowed.
                         */
                    }
                },
                required: [
                    'k',
                    'v'
                ]
            }
        }
    },
    required: [
        'id',
        'sId',
        'ops'
    ]
} as const;


export function nextRxStateId(lastId?: string): string {
    if (!lastId) {
        return ''.padStart(RX_STATE_ID_LENGTH, '0');
    }
    const parsed = parseInt(lastId, 10);
    const next = parsed + 1;
    const nextString = next.toString();
    return nextString.padStart(RX_STATE_ID_LENGTH, '0');
}

const ARRAY_INDEX_REGEX = /^(0|[1-9][0-9]*)$/;

/**
 * setProperty() only accepts the bracket notation
 * for array items ('list[1].name') and throws on 'list.1.name'.
 * The Paths type and RxState.get() use the dot notation,
 * so each segment that points into an array
 * of the given state is transformed to the bracket notation.
 */
export function toRxStateWritePath(state: any, path: string): string {
    const segments = path.split('.');
    let current = state;
    let ret = '';
    for (let index = 0; index < segments.length; index++) {
        const segment = segments[index];
        if (Array.isArray(current) && ARRAY_INDEX_REGEX.test(segment)) {
            ret += '[' + segment + ']';
        } else {
            ret += (index === 0 ? '' : '.') + segment;
        }
        current = current === undefined || current === null ? undefined : getProperty(current, segment);
    }
    return ret;
}



/**
 * Only non-primitives can be used as a key in WeakMap
 */
export function isValidWeakMapKey(key: any) {
    // This method is slow and must only be used in dev-mode!
    if (!overwritable.isDevMode()) {
        throw newRxError('SNH');
    }
    try {
        new WeakMap().set(key, {});
        return true;
    } catch (err) {
        return false;
    }
}
