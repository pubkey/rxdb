import deepEqual from 'fast-deep-equal';
import objectPath from 'object-path';

import {
    clone,
    hash,
    sortObject,
    overwriteGetterForCaching,
    flatClone, isMaybeReadonlyArray
} from './util';
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
    CompositePrimaryKey,
    DeepMutable,
    DeepReadonly, MaybeReadonly,
    PrimaryKey,
    RxJsonSchema
} from './types';

export class RxSchema<T = any> {
    public indexes: MaybeReadonly<string[]>[];
    public primaryPath: keyof T;
    public finalFields: string[];

    constructor(
        public readonly jsonSchema: RxJsonSchema<T>
    ) {
        this.indexes = getIndexes(this.jsonSchema);

        // primary is always required
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.jsonSchema.primaryKey);

        // final fields are always required
        this.finalFields = getFinalFields(this.jsonSchema);

        this.jsonSchema.required = (this.jsonSchema as any).required
            .concat(this.finalFields)
            .filter((field: string) => !field.includes('.'))
            .filter((elem: any, pos: any, arr: any) => arr.indexOf(elem) === pos); // unique;
    }

    public get version(): number {
        return this.jsonSchema.version;
    }

    get normalized(): RxJsonSchema<T> {
        return overwriteGetterForCaching(
            this,
            'normalized',
            normalizeRxJsonSchema(this.jsonSchema)
        );
    }

    public get topLevelFields(): (keyof T)[] {
        return Object.keys(this.normalized.properties) as (keyof T)[];
    }

    public get defaultValues(): { [P in keyof T]: T[P] } {
        const values = {} as { [P in keyof T]: T[P] };
        Object
            .entries(this.normalized.properties)
            .filter(([, v]) => (v as any).hasOwnProperty('default'))
            .forEach(([k, v]) => (values as any)[k] = (v as any).default);
        return overwriteGetterForCaching(
            this,
            'defaultValues',
            values
        );
    }

    /**
        * true if schema contains at least one encrypted path
        */
    get crypt(): boolean {
        if (
            !!this.jsonSchema.encrypted && this.jsonSchema.encrypted.length > 0 ||
            this.jsonSchema.attachments && this.jsonSchema.attachments.encrypted
        ) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * get all encrypted paths
     */
    get encryptedPaths(): string[] {
        return this.jsonSchema.encrypted || [];
    }

    /**
     * @overrides itself on the first call
     */
    public get hash(): string {
        return overwriteGetterForCaching(
            this,
            'hash',
            hash(this.normalized)
        );
    }

    /**
     * checks if a given change on a document is allowed
     * Ensures that:
     * - primary is not modified
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
     * validate if the obj matches the schema
     * @overwritten by plugin (required)
     * @param schemaPath if given, validates agains deep-path of schema
     * @throws {Error} if not valid
     * @param obj equal to input-obj
     */
    public validate(_obj: any, _schemaPath?: string): void {
        /**
         * This method might be overwritten by a validation plugin,
         * otherwise do nothing.
         */
    }

    /**
     * fills all unset fields with default-values if set
     */
    fillObjectWithDefaults(obj: any): any {
        obj = flatClone(obj);
        Object
            .entries(this.defaultValues)
            .filter(([k]) => !obj.hasOwnProperty(k) || typeof obj[k] === 'undefined')
            .forEach(([k, v]) => obj[k] = v);
        return obj;
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
        documentData: Partial<T>
    ): string {
        return getComposedPrimaryKeyOfDocumentData(
            this.jsonSchema,
            documentData
        );
    }

    fillPrimaryKey(
        documentData: T
    ): T {
        const cloned = flatClone(documentData);
        const newPrimary = getComposedPrimaryKeyOfDocumentData<T>(
            this.jsonSchema,
            documentData
        );
        const existingPrimary: string | undefined = documentData[this.primaryPath] as any;
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
                    schema: this.jsonSchema
                });
        }

        (cloned as any)[this.primaryPath] = newPrimary;
        return cloned;
    }

}

export function getIndexes<T = any>(
    jsonSchema: RxJsonSchema<T>
): MaybeReadonly<string[]>[] {
    return (jsonSchema.indexes || []).map(index => isMaybeReadonlyArray(index) ? index : [index]);
}

