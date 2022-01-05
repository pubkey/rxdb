import objectPath from 'object-path';
import type { JsonSchema, RxJsonSchema, StringKeys } from './types';
import { trimDots } from './util';

/**
 * Helper function to create a valid RxJsonSchema
 * with a given version.
 */
export function getPseudoSchemaForVersion<T = any>(
    version: number,
    primaryKey: StringKeys<T>
): RxJsonSchema<T> {
    const pseudoSchema: RxJsonSchema<T> = {
        version,
        type: 'object',
        primaryKey: primaryKey as any,
        properties: {
            [primaryKey]: {
                type: 'string'
            }
        } as any,
        required: [primaryKey]
    };
    return pseudoSchema;
}

/**
 * Returns the sub-schema for a given path
 */
export function getSchemaByObjectPath<T = any>(
    rxJsonSchema: RxJsonSchema<T>,
    path: keyof T | string
): JsonSchema {
    let usePath: string = path as string;
    usePath = usePath.replace(/\./g, '.properties.');
    usePath = 'properties.' + usePath;
    usePath = trimDots(usePath);

    const ret = objectPath.get(rxJsonSchema, usePath);
    return ret;
}
