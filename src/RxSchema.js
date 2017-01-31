import {
    default as objectPath
} from 'object-path';
import {
    default as clone
} from 'clone';

import * as util from './util';
import * as RxDocument from './RxDocument';

class RxSchema {
    constructor(jsonID) {
        this.jsonID = jsonID;

        this.compoundIndexes = this.jsonID.compoundIndexes;
        delete this.jsonID.compoundIndexes;

        // make indexes required
        this.indexes = getIndexes(this.jsonID);
        this.indexes.map(indexAr => {
            indexAr
                .filter(index => !this.jsonID.required.includes(index))
                .forEach(index => this.jsonID.required.push(index));
        });

        // primary is always required
        this.primaryPath = getPrimary(this.jsonID);
        if (this.primaryPath)
            this.jsonID.required.push(this.primaryPath);

        // add primary to schema if not there (if _id)
        if (!this.jsonID.properties[this.primaryPath]) {
            this.jsonID.properties[this.primaryPath] = {
                type: 'string',
                minLength: 1
            };
        }

        this.encryptedPaths;
    }

    get version() {
        return this.jsonID.version;
    }

    /**
     * @return {number[]} array with previous version-numbers
     */
    get previousVersions() {
        let c = 0;
        return new Array(this.version)
            .fill(0)
            .map(() => c++);
    }

    /**
     * true if schema contains at least one encrypted path
     * @type {boolean}
     */
    get crypt() {
        if (!this._crypt)
            this._crypt = hasCrypt(this.jsonID);
        return this._crypt;
    }

    get normalized() {
        if (!this._normalized)
            this._normalized = normalize(this.jsonID);
        return this._normalized;
    }

    getSchemaByObjectPath(path) {
        path = path.replace(/\./g, '.properties.');
        path = 'properties.' + path;
        path = util.trimDots(path);

        const ret = objectPath.get(this.jsonID, path);
        return ret;
    }

    /**
     * get all encrypted paths
     * TODO use getter
     */
    getEncryptedPaths() {
        if (!this.encryptedPaths) this.encryptedPaths = getEncryptedPaths(this.jsonID);
        return this.encryptedPaths;
    }

    /**
     * validate if the obj matches the schema
     * @param {Object} obj
     * @param {Object} schemaObj json-schema
     * @param {Object} obj equal to input-obj
     */
    validate(obj, schemaObj) {
        schemaObj = schemaObj || this.jsonID;
        util.jsonSchemaValidate(schemaObj, obj);
        return obj;
    }

    hash() {
        // TODO use getter for hash and cache
        return util.hash(this.normalized);
    }

    swapIdToPrimary(obj) {
        if (this.primaryPath == '_id' || obj[this.primaryPath]) return obj;
        obj[this.primaryPath] = obj._id;
        delete obj._id;
        return obj;
    }
    swapPrimaryToId(obj) {
        if (this.primaryPath == '_id') return obj;
        obj._id = obj[this.primaryPath];
        delete obj[this.primaryPath];
        return obj;
    }

    /**
     * returns true if key-compression should be done
     */
    doKeyCompression() {
        return !!!this.jsonID.disableKeyCompression;
    }

}

/**
 * returns all encrypted paths of the schema
 * @param  {Object} jsonSchema [description]
 * @return {Object} with paths as attr and schema as value
 */
export function getEncryptedPaths(jsonSchema) {
    const ret = {};

    function traverse(currentObj, currentPath) {
        if (typeof currentObj !== 'object') return;
        if (currentObj.encrypted) {
            ret[currentPath.substring(1)] = currentObj;
            return;
        }
        for (let attributeName in currentObj) {
            let nextPath = currentPath;
            if (attributeName != 'properties') nextPath = nextPath + '.' + attributeName;
            traverse(currentObj[attributeName], nextPath);
        }
    }
    traverse(jsonSchema, '');
    return ret;
}

/**
 * returns true if schema contains an encrypted field
 * @param  {object} jsonSchema with schema
 * @return {boolean} isEncrypted
 */
export function hasCrypt(jsonSchema) {
    const paths = getEncryptedPaths(jsonSchema);
    if (Object.keys(paths).length > 0) return true;
    else return false;
}


export function getIndexes(jsonID) {
    return Object.keys(jsonID.properties)
        .filter(key => jsonID.properties[key].index)
        .map(key => [key])
        .concat(jsonID.compoundIndexes || [])
        .filter((elem, pos, arr) => arr.indexOf(elem) == pos); // unique
}

/**
 * returns the primary path of a jsonschema
 * @param {Object} jsonID
 * @return {string} primaryPath which is _id if none defined
 */
export function getPrimary(jsonID) {
    const ret = Object.keys(jsonID.properties)
        .filter(key => jsonID.properties[key].primary)
        .shift();
    if (!ret) return '_id';
    else return ret;
}


/**
 * validate that all schema-related things are ok
 * @param  {object} jsonSchema
 * @return {boolean} true always
 */
