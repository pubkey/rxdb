import type { DeepMutable, DeepReadonly, MaybeReadonly, RxDocumentData, RxJsonSchema } from './types';
export declare class RxSchema<T = any> {
    readonly jsonSchema: RxJsonSchema<RxDocumentData<T>>;
    indexes: MaybeReadonly<string[]>[];
    primaryPath: keyof T;
    finalFields: string[];
    constructor(jsonSchema: RxJsonSchema<RxDocumentData<T>>);
    get version(): number;
    get defaultValues(): {
        [P in keyof T]: T[P];
    };
    /**
        * true if schema contains at least one encrypted path
        */
    get crypt(): boolean;
    /**
     * @overrides itself on the first call
     */
    get hash(): string;
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
    /**
     * creates the schema-based document-prototype,
     * see RxCollection.getDocumentPrototype()
     */
    getDocumentPrototype(): any;
    getPrimaryOfDocumentData(documentData: Partial<T>): string;
}
export declare function getIndexes<T = any>(jsonSchema: RxJsonSchema<T>): MaybeReadonly<string[]>[];
/**
 * array with previous version-numbers
 */
export declare function getPreviousVersions(schema: RxJsonSchema<any>): number[];
export declare function createRxSchema<T>(jsonSchema: RxJsonSchema<T>, runPreCreateHooks?: boolean): RxSchema<T>;
export declare function isInstanceOf(obj: any): boolean;
/**
 * Used as helper function the generate the document type out of the schema via typescript.
 * @link https://github.com/pubkey/rxdb/discussions/3467
 */
export declare function toTypedRxJsonSchema<T extends DeepReadonly<RxJsonSchema<any>>>(schema: T): DeepMutable<T>;
