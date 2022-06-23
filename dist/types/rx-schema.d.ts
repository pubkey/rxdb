import type { DeepMutable, DeepReadonly, MaybeReadonly, RxDocumentData, RxJsonSchema, StringKeys } from './types';
export declare class RxSchema<RxDocType = any> {
    readonly jsonSchema: RxJsonSchema<RxDocumentData<RxDocType>>;
    indexes: MaybeReadonly<string[]>[];
    readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    finalFields: string[];
    constructor(jsonSchema: RxJsonSchema<RxDocumentData<RxDocType>>);
    get version(): number;
    get defaultValues(): {
        [P in keyof RxDocType]: RxDocType[P];
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
     * - final fields are not modified
     * @throws {Error} if not valid
     */
    validateChange(dataBefore: any, dataAfter: any): void;
    /**
     * validate if the given document data matches the schema
     * @param schemaPath if given, validates against deep-path of schema
     * @throws {Error} if not valid
     * @param obj equal to input-obj
     *
     */
    validate(obj: Partial<RxDocType> | any, schemaPath?: string): void;
    /**
     * @overwritten by the given validation plugin
     */
    validateFullDocumentData(_docData: RxDocumentData<RxDocType>, _schemaPath?: string): void;
    /**
     * fills all unset fields with default-values if set
     */
    fillObjectWithDefaults(obj: any): any;
    /**
     * creates the schema-based document-prototype,
     * see RxCollection.getDocumentPrototype()
     */
    getDocumentPrototype(): any;
    getPrimaryOfDocumentData(documentData: Partial<RxDocType>): string;
}
export declare function getIndexes<RxDocType = any>(jsonSchema: RxJsonSchema<RxDocType>): MaybeReadonly<string[]>[];
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