export function validateFieldsDeep(jsonSchema) {

    function checkField(fieldName, schemaObj, path) {
        // all
        if (['properties', 'language'].includes(fieldName))
            throw new Error(`fieldname is not allowed: ${fieldName}`);
        if (fieldName.includes('.'))
            throw new Error(`field-names cannot contain dots: ${fieldName}`);

        if (fieldName.includes('$'))
            throw new Error(`field-names cannot contain $-char: ${fieldName}`);

        // 'item' only allowed it type=='array'
        if (schemaObj.hasOwnProperty('item') && schemaObj.type != 'array')
            throw new Error(`name 'item' reserved for array-fields: ${fieldName}`);


        const isNested = path.split('.').length >= 2;
        // nested only
        if (isNested) {
            if (schemaObj.primary)
                throw new Error('primary can only be defined at top-level');
            if (schemaObj.index)
                throw new Error('index can only be defined at top-level');
        }
        // first level
        if (!isNested) {
            // check underscore fields
            if (fieldName.charAt(0) == '_')
                throw new Error(`first level-fields cannot start with underscore _ ${fieldName}`);
        }
    }

    function traverse(currentObj, currentPath) {
        if (typeof currentObj !== 'object') return;
        for (let attributeName in currentObj) {
            if (!currentObj.properties) {
                checkField(
                    attributeName,
                    currentObj[attributeName],
                    currentPath
                );
            }
            let nextPath = currentPath;
            if (attributeName != 'properties') nextPath = nextPath + '.' + attributeName;
            traverse(currentObj[attributeName], nextPath);
        }
    }
    traverse(jsonSchema, '');
    return true;
}

/**
 * check if the given schemaJSON is useable for the database
 */
export function checkSchema(jsonID) {

    // check _id
    if (jsonID.properties._id)
        throw new Error('schema defines ._id, this will be done automatically');

    // check _rev
    if (jsonID.properties._rev)
        throw new Error('schema defines ._rev, this will be done automatically');

    // check version
    if (!jsonID.hasOwnProperty('version') ||
        typeof jsonID.version !== 'number' ||
        jsonID.version < 0
    ) throw new Error(`schema need an number>=0 as version; given: ${jsonID.version}`);


    validateFieldsDeep(jsonID);

    let primaryPath;
    Object.keys(jsonID.properties).forEach(key => {
        const value = jsonID.properties[key];
        // check primary
        if (value.primary) {
            if (primaryPath)
                throw new Error('primary can only be defined once');

            primaryPath = key;

            if (value.index)
                throw new Error('primary is always index, do not declare it as index');
            if (value.unique)
                throw new Error('primary is always unique, do not declare it as unique');
            if (value.encrypted)
                throw new Error('primary cannot be encrypted');
            if (value.type !== 'string')
                throw new Error('primary must have type: string');
        }

        // check if RxDocument-property
        if (RxDocument.properties().includes(key))
            throw new Error(`top-level fieldname is not allowed: ${key}`);
    });

    if (primaryPath && jsonID && jsonID.required && jsonID.required.includes(primaryPath))
        throw new Error('primary is always required, do not declare it as required');


    // check format of jsonID.compoundIndexes
    if (jsonID.compoundIndexes) {
        try {
            /**
             * TODO do not validate via jsonschema here so that the validation
             * can be a seperate, optional module to decrease build-size
             */
            util.jsonSchemaValidate({
                type: 'array',
                items: {
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                }
            }, jsonID.compoundIndexes);
        } catch (e) {
            throw new Error('schema.compoundIndexes must be array<array><string>');
        }
    }

    // check that indexes are string
    getIndexes(jsonID)
        .reduce((a, b) => a.concat(b), [])
        .filter((elem, pos, arr) => arr.indexOf(elem) == pos) // unique
        .filter(indexKey =>
            jsonID.properties[indexKey].type != 'string' &&
            jsonID.properties[indexKey].type != 'integer'
        )
        .forEach(indexKey => {
            throw new Error(
                `given indexKey (${indexKey}) is not type:string but
                ${jsonID.properties[indexKey].type}`
            );
        });
}

/**
 * orders the schemas attributes by alphabetical order
 * @param {Object} jsonSchema
 * @return {Object} jsonSchema - ordered
 */
export function normalize(jsonSchema) {
    return util.sortObject(
        clone(jsonSchema)
    );
}

/**
 * fills the schema-json with default-values
 * @param  {Object} schemaObj
 * @return {Object} cloned schemaObj
 */
const fillWithDefaults = function(schemaObj) {
    schemaObj = clone(schemaObj);

    // additionalProperties is always false
    schemaObj.additionalProperties = false;

    // fill with key-compression-state ()
    if (!schemaObj.hasOwnProperty('disableKeyCompression'))
        schemaObj.disableKeyCompression = false;

    // compoundIndexes must be array
    schemaObj.compoundIndexes = schemaObj.compoundIndexes || [];

    // required must be array
    schemaObj.required = schemaObj.required || [];

    // add _rev
    schemaObj.properties._rev = {
        type: 'string',
        minLength: 1
    };

    // version is 0 by default
    schemaObj.version = schemaObj.version || 0;

    return schemaObj;
};

export function create(jsonID) {
    checkSchema(jsonID);
    return new RxSchema(fillWithDefaults(jsonID));
}
