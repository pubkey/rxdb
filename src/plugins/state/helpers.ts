import { overwritable } from '../../overwritable.ts';
import { newRxError } from '../../rx-error.ts';
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
const PATH_PART_REGEX = /^([^[\]]*)((?:\[(?:0|[1-9][0-9]*)\])*)$/;

type RxStatePathSegment = {
    key: string;
    /**
     * True when the segment was written
     * as array index in brackets like '[1]'.
     */
    bracket: boolean;
};

/**
 * Splits a path into its segments.
 * An array item can be addressed with the
 * dot notation ('list.1.name'), with the bracket notation ('list[1].name')
 * or with both in the same path ('matrix.1[0]').
 * Returns undefined when the path cannot be split that way,
 * for example when it contains escaped dots.
 */
function getRxStatePathSegments(path: string): RxStatePathSegment[] | undefined {
    if (path.includes('\\')) {
        return undefined;
    }
    const ret: RxStatePathSegment[] = [];
    const parts = path.split('.');
    for (let index = 0; index < parts.length; index++) {
        const match = PATH_PART_REGEX.exec(parts[index]);
        if (!match) {
            return undefined;
        }
        const brackets = match[2];
        if (match[1] !== '' || brackets === '') {
            ret.push({ key: match[1], bracket: false });
        }
        if (brackets !== '') {
            const indexes = brackets.slice(1, -1).split('][');
            for (let i = 0; i < indexes.length; i++) {
                ret.push({ key: indexes[i], bracket: true });
            }
        }
    }
    return ret;
}

/**
 * Returns the path in the dot notation ('list.1.name')
 * so that getProperty() resolves dot, bracket and mixed paths
 * to the same value.
 */
export function toRxStateReadPath(path: string): string {
    if (!path.includes('[')) {
        return path;
    }
    const segments = getRxStatePathSegments(path);
    if (!segments) {
        return path;
    }
    return segments.map(segment => segment.key).join('.');
}

/**
 * setProperty() only accepts the bracket notation
 * for array items ('list[1].name') and throws on 'list.1.name'.
 * The Paths type and RxState.get() use the dot notation,
 * so each dot segment that points into an array
 * of the given state is transformed to the bracket notation.
 * A dot segment whose parent is not an array stays as it is,
 * so it addresses (or creates) an object property.
 * Segments that are already in the bracket notation are kept.
 */
export function toRxStateWritePath(state: any, path: string): string {
    const segments = getRxStatePathSegments(path);
    if (!segments) {
        return path;
    }
    let current = state;
    let ret = '';
    for (let index = 0; index < segments.length; index++) {
        const segment = segments[index];
        if (
            segment.bracket ||
            (Array.isArray(current) && ARRAY_INDEX_REGEX.test(segment.key))
        ) {
            ret += '[' + segment.key + ']';
        } else {
            ret += (index === 0 ? '' : '.') + segment.key;
        }
        current = current === undefined || current === null ? undefined : current[segment.key];
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