export function getPrimaryFieldOfPrimaryKey<RxDocType>(
    primaryKey: PrimaryKey<RxDocType>
): keyof RxDocType {
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
    jsonSchema: RxJsonSchema<RxDocType>,
    documentData: Partial<RxDocType>
): string {
    if (typeof jsonSchema.primaryKey === 'string') {
        return (documentData as any)[jsonSchema.primaryKey];
    }

    const compositePrimary: CompositePrimaryKey<RxDocType> = jsonSchema.primaryKey as any;
    return compositePrimary.fields.map(field => {
        const value = objectPath.get(documentData as any, field as string);
        if (typeof value === 'undefined') {
            throw newRxError('DOC18', { args: { field, documentData } });
        }
        return value;
    }).join(compositePrimary.separator);
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
    ret.push(primaryPath as string);

    // fields of composite primary are final
    if (typeof jsonSchema.primaryKey !== 'string') {
        (jsonSchema.primaryKey as CompositePrimaryKey<T>).fields
            .forEach(field => ret.push(field as string));
    }

    return ret;
}

/**
 * Normalize the RxJsonSchema.
 * We need this to ensure everything is set up properly
 * and we have the same hash on schemas that represent the same value but
 * have different json.
 * 
 * - Orders the schemas attributes by alphabetical order
 * - Adds the primaryKey to all indexes that do not contain the primaryKey
 *   - We need this for determinstic sort order on all queries, which is required for event-reduce to work.
 *
 * @return RxJsonSchema - ordered and filled
 */
export function normalizeRxJsonSchema<T>(jsonSchema: RxJsonSchema<T>): RxJsonSchema<T> {
    const primaryPath: string = getPrimaryFieldOfPrimaryKey(jsonSchema.primaryKey) as string;
    const normalizedSchema: RxJsonSchema<T> = sortObject(clone(jsonSchema));

    // indexes must NOT be sorted because sort order is important here.
    if (jsonSchema.indexes) {
        normalizedSchema.indexes = Array.from(jsonSchema.indexes);
    }

    // primaryKey.fields must NOT be sorted because sort order is important here.
    if (
        typeof normalizedSchema.primaryKey === 'object' &&
        typeof jsonSchema.primaryKey === 'object'
    ) {
        normalizedSchema.primaryKey.fields = jsonSchema.primaryKey.fields;
    }


    /**
     * Add primary key to indexes that do not contain primaryKey.
     */
    if (normalizedSchema.indexes) {
        normalizedSchema.indexes = normalizedSchema.indexes.map(index => {
            const arIndex = isMaybeReadonlyArray(index) ? index : [index];
            if (!arIndex.includes(primaryPath)) {
                const modifiedIndex = arIndex.slice(0);
                modifiedIndex.push(primaryPath);
                return modifiedIndex;
            }
            return arIndex;
        });
    }


    return normalizedSchema;
}

/**
 * fills the schema-json with default-settings
 * @return cloned schemaObj
 */
export function fillWithDefaultSettings<T = any>(
    schemaObj: RxJsonSchema<T>
): RxJsonSchema<T> {
    // TODO we should not have to deep clone here
    // flat clone the nessescary parts instead.
    schemaObj = clone(schemaObj);

    // additionalProperties is always false
    schemaObj.additionalProperties = false;

    // fill with key-compression-state ()
    if (!schemaObj.hasOwnProperty('keyCompression')) {
        schemaObj.keyCompression = false;
    }

    // indexes must be array
    schemaObj.indexes = schemaObj.indexes || [];

    // required must be array
    schemaObj.required = schemaObj.required || [];

    // encrypted must be array
    schemaObj.encrypted = schemaObj.encrypted || [];



    /**
     * TODO we should not need to added the internal fields to the schema.
     * Better remove the before validation.
     */
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


    // version is 0 by default
    schemaObj.version = schemaObj.version || 0;

    return schemaObj;
}

export function createRxSchema<T>(
    jsonSchema: RxJsonSchema<T>,
    runPreCreateHooks = true
): RxSchema<T> {
    if (runPreCreateHooks) {
        runPluginHooks('preCreateRxSchema', jsonSchema);
    }
    const schema = new RxSchema(fillWithDefaultSettings(jsonSchema));
    runPluginHooks('createRxSchema', schema);
    return schema;
}

export function isInstanceOf(obj: any): boolean {
    return obj instanceof RxSchema;
}

/**
 * Used as helper function the generate the document type out of the schema via typescript.
 * @link https://github.com/pubkey/rxdb/discussions/3467
 */
export function toTypedRxJsonSchema<T extends DeepReadonly<RxJsonSchema<any>>>(schema: T): DeepMutable<T> {
    return schema as any;
}
