import {
    default as objectPath
} from 'object-path';
import {
    default as clone
} from 'clone';

const validator = require('is-my-json-valid');

import * as util from './util';
import * as RxDocument from './RxDocument';

class RxSchema {
    constructor(jsonID) {
        this.jsonID = jsonID;

        this.compoundIndexes = this.jsonID.compoundIndexes;

        // make indexes required
        this.indexes = getIndexes(this.jsonID);
        this.indexes.forEach(indexAr => {
            indexAr
                .filter(index => !this.jsonID.required.includes(index))
                .filter(index => !index.includes('.')) // TODO make them sub-required
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

    get topLevelFields() {
        return Object.keys(this.normalized.properties);
    }

    /**
     * get all encrypted paths
     */
    get encryptedPaths() {
        if (!this._encryptedPaths)
            this._encryptedPaths = getEncryptedPaths(this.jsonID);
        return this._encryptedPaths;
    }

    /**
     * validate if the obj matches the schema
     * @param {Object} obj
     * @param {string} schemaPath if given, validates agains deep-path of schema
     * @throws {Error} if not valid
     * @param {Object} obj equal to input-obj
     */
    validate(obj, schemaPath = '') {
        if (!this._validators)
            this._validators = {};

        if (!this._validators[schemaPath]) {
            const schemaPart = schemaPath == '' ? this.jsonID : this.getSchemaByObjectPath(schemaPath);

            if (!schemaPart) {
                throw new Error(JSON.stringify({
                    name: 'sub-schema not found',
                    error: 'does the field ' + schemaPath + ' exist in your schema?'
                }));
            }
            this._validators[schemaPath] = validator(schemaPart);
        }
        const useValidator = this._validators[schemaPath];
        const isValid = useValidator(obj);
        if (isValid) return obj;
        else {
            throw new Error(JSON.stringify({
                name: 'object does not match schema',
                errors: useValidator.errors,
                schemaPath,
                obj,
                schema: this.jsonID
            }));
        }
    }


    get hash() {
        if (!this._hash)
            this._hash = util.hash(this.normalized);
        return this._hash;
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


export function getIndexes(jsonID, prePath = '') {
    let indexes = [];
    Object.entries(jsonID).forEach(entry => {
        const key = entry[0];
        const obj = entry[1];
        const path = key == 'properties' ? prePath : util.trimDots(prePath + '.' + key);

        if (obj.index)
            indexes.push([path]);

        if (typeof obj === 'object' && !Array.isArray(obj)) {
            const add = getIndexes(obj, path);
            indexes = indexes.concat(add);
        }
    });

    if (prePath == '') {
        const addCompound = jsonID.compoundIndexes || [];
        indexes = indexes.concat(addCompound);
    }

    indexes = indexes
        .filter((elem, pos, arr) => arr.indexOf(elem) == pos); // unique;
    return indexes;
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
 * checks if the fieldname is allowed
 * this makes sure that the fieldnames can be transformed into javascript-vars
 * and does not conquer the observe$ and populate_ fields
 * @param  {string} fieldName
 * @throws {Error}
 */
export function checkFieldNameRegex(fieldName) {
    if (fieldName == '') return;

    if (['properties', 'language'].includes(fieldName))
        throw new Error(`fieldname is not allowed: ${fieldName}`);

    const regexStr = '^[a-zA-Z][[a-zA-Z0-9_]*]?[a-zA-Z0-9]$';
    const regex = new RegExp(regexStr);
    if (!fieldName.match(regex)) {
        throw new Error(`
        fieldnames must match the regex:
        - regex: ${regexStr}
        - fieldName: ${fieldName}
        `);
    }
}

/**
 * validate that all schema-related things are ok
 * @param  {object} jsonSchema
 * @return {boolean} true always
 */
export function validateFieldsDeep(jsonSchema) {

    function checkField(fieldName, schemaObj, path) {
        if (
            typeof fieldName == 'string' &&
            typeof schemaObj == 'object' &&
            !Array.isArray(schemaObj)
        ) checkFieldNameRegex(fieldName);

        // 'item' only allowed it type=='array'
        if (schemaObj.hasOwnProperty('item') && schemaObj.type != 'array')
            throw new Error(`name 'item' reserved for array-fields: ${fieldName}`);

        // if ref given, must be type=='string' or type=='array' with string-items
        if (schemaObj.hasOwnProperty('ref')) {
            switch (schemaObj.type) {
                case 'string':
                    break;
                case 'array':
                    if (!schemaObj.items || !schemaObj.items.type || schemaObj.items.type != 'string')
                        throw new Error(`fieldname ${fieldName} has a ref-array but items-type is not string`);
                    break;
                default:
                    throw new Error(`fieldname ${fieldName} has a ref but is not type string or array<string>`);
                    break;
            }
        }

        // if primary is ref, throw
        if (schemaObj.hasOwnProperty('ref') && schemaObj.primary)
            throw new Error(`fieldname ${fieldName} cannot be primary and ref at same time`);


        const isNested = path.split('.').length >= 2;

        // nested only
        if (isNested) {
            if (schemaObj.primary)
                throw new Error('primary can only be defined at top-level');
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
        let error = null;
        if (!Array.isArray(jsonID.compoundIndexes))
            throw new Error('compoundIndexes must be an array');
        jsonID.compoundIndexes.forEach(ar => {
            if (!Array.isArray(ar))
                throw new Error('compoundIndexes must contain arrays');

            ar.forEach(str => {
                if (typeof str !== 'string')
                    throw new Error('compoundIndexes.array must contains strings');
            });
        });
    }

    // check that indexes are string
    getIndexes(jsonID)
        .reduce((a, b) => a.concat(b), [])
        .filter((elem, pos, arr) => arr.indexOf(elem) == pos) // unique
        .map(key => {
            const schemaObj = objectPath.get(jsonID, 'properties.' + key.replace('.', '.properties.'));
            if (!schemaObj || typeof schemaObj !== 'object')
                throw new Error(`given index(${key}) is not defined in schema`);
            return {
                key,
                schemaObj
            };
        })
        .filter(index =>
            index.schemaObj.type != 'string' &&
            index.schemaObj.type != 'integer'
        )
        .forEach(index => {
            throw new Error(
                `given indexKey (${index.key}) is not type:string but
                ${index.schemaObj.type}`
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

export function create(jsonID, doCheck = true) {
    if (doCheck) checkSchema(jsonID);
    return new RxSchema(fillWithDefaults(jsonID));
}
