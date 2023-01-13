import {
    overwriteGetterForCaching,
    isMaybeReadonlyArray,
    fastUnsecureHash,
    deepEqual
} from './plugins/utils';
import {
    newRxError,
} from './rx-error';
import {
    runPluginHooks
} from './hooks';
import {
    defineGetterSetter
} from './rx-document';

import type {
    DeepMutable,
    DeepReadonly, MaybeReadonly,
    RxDocumentData,
    RxJsonSchema,
    StringKeys
} from './types';
import {
    fillWithDefaultSettings,
    getComposedPrimaryKeyOfDocumentData,
    getFinalFields,
    getPrimaryFieldOfPrimaryKey,
    normalizeRxJsonSchema
} from './rx-schema-helper';
import { overwritable } from './overwritable';

export class RxSchema<RxDocType = any> {
    public indexes: MaybeReadonly<string[]>[];
    public readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    public finalFields: string[];

    constructor(
        public readonly jsonSchema: RxJsonSchema<RxDocumentData<RxDocType>>
    ) {
        this.indexes = getIndexes(this.jsonSchema);

        // primary is always required
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.jsonSchema.primaryKey);

        this.finalFields = getFinalFields(this.jsonSchema);
    }

    public get version(): number {
        return this.jsonSchema.version;
    }

    public get defaultValues(): { [P in keyof RxDocType]: RxDocType[P] } {
        const values = {} as { [P in keyof RxDocType]: RxDocType[P] };
        Object
            .entries(this.jsonSchema.properties)
            .filter(([, v]) => (v as any).hasOwnProperty('default'))
            .forEach(([k, v]) => (values as any)[k] = (v as any).default);
        return overwriteGetterForCaching(
            this,
            'defaultValues',
            values
        );
    }

    /**
     * @overrides itself on the first call
     */
    public get hash(): string {
        return overwriteGetterForCaching(
            this,
            'hash',
            fastUnsecureHash(JSON.stringify(this.jsonSchema))
        );
    }

    /**
     * checks if a given change on a document is allowed
     * Ensures that:
     * - final fields are not modified
     * @throws {Error} if not valid
     */
    validateChange(dataBefore: any, dataAfter: any): void {
        this.finalFields.forEach(fieldName => {
            if (!deepEqual(dataBefore[fieldName], dataAfter[fieldName])) {
                throw newRxError('DOC9', {
                    dataBefore,
                    dataAfter,
                    fieldName,
                    schema: this.jsonSchema
                });
            }
        });
    }

    /**
     * creates the schema-based document-prototype,
     * see RxCollection.getDocumentPrototype()
     */
    public getDocumentPrototype(): any {
        const proto = {};
        defineGetterSetter(this, proto, '');
        overwriteGetterForCaching(
            this,
            'getDocumentPrototype',
            () => proto
        );
        return proto;
    }


    getPrimaryOfDocumentData(
        documentData: Partial<RxDocType>
    ): string {
        return getComposedPrimaryKeyOfDocumentData(
            this.jsonSchema,
            documentData
        );
    }
}

export function getIndexes<RxDocType = any>(
    jsonSchema: RxJsonSchema<RxDocType>
): MaybeReadonly<string[]>[] {
    return (jsonSchema.indexes || []).map(index => isMaybeReadonlyArray(index) ? index : [index]);
}

/**
 * array with previous version-numbers
 */
export function getPreviousVersions(schema: RxJsonSchema<any>): number[] {
    const version = schema.version ? schema.version : 0;
    let c = 0;
    return new Array(version)
        .fill(0)
        .map(() => c++);
}

export function createRxSchema<T>(
    jsonSchema: RxJsonSchema<T>,
    runPreCreateHooks = true
): RxSchema<T> {
    if (runPreCreateHooks) {
        runPluginHooks('preCreateRxSchema', jsonSchema);
    }

    let useJsonSchema = fillWithDefaultSettings(jsonSchema);
    useJsonSchema = normalizeRxJsonSchema(useJsonSchema);
    overwritable.deepFreezeWhenDevMode(useJsonSchema);

    const schema = new RxSchema(useJsonSchema);
    runPluginHooks('createRxSchema', schema);
    return schema;
}

export function isRxSchema(obj: any): boolean {
    return obj instanceof RxSchema;
}

/**
 * Used as helper function the generate the document type out of the schema via typescript.
 * @link https://github.com/pubkey/rxdb/discussions/3467
 */
export function toTypedRxJsonSchema<T extends DeepReadonly<RxJsonSchema<any>>>(schema: T): DeepMutable<T> {
    return schema as any;
}
