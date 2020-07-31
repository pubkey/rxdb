import type { RxJsonSchema, JsonSchema } from './types';
export declare class RxSchema<T = any> {
    readonly jsonSchema: RxJsonSchema<T>;
    indexes: string[][];
    primaryPath: string;
    finalFields: string[];
    constructor(jsonSchema: RxJsonSchema<T>);
    get version(): number;
    get normalized(): RxJsonSchema<T>;
    get topLevelFields(): (keyof T)[];
    get defaultValues(): {
        [P in keyof T]: T[P];
    };
    /**
        * true if schema contains at least one encrypted path
        */
    get crypt(): boolean;
    /**
     * get all encrypted paths
     */
    get encryptedPaths(): string[];
    /**
     * @overrides itself on the first call
     */
    get hash(): string;
    getSchemaByObjectPath(path: string): JsonSchema;
    /**
     * checks if a given change on a document is allowed
     * Ensures that:
     * - primary is not modified
     * - final fields are not modified
     * @throws {Error} if not valid
     */
    validateChange(dataBefore: any, dataAfter: any): void;
    /**
     * validate if the obj matches the schema
     * @overwritten by plugin (required)
     * @param schemaPath if given, validates agains deep-path of schema
     * @throws {Error} if not valid
     * @param obj equal to input-obj
     */
    validate(_obj: any, _schemaPath?: string): void;
    /**
     * fills all unset fields with default-values if set
     */
    fillObjectWithDefaults(obj: any): any;
    swapIdToPrimary(obj: any): any;
    swapPrimaryToId(obj: any): any;
    /**
     * returns true if key-compression should be done
     */
    doKeyCompression(): boolean;
    /**
     * creates the schema-based document-prototype,
     * see RxCollection.getDocumentPrototype()
     */
    getDocumentPrototype(): any;
}
export declare function getIndexes<T = any>(jsonSchema: RxJsonSchema<T>): string[][];
/**
 * returns the primary path of a jsonschema
 * @return primaryPath which is _id if none defined
 */
export declare function getPrimary<T = any>(jsonSchema: RxJsonSchema<T>): string;
/**
 * array with previous version-numbers
 */
export declare function getPreviousVersions(schema: RxJsonSchema): number[];
/**
 * returns the final-fields of the schema
 * @return field-names of the final-fields
 */
export declare function getFinalFields<T = any>(jsonSchema: RxJsonSchema<T>): string[];
/**
 * orders the schemas attributes by alphabetical order
 * @return jsonSchema - ordered
 */
export declare function normalize(jsonSchema: RxJsonSchema): RxJsonSchema;
/**
 * fills the schema-json with default-settings
 * @return cloned schemaObj
 */
export declare const fillWithDefaultSettings: (schemaObj: RxJsonSchema) => RxJsonSchema;
export declare function createRxSchema<T = any>(jsonSchema: RxJsonSchema, runPreCreateHooks?: boolean): RxSchema<T>;
export declare function isInstanceOf(obj: any): boolean;
