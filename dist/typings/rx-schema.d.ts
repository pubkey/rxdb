import { RxJsonSchema, JsonSchema } from './types';
export declare class RxSchema<T = any> {
    readonly jsonID: RxJsonSchema<T>;
    compoundIndexes: string[] | string[][];
    indexes: string[][];
    primaryPath: keyof T;
    finalFields: string[];
    constructor(jsonID: RxJsonSchema<T>);
    get version(): number;
    get crypt(): boolean;
    get normalized(): RxJsonSchema;
    get topLevelFields(): (keyof T)[];
    get defaultValues(): {
        [P in keyof T]: T[P];
    };
    get encryptedPaths(): {
        [k: string]: JsonSchema;
    };
    get hash(): string;
    /**
     * true if schema contains at least one encrypted path
     */
    private _crypt?;
    _normalized?: RxJsonSchema;
    private _defaultValues?;
    /**
     * get all encrypted paths
     */
    private _encryptedPaths?;
    private _hash?;
    /**
     * creates the schema-based document-prototype,
     * see RxCollection.getDocumentPrototype()
     */
    private _getDocumentPrototype?;
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
    getDocumentPrototype(): any;
}
/**
 * returns all encrypted paths of the schema
 */
export declare function getEncryptedPaths(jsonSchema: RxJsonSchema): {
    [k: string]: JsonSchema;
};
/**
 * returns true if schema contains an encrypted field
 */
export declare function hasCrypt(jsonSchema: RxJsonSchema): boolean;
export declare function getIndexes<T = any>(jsonID: RxJsonSchema<T>): string[][];
/**
 * returns the primary path of a jsonschema
 * @return primaryPath which is _id if none defined
 */
export declare function getPrimary<T = any>(jsonID: RxJsonSchema<T>): keyof T;
/**
 * array with previous version-numbers
 */
export declare function getPreviousVersions(schema: RxJsonSchema): number[];
/**
 * returns the final-fields of the schema
 * @return field-names of the final-fields
 */
export declare function getFinalFields<T = any>(jsonID: RxJsonSchema<T>): string[];
/**
 * orders the schemas attributes by alphabetical order
 * @return jsonSchema - ordered
 */
export declare function normalize(jsonSchema: RxJsonSchema): RxJsonSchema;
export declare function createRxSchema<T = any>(jsonID: RxJsonSchema, runPreCreateHooks?: boolean): RxSchema<T>;
export declare function isInstanceOf(obj: any): boolean;
