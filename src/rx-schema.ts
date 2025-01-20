import {
    overwriteGetterForCaching,
    isMaybeReadonlyArray,
    deepEqual
} from './plugins/utils/index.ts';
import {
    newRxError,
} from './rx-error.ts';
import {
    runPluginHooks
} from './hooks.ts';

import type {
    DeepMutable,
    DeepReadonly,
    HashFunction,
    MaybeReadonly,
    RxDocument,
    RxDocumentData,
    RxJsonSchema,
    StringKeys
} from './types/index.d.ts';
import {
    fillWithDefaultSettings,
    getComposedPrimaryKeyOfDocumentData,
    getFinalFields,
    getPrimaryFieldOfPrimaryKey,
    getSchemaByObjectPath,
    normalizeRxJsonSchema
} from './rx-schema-helper.ts';
import { overwritable } from './overwritable.ts';

export class RxSchema<RxDocType = any> {
    public indexes: MaybeReadonly<string[]>[];
    public readonly primaryPath: StringKeys<RxDocumentData<RxDocType>>;
    public finalFields: string[];

    constructor(
        public readonly jsonSchema: RxJsonSchema<RxDocumentData<RxDocType>>,
        public readonly hashFunction: HashFunction
    ) {
        this.indexes = getIndexes(this.jsonSchema);

        // primary is always required
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.jsonSchema.primaryKey);

        /**
         * Many people accidentally put in wrong schema state
         * without the dev-mode plugin, so we need this check here
         * even in non-dev-mode.
         */
        if (!jsonSchema.properties[this.primaryPath].maxLength) {
            throw newRxError('SC39', { schema: jsonSchema });
        }

        this.finalFields = getFinalFields(this.jsonSchema);
    }

    public get version(): number {
        return this.jsonSchema.version;
    }

    public get defaultValues(): { [P in keyof RxDocType]: RxDocType[P] } {
        const values = {} as { [P in keyof RxDocType]: RxDocType[P] };
        Object
            .entries(this.jsonSchema.properties)
            .filter(([, v]) => Object.prototype.hasOwnProperty.call(v, 'default'))
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
    public get hash(): Promise<string> {
        return overwriteGetterForCaching(
            this,
            'hash',
            this.hashFunction(JSON.stringify(this.jsonSchema))
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
        const proto: any = {};

        /**
         * On the top level, we know all keys
         * and therefore do not have to create a new Proxy object
         * for each document. Instead we define the getter in the prototype once.
         */
        const pathProperties = getSchemaByObjectPath(
            this.jsonSchema,
            ''
        );
        Object.keys(pathProperties)
            .forEach(key => {
                const fullPath = key;

                // getter - value
                proto.__defineGetter__(
                    key,
                    function (this: RxDocument) {
                        if (!this.get || typeof this.get !== 'function') {
                            /**
                             * When an object gets added to the state of a vuejs-component,
                             * it happens that this getter is called with another scope.
                             * To prevent errors, we have to return undefined in this case
                             */
                            return undefined;
                        }
                        const ret = this.get(fullPath);
                        return ret;
                    }
                );
                // getter - observable$
                Object.defineProperty(proto, key + '$', {
                    get: function () {
                        return this.get$(fullPath);
                    },
                    enumerable: false,
                    configurable: false
                });
                // getter - reactivity$$
                Object.defineProperty(proto, key + '$$', {
                    get: function () {
                        return this.get$$(fullPath);
                    },
                    enumerable: false,
                    configurable: false
                });
                // getter - populate_
                Object.defineProperty(proto, key + '_', {
                    get: function () {
                        return this.populate(fullPath);
                    },
                    enumerable: false,
                    configurable: false
                });
            });

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
    hashFunction: HashFunction,
    runPreCreateHooks = true
): RxSchema<T> {
    if (runPreCreateHooks) {
        runPluginHooks('preCreateRxSchema', jsonSchema);
    }

    let useJsonSchema = fillWithDefaultSettings(jsonSchema);
    useJsonSchema = normalizeRxJsonSchema(useJsonSchema);
    overwritable.deepFreezeWhenDevMode(useJsonSchema);

    const schema = new RxSchema(useJsonSchema, hashFunction);
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
