import objectPath from 'object-path';
import deepEqual from 'deep-equal';

import {
    clone,
    hash,
    sortObject,
    trimDots,
    flattenObject,
    pluginMissing
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
    public compoundIndexes: string[] | string[][];
    public indexes: string[][];
    public primaryPath: keyof T;
    public finalFields: string[];

    constructor(
        public readonly jsonID: RxJsonSchema<T>
    ) {
        this.compoundIndexes = this.jsonID.compoundIndexes as any;
        this.indexes = getIndexes(this.jsonID);

        // primary is always required
        this.primaryPath = getPrimary(this.jsonID);
        if (this.primaryPath) {
            (this.jsonID as any).required.push(this.primaryPath);
        }

        // final fields are always required
        this.finalFields = getFinalFields(this.jsonID);
        this.jsonID.required = (this.jsonID as any).required
            .concat(this.finalFields)
            .filter((elem: any, pos: any, arr: any) => arr.indexOf(elem) === pos); // unique;

        // add primary to schema if not there (if _id)
        if (!this.jsonID.properties[this.primaryPath]) {
            this.jsonID.properties[this.primaryPath] = {
                type: 'string',
                minLength: 1
            };
        }
    }

    public get version(): number {
        return this.jsonID.version;
    }

    get crypt(): boolean {
        if (!this._crypt)
            this._crypt = hasCrypt(this.jsonID);
        return this._crypt;
    }
    get normalized(): RxJsonSchema {
        if (!this._normalized)
            this._normalized = normalize(this.jsonID);
        return this._normalized;
    }

    public get topLevelFields(): (keyof T)[] {
        return Object.keys(this.normalized.properties) as (keyof T)[];
    }
    public get defaultValues(): { [P in keyof T]: T[P] } {
        if (!this._defaultValues) {
            this._defaultValues = {} as { [P in keyof T]: T[P] };
            Object
                .entries(this.normalized.properties)
                .filter(([, v]) => v.hasOwnProperty('default'))
                .forEach(([k, v]) => (this._defaultValues as any)[k] = (v as any).default);
        }
        return this._defaultValues;
    }
    get encryptedPaths() {
        if (!this._encryptedPaths)
            this._encryptedPaths = getEncryptedPaths(this.jsonID);
        return this._encryptedPaths;
    }
    public get hash(): string {
        if (!this._hash)
            this._hash = hash(this.normalized);
        return this._hash;
    }

    /**
     * true if schema contains at least one encrypted path
     */
    private _crypt?: boolean;

    public _normalized?: RxJsonSchema;

    private _defaultValues?: { [P in keyof T]: T[P] };

    /**
     * get all encrypted paths
     */
    private _encryptedPaths?: { [k: string]: JsonSchema };


    private _hash?: string;

    /**
     * creates the schema-based document-prototype,
     * see RxCollection.getDocumentPrototype()
     */
    private _getDocumentPrototype?: any;

    public getSchemaByObjectPath(path: string): JsonSchema {
        let usePath: string = path as string;
        usePath = usePath.replace(/\./g, '.properties.');
        usePath = 'properties.' + usePath;
        usePath = trimDots(usePath);

        const ret = objectPath.get(this.jsonID, usePath);
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
        if (this.primaryPath === '_id' || obj[this.primaryPath]) return obj;
        obj[this.primaryPath] = obj._id;
        delete obj._id;
        return obj;
    }
    swapPrimaryToId(obj: any): any {
        if (this.primaryPath === '_id') return obj;
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
        return this.jsonID.keyCompression as boolean;
    }
    public getDocumentPrototype() {
        if (!this._getDocumentPrototype) {
            const proto = {};
            defineGetterSetter(this, proto, '');
            this._getDocumentPrototype = proto;
        }
        return this._getDocumentPrototype;
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
    if (Object.keys(paths).length > 0) return true;
    else return false;
}


export function getIndexes<T = any>(
    jsonID: RxJsonSchema<T>
): string[][] {
    const flattened = flattenObject(jsonID);
    const keys = Object.keys(flattened);
    let indexes = keys
        // flattenObject returns only ending paths, we need all paths pointing to an object
        .map(key => {
            const splitted = key.split('.');
            splitted.pop(); // all but last
            return splitted.join('.');
        })
        .filter(key => key !== '')
        .filter((elem, pos, arr) => arr.indexOf(elem) === pos) // unique
        .filter(key => { // check if this path defines an index
            const value = objectPath.get(jsonID, key);
            if (value.index) return true;
            else return false;
        })
        .map(key => { // replace inner properties
            key = key.replace('properties.', ''); // first
            key = key.replace(/\.properties\./g, '.'); // middle
            return [trimDots(key)];
        });

    // add compound-indexes
    const addCompound = jsonID.compoundIndexes || [];
    indexes = indexes.concat(addCompound);

    return indexes as any;
}

/**
 * returns the primary path of a jsonschema
 * @return primaryPath which is _id if none defined
 */
export function getPrimary<T = any>(jsonID: RxJsonSchema<T>): keyof T {
    const ret = Object.keys(jsonID.properties)
        .filter(key => (jsonID as any).properties[key].primary)
        .shift();
    if (!ret) return '_id' as keyof T;
    else return ret as keyof T;
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
    jsonID: RxJsonSchema<T>
): string[] {
    const ret = Object.keys(jsonID.properties)
        .filter(key => (jsonID as any).properties[key].final);

    // primary is also final
    ret.push(getPrimary<T>(jsonID) as any);
    return ret;
}


/**
 * orders the schemas attributes by alphabetical order
 * @return jsonSchema - ordered
 */
export function normalize(jsonSchema: RxJsonSchema): RxJsonSchema {
    return sortObject(
        clone(jsonSchema)
    );
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

    // compoundIndexes must be array
    schemaObj.compoundIndexes = schemaObj.compoundIndexes || [];

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
    jsonID: RxJsonSchema,
    runPreCreateHooks = true
): RxSchema<T> {
    if (runPreCreateHooks)
        runPluginHooks('preCreateRxSchema', jsonID);
    const schema = new RxSchema(fillWithDefaultSettings(jsonID));
    runPluginHooks('createRxSchema', schema);
    return schema;
}

export function isInstanceOf(obj: any): boolean {
    return obj instanceof RxSchema;
}
