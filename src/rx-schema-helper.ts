import { newRxError } from './rx-error';
import type {
    CompositePrimaryKey,
    DeepReadonly,
    JsonSchema,
    PrimaryKey,
    RxDocumentData,
    RxJsonSchema,
    RxStorageDefaultCheckpoint,
    StringKeys
} from './types';
import {
    flatClone,
    getProperty,
    isMaybeReadonlyArray,
    REGEX_ALL_DOTS,
    RX_META_LWT_MINIMUM,
    sortObject,
    trimDots
} from './plugins/utils';
import type { RxSchema } from './rx-schema';

/**
 * Helper function to create a valid RxJsonSchema
 * with a given version.
 */
export function getPseudoSchemaForVersion<T = any>(
    version: number,
    primaryKey: StringKeys<T>
): RxJsonSchema<RxDocumentData<T>> {
    const pseudoSchema: RxJsonSchema<RxDocumentData<T>> = fillWithDefaultSettings({
        version,
        type: 'object',
        primaryKey: primaryKey as any,
        properties: {
            [primaryKey]: {
                type: 'string',
                maxLength: 100
            }
        } as any,
        required: [primaryKey]
    });
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
    usePath = usePath.replace(REGEX_ALL_DOTS, '.properties.');
    usePath = 'properties.' + usePath;
    usePath = trimDots(usePath);

    const ret = getProperty(rxJsonSchema, usePath);
    return ret;
}

export function fillPrimaryKey<T>(
    primaryPath: keyof T,
    jsonSchema: RxJsonSchema<T>,
    documentData: RxDocumentData<T>
): RxDocumentData<T> {
    // optimization shortcut.
    if (typeof jsonSchema.primaryKey === 'string') {
        return documentData;
    }

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

    (documentData as any)[primaryPath] = newPrimary;
    return documentData;
}

export function getPrimaryFieldOfPrimaryKey<RxDocType>(
    primaryKey: PrimaryKey<RxDocType>
): StringKeys<RxDocType> {
    if (typeof primaryKey === 'string') {
        return primaryKey as any;
    } else {
        return (primaryKey as CompositePrimaryKey<RxDocType>).key;
    }
}

/**
 * Returns the composed primaryKey of a document by its data.
 */
export function getComposedPrimaryKeyOfDocumentData<RxDocType>(
    jsonSchema: RxJsonSchema<RxDocType> | RxJsonSchema<RxDocumentData<RxDocType>>,
    documentData: Partial<RxDocType>
): string {
    if (typeof jsonSchema.primaryKey === 'string') {
        return (documentData as any)[jsonSchema.primaryKey];
    }

    const compositePrimary: CompositePrimaryKey<RxDocType> = jsonSchema.primaryKey as any;
    return compositePrimary.fields.map(field => {
        const value = getProperty(documentData as any, field as string);
        if (typeof value === 'undefined') {
            throw newRxError('DOC18', { args: { field, documentData } });
        }
        return value;
    }).join(compositePrimary.separator);
}


/**
 * Normalize the RxJsonSchema.
 * We need this to ensure everything is set up properly
 * and we have the same hash on schemas that represent the same value but
 * have different json.
 *
 * - Orders the schemas attributes by alphabetical order
 * - Adds the primaryKey to all indexes that do not contain the primaryKey
 * - We need this for deterministic sort order on all queries, which is required for event-reduce to work.
 *
 * @return RxJsonSchema - ordered and filled
 */
export function normalizeRxJsonSchema<T>(jsonSchema: RxJsonSchema<T>): RxJsonSchema<T> {
    const normalizedSchema: RxJsonSchema<T> = sortObject(jsonSchema, true);
    return normalizedSchema;
}

/**
 * fills the schema-json with default-settings
 * @return cloned schemaObj
 */
