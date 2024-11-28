import type { DeepMutable, DeepReadonly, HashFunction, MaybeReadonly, RxDocumentData, RxJsonSchema, StringKeys } from './types/index.d.ts';
export declare class RxSchema<RxDocType = any> {
    readonly jsonSchema: RxJsonSchema<RxDocumentData<RxDocType>>;
    readonly hashFunction: HashFunction;
    indexes: MaybeReadonly<string[]>[];
    readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    finalFields: string[];
    constructor(jsonSchema: RxJsonSchema<RxDocumentData<RxDocType>>, hashFunction: HashFunction);
    get version(): number;
    get defaultValues(): {
        [P in keyof RxDocType]: RxDocType[P];
    };
    /**
     * @overrides itself on the first call
     */
    get hash(): Promise<string>;
    /**
     * checks if a given change on a document is allowed
     * Ensures that:
     * - final fields are not modified
     * @throws {Error} if not valid
     */
    validateChange(dataBefore: any, dataAfter: any): void;
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
export declare function createRxSchema<T>(jsonSchema: RxJsonSchema<T>, hashFunction: HashFunction, runPreCreateHooks?: boolean): RxSchema<T>;
export declare function isRxSchema(obj: any): boolean;
/**
 * Used as helper function the generate the document type out of the schema via typescript.
 * @link https://github.com/pubkey/rxdb/discussions/3467
 */
export declare function toTypedRxJsonSchema<T extends DeepReadonly<RxJsonSchema<any>>>(schema: T): DeepMutable<T>;
