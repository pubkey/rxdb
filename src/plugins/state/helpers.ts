import type { DeepReadonly, RxJsonSchema } from '../../types';
import type { RxStateDocument } from './types';

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
             * TODO instead we should transform the number to a string
             * with the same sort-position to improve performance.
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
                        type: 'object'
                    }
                },
                required: [
                    'key',
                    'value'
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
