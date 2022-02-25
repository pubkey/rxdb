import objectPath from 'object-path';
import { newRxError } from './rx-error';
import type {
    CompositePrimaryKey,
    JsonSchema,
    RxDocumentData,
    RxJsonSchema,
    StringKeys
} from './types';
import { flatClone, trimDots } from './util';

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

export function fillPrimaryKey<T>(
    primaryPath: keyof T,
    jsonSchema: RxJsonSchema<T>,
    documentData: RxDocumentData<T>
): RxDocumentData<T> {
    const cloned = flatClone(documentData);
    const newPrimary = getComposedPrimaryKeyOfDocumentData<T>(
        jsonSchema,
        documentData
    );
    const existingPrimary: string | undefined = documentData[primaryPath] as any;
    if (
        existingPrimary &&
        existingPrimary !== newPrimary
    ) {
        throw newRxError(
            'DOC19',
            {
                args: {
                    documentData,
                    existingPrimary,
                    newPrimary,
                },
                schema: jsonSchema
            });
    }

    (cloned as any)[primaryPath] = newPrimary;
    return cloned;
}

/**
 * Returns the composed primaryKey of a document by its data.
 */
export function getComposedPrimaryKeyOfDocumentData<RxDocType>(
    jsonSchema: RxJsonSchema<RxDocType>,
    documentData: Partial<RxDocType>
): string {
    if (typeof jsonSchema.primaryKey === 'string') {
        return (documentData as any)[jsonSchema.primaryKey];
    }

    const compositePrimary: CompositePrimaryKey<RxDocType> = jsonSchema.primaryKey as any;
    return compositePrimary.fields.map(field => {
        const value = objectPath.get(documentData as any, field as string);
        if (typeof value === 'undefined') {
            throw newRxError('DOC18', { args: { field, documentData } });
        }
        return value;
    }).join(compositePrimary.separator);
}
