import {
    newRxError,
    newRxTypeError
} from '../../rx-error.ts';
import type { KeyFunctionMap, RxJsonSchema } from '../../types/index.d.ts';
import { rxCollectionProperties, rxDocumentProperties } from './entity-properties.ts';

/**
 * Built-in property and method names on RxAttachment instances.
 * Hard-coded here (instead of read from the RxAttachment class)
 * so the dev-mode plugin does not have to import the attachments plugin.
 * ORM attachment-methods that share a name with any of these would
 * silently shadow the built-in method on each attachment instance.
 */
export const RX_ATTACHMENT_RESERVED_NAMES: string[] = [
    'doc',
    'id',
    'type',
    'length',
    'digest',
    'remove',
    'getData',
    'getStringData',
    'getDataBase64'
];

/**
 * checks if the given static methods are allowed
 * @throws if not allowed
 */
export function checkOrmMethods(
    statics?: KeyFunctionMap,
    additionalReservedNames?: string[]
) {
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
                rxDocumentProperties().includes(k) ||
                (additionalReservedNames && additionalReservedNames.includes(k))
            ) {
                throw newRxError('COL17', {
                    name: k
                });
            }
        });
}


export function checkOrmDocumentMethods<RxDocType>(
    schema: RxJsonSchema<RxDocType>,
    methods?: any,
) {
    const topLevelFields = Object.keys(schema.properties) as (keyof RxDocType)[];
    if (!methods) {
        return;
    }

    /**
     * Build a set of all schema-generated property names
     * that will be defined on the document prototype.
     * For each field, the schema generates:
     * - field (value getter)
     * - field$ (observable getter)
     * - field$$ (reactivity getter)
     * - field_ (populate getter)
     */
    const schemaGeneratedNames = new Set<string>();
    topLevelFields.forEach(field => {
        const f = field as string;
        schemaGeneratedNames.add(f);
        schemaGeneratedNames.add(f + '$');
        schemaGeneratedNames.add(f + '$$');
        schemaGeneratedNames.add(f + '_');
    });

    Object.keys(methods)
        .filter(funName => schemaGeneratedNames.has(funName))
        .forEach(funName => {
            throw newRxError('COL18', {
                funName
            });
        });
}
