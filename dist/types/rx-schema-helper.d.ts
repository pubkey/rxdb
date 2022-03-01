import type { JsonSchema, PrimaryKey, RxDocumentData, RxJsonSchema, StringKeys } from './types';
/**
 * Helper function to create a valid RxJsonSchema
 * with a given version.
 */
export declare function getPseudoSchemaForVersion<T = any>(version: number, primaryKey: StringKeys<T>): RxJsonSchema<T>;
/**
 * Returns the sub-schema for a given path
 */
export declare function getSchemaByObjectPath<T = any>(rxJsonSchema: RxJsonSchema<T>, path: keyof T | string): JsonSchema;
export declare function fillPrimaryKey<T>(primaryPath: keyof T, jsonSchema: RxJsonSchema<T>, documentData: RxDocumentData<T>): RxDocumentData<T>;
export declare function getPrimaryFieldOfPrimaryKey<RxDocType>(primaryKey: PrimaryKey<RxDocType>): keyof RxDocType;
/**
 * Returns the composed primaryKey of a document by its data.
 */
export declare function getComposedPrimaryKeyOfDocumentData<RxDocType>(jsonSchema: RxJsonSchema<RxDocType>, documentData: Partial<RxDocType>): string;