export function fillWithDefaultSettings<T = any>(
    schemaObj: RxJsonSchema<T>
): RxJsonSchema<RxDocumentData<T>> {
    schemaObj = flatClone(schemaObj);
    const primaryPath: string = getPrimaryFieldOfPrimaryKey(schemaObj.primaryKey);
    schemaObj.properties = flatClone(schemaObj.properties);

    // additionalProperties is always false
    schemaObj.additionalProperties = false;

    // fill with key-compression-state ()
    if (!schemaObj.hasOwnProperty('keyCompression')) {
        schemaObj.keyCompression = false;
    }

    // indexes must be array
    schemaObj.indexes = schemaObj.indexes ? schemaObj.indexes.slice(0) : [];

    // required must be array
    schemaObj.required = schemaObj.required ? schemaObj.required.slice(0) : [];

    // encrypted must be array
    schemaObj.encrypted = schemaObj.encrypted ? schemaObj.encrypted.slice(0) : [];

    // add _rev
    (schemaObj.properties as any)._rev = {
        type: 'string',
        minLength: 1
    };

    // add attachments
    (schemaObj.properties as any)._attachments = {
        type: 'object'
    };

    // add deleted flag
    (schemaObj.properties as any)._deleted = {
        type: 'boolean'
    };

    // add meta property
    (schemaObj.properties as any)._meta = RX_META_SCHEMA;

    /**
     * meta fields are all required
     */
    schemaObj.required = schemaObj.required ? schemaObj.required.slice(0) : [];
    (schemaObj.required as string[]).push('_deleted');
    (schemaObj.required as string[]).push('_rev');
    (schemaObj.required as string[]).push('_meta');
    (schemaObj.required as string[]).push('_attachments');

    // final fields are always required
    const finalFields = getFinalFields(schemaObj);
    schemaObj.required = schemaObj.required
        .concat(finalFields as any)
        .filter((field: string) => !field.includes('.'))
        .filter((elem: any, pos: any, arr: any) => arr.indexOf(elem) === pos); // unique;

    // version is 0 by default
    schemaObj.version = schemaObj.version || 0;

    /**
     * Append primary key to indexes that do not contain the primaryKey.
     * All indexes must have the primaryKey to ensure a deterministic sort order.
     */
    if (schemaObj.indexes) {
        schemaObj.indexes = schemaObj.indexes.map(index => {
            const arIndex = isMaybeReadonlyArray(index) ? index.slice(0) : [index];
            if (!arIndex.includes(primaryPath)) {
                const modifiedIndex = arIndex.slice(0);
                modifiedIndex.push(primaryPath);
                return modifiedIndex;
            }
            return arIndex;
        });
    }

    return schemaObj as any;
}


export const RX_META_SCHEMA: JsonSchema = {
    type: 'object',
    properties: {
        /**
         * The last-write time.
         * Unix time in milliseconds.
         */
        lwt: {
            type: 'number',
            /**
             * We use 1 as minimum so that the value is never falsy.
             */
            minimum: RX_META_LWT_MINIMUM,
            maximum: 1000000000000000,
            multipleOf: 0.01
        }
    },
    /**
     * Additional properties are allowed
     * and can be used by plugins to set various flags.
     */
    additionalProperties: true as any,
    required: [
        'lwt'
    ]
};


/**
 * returns the final-fields of the schema
 * @return field-names of the final-fields
 */
export function getFinalFields<T = any>(
    jsonSchema: RxJsonSchema<T>
): string[] {
    const ret = Object.keys(jsonSchema.properties)
        .filter(key => (jsonSchema as any).properties[key].final);

    // primary is also final
    const primaryPath = getPrimaryFieldOfPrimaryKey(jsonSchema.primaryKey);
    ret.push(primaryPath);

    // fields of composite primary are final
    if (typeof jsonSchema.primaryKey !== 'string') {
        (jsonSchema.primaryKey as CompositePrimaryKey<T>).fields
            .forEach(field => ret.push(field as string));
    }

    return ret;
}

/**
 * fills all unset fields with default-values if set
 * @hotPath
 */
export function fillObjectWithDefaults(rxSchema: RxSchema<any>, obj: any): any {
    const defaultKeys = Object.keys(rxSchema.defaultValues);
    for (let i = 0; i < defaultKeys.length; ++i) {
        const key = defaultKeys[i];
        if (!obj.hasOwnProperty(key) || typeof obj[key] === 'undefined') {
            obj[key] = rxSchema.defaultValues[key];
        }
    }
    return obj;
}

export const DEFAULT_CHECKPOINT_SCHEMA: DeepReadonly<JsonSchema<RxStorageDefaultCheckpoint>> = {
    type: 'object',
    properties: {
        id: {
            type: 'string'
        },
        lwt: {
            type: 'number'
        }
    },
    required: [
        'id',
        'lwt'
    ],
    additionalProperties: false
} as const;
