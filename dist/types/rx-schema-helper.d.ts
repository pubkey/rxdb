import type { DeepReadonly, JsonSchema, PrimaryKey, RxDocumentData, RxJsonSchema, RxStorageDefaultCheckpoint, StringKeys } from './types/index.d.ts';
import type { RxSchema } from './rx-schema.ts';
/**
 * Helper function to create a valid RxJsonSchema
 * with a given version.
 */
export declare function getPseudoSchemaForVersion<T = any>(version: number, primaryKey: StringKeys<T>): RxJsonSchema<RxDocumentData<T>>;
/**
 * Returns the sub-schema for a given path
 */
export declare function getSchemaByObjectPath<T = any>(rxJsonSchema: RxJsonSchema<T>, path: keyof T | string): JsonSchema;
export declare function fillPrimaryKey<T>(primaryPath: keyof T, jsonSchema: RxJsonSchema<T>, documentData: RxDocumentData<T>): RxDocumentData<T>;
export declare function getPrimaryFieldOfPrimaryKey<RxDocType>(primaryKey: PrimaryKey<RxDocType>): StringKeys<RxDocType>;
export declare function getLengthOfPrimaryKey<RxDocType>(schema: RxJsonSchema<RxDocumentData<RxDocType>>): number;
/**
 * Returns the composed primaryKey of a document by its data.
 */
export declare function getComposedPrimaryKeyOfDocumentData<RxDocType>(jsonSchema: RxJsonSchema<RxDocType> | RxJsonSchema<RxDocumentData<RxDocType>>, documentData: Partial<RxDocType>): string;
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
export declare function normalizeRxJsonSchema<T>(jsonSchema: RxJsonSchema<T>): RxJsonSchema<T>;
/**
 * If the schema does not specify any index,
 * we add this index so we at least can run RxQuery()
 * and only select non-deleted fields.
 */
export declare function getDefaultIndex(primaryPath: string): string[];
/**
 * fills the schema-json with default-settings
 * @return cloned schemaObj
 */
export declare function fillWithDefaultSettings<T = any>(schemaObj: RxJsonSchema<T>): RxJsonSchema<RxDocumentData<T>>;
export declare const META_LWT_UNIX_TIME_MAX = 1000000000000000;
export declare const RX_META_SCHEMA: JsonSchema;
/**
 * returns the final-fields of the schema
 * @return field-names of the final-fields
 */
export declare function getFinalFields<T = any>(jsonSchema: RxJsonSchema<T>): string[];
/**
 * fills all unset fields with default-values if set
 * @hotPath
 */
export declare function fillObjectWithDefaults(rxSchema: RxSchema<any>, obj: any): any;
export declare const DEFAULT_CHECKPOINT_SCHEMA: DeepReadonly<JsonSchema<RxStorageDefaultCheckpoint>>;
