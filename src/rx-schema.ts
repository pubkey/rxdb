import objectPath from 'object-path';
import deepEqual from 'deep-equal';

import {
    clone,
    hash,
    sortObject,
    trimDots,
    pluginMissing,
    overwriteGetterForCaching
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

import {
    RxJsonSchema,
    JsonSchema
} from './types';

export class RxSchema<T = any> {
    public indexes: string[][];
    public primaryPath: string;
    public finalFields: string[];

    constructor(
        public readonly jsonSchema: RxJsonSchema<T>
    ) {
        this.indexes = getIndexes(this.jsonSchema);

        // primary is always required
        this.primaryPath = getPrimary(this.jsonSchema);
        if (this.primaryPath) {
            (this.jsonSchema as any).required.push(this.primaryPath);
        }

        // final fields are always required
        this.finalFields = getFinalFields(this.jsonSchema);
        this.jsonSchema.required = (this.jsonSchema as any).required
            .concat(this.finalFields)
            .filter((elem: any, pos: any, arr: any) => arr.indexOf(elem) === pos); // unique;

        // add primary to schema if not there (if _id)
        if (!(this.jsonSchema.properties as any)[this.primaryPath]) {
            (this.jsonSchema.properties as any)[this.primaryPath] = {
                type: 'string',
                minLength: 1
            };
        }
    }

    public get version(): number {
        return this.jsonSchema.version;
    }

    /**
     * true if schema contains at least one encrypted path
     * @overrides itself on the first call
     */
    get crypt(): boolean {
        return overwriteGetterForCaching(
            this,
            'crypt',
            hasCrypt(this.jsonSchema)
        );
    }
    get normalized(): RxJsonSchema<T> {
        return overwriteGetterForCaching(
            this,
            'normalized',
            normalize(this.jsonSchema)
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
     * get all encrypted paths
     * @overrides itself on the first call
     */
    get encryptedPaths(): { [k: string]: JsonSchema } {
        return overwriteGetterForCaching(
            this,
            'encryptedPaths',
            getEncryptedPaths(this.jsonSchema)
        );
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

    public getSchemaByObjectPath(path: string): JsonSchema {
        let usePath: string = path as string;
        usePath = usePath.replace(/\./g, '.properties.');
        usePath = 'properties.' + usePath;
        usePath = trimDots(usePath);

        const ret = objectPath.get(this.jsonSchema, usePath);
        return ret;
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
                    fieldName
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
        throw pluginMissing('validate');
    }

    /**
     * fills all unset fields with default-values if set
     */
    fillObjectWithDefaults(obj: any): any {
        obj = clone(obj);
        Object
            .entries(this.defaultValues)
            .filter(([k]) => !obj.hasOwnProperty(k) || typeof obj[k] === 'undefined')
            .forEach(([k, v]) => obj[k] = v);
        return obj;
    }

    swapIdToPrimary(obj: any): any {
        if (this.primaryPath === '_id' || obj[this.primaryPath]) {
            return obj;
        }
        obj[this.primaryPath] = obj._id;
        delete obj._id;
        return obj;
    }
    swapPrimaryToId(obj: any): any {
        if (this.primaryPath === '_id') {
            return obj;
        }
        const ret: any = {};
        Object
            .entries(obj)
            .forEach(entry => {
                const newKey = entry[0] === this.primaryPath ? '_id' : entry[0];
                ret[newKey] = entry[1];
            });
        return ret;
    }

    /**
     * returns true if key-compression should be done
     */
    doKeyCompression(): boolean {
        return this.jsonSchema.keyCompression as boolean;
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
}

/**
 * returns all encrypted paths of the schema
 */
export function getEncryptedPaths(jsonSchema: RxJsonSchema): { [k: string]: JsonSchema } {
    const ret: any = {};

    function traverse(currentObj: any, currentPath: string) {
        if (typeof currentObj !== 'object') return;
        if (currentObj.encrypted) {
            ret[currentPath.substring(1)] = currentObj;
            return;
        }
        Object.keys(currentObj).forEach(attributeName => {
            let nextPath = currentPath;
            if (attributeName !== 'properties') nextPath = nextPath + '.' + attributeName;
            traverse(currentObj[attributeName], nextPath);
        });
    }
    traverse(jsonSchema.properties, '');
    return ret;
}

/**
 * returns true if schema contains an encrypted field
 */
export function hasCrypt(jsonSchema: RxJsonSchema): boolean {
    const paths = getEncryptedPaths(jsonSchema);
    return Object.keys(paths).length > 0;
}


export function getIndexes<T = any>(
    jsonSchema: RxJsonSchema<T>
): string[][] {
    return (jsonSchema.indexes || []).map(index => Array.isArray(index) ? index : [index]);
}

/**
 * returns the primary path of a jsonschema
 * @return primaryPath which is _id if none defined
 */
export function getPrimary<T = any>(jsonSchema: RxJsonSchema<T>): string {
    const ret = Object.keys(jsonSchema.properties)
        .filter(key => (jsonSchema as any).properties[key].primary)
        .shift();
    if (!ret) return '_id';
    else return ret;
}

/**
 * array with previous version-numbers
 */
export function getPreviousVersions(schema: RxJsonSchema): number[] {
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
    ret.push(getPrimary<T>(jsonSchema) as any);
    return ret;
}

/**
 * orders the schemas attributes by alphabetical order
 * @return jsonSchema - ordered
 */
export function normalize(jsonSchema: RxJsonSchema): RxJsonSchema {
    const normalizedSchema: RxJsonSchema = sortObject(clone(jsonSchema));
    if (jsonSchema.indexes) {
        normalizedSchema.indexes = Array.from(jsonSchema.indexes); // indexes should remain unsorted
    }
    return normalizedSchema;
}

/**
 * fills the schema-json with default-settings
 * @return cloned schemaObj
 */
const fillWithDefaultSettings = function (
    schemaObj: RxJsonSchema
): RxJsonSchema {
    schemaObj = clone(schemaObj);

    // additionalProperties is always false
    schemaObj.additionalProperties = false;

    // fill with key-compression-state ()
    if (!schemaObj.hasOwnProperty('keyCompression'))
        schemaObj.keyCompression = false;

    // indexes must be array
    schemaObj.indexes = schemaObj.indexes || [];

    // required must be array
    schemaObj.required = schemaObj.required || [];

    // add _rev
    schemaObj.properties._rev = {
        type: 'string',
        minLength: 1
    };

    // add attachments
    schemaObj.properties._attachments = {
        type: 'object'
    };


    // version is 0 by default
    schemaObj.version = schemaObj.version || 0;

    return schemaObj;
};

export function createRxSchema<T = any>(
    jsonSchema: RxJsonSchema,
    runPreCreateHooks = true
): RxSchema<T> {
    if (runPreCreateHooks)
        runPluginHooks('preCreateRxSchema', jsonSchema);
    const schema = new RxSchema(fillWithDefaultSettings(jsonSchema));
    runPluginHooks('createRxSchema', schema);
    return schema;
}

export function isInstanceOf(obj: any): boolean {
    return obj instanceof RxSchema;
}
