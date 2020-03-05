import {
    newRxError,
    newRxTypeError
} from '../../rx-error';
import { KeyFunctionMap } from '../../types';

import {
    properties as rxDocumentProperties
} from '../../rx-document';

import {
    properties as rxCollectionProperties
} from '../../rx-collection';

/**
 * checks if the given static methods are allowed
 * @throws if not allowed
 */
export function checkOrmMethods(statics?: KeyFunctionMap) {
    if (!statics) {
        return;
    }
    Object
        .entries(statics)
        .forEach(([k, v]) => {
            if (typeof k !== 'string') {
                throw newRxTypeError('COL14', {
                    name: k
                });
            }

            if (k.startsWith('_')) {
                throw newRxTypeError('COL15', {
                    name: k
                });
            }

            if (typeof v !== 'function') {
                throw newRxTypeError('COL16', {
                    name: k,
                    type: typeof k
                });
            }

            if (
                rxCollectionProperties().includes(k) ||
                rxDocumentProperties().includes(k)
            ) {
                throw newRxError('COL17', {
                    name: k
                });
            }
        });
}
