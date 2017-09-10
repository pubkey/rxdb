/**
 * does additional checks over the schema-json
 * to ensure nothing is broken or not supported
 */

import objectPath from 'object-path';

import RxDocument from '../rx-document';
import { getIndexes } from '../rx-schema';

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
};

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

            if (schemaObj.default)
                throw new Error('default-values can only be defined at top-level');
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
};


/**
 * does the checking
 * @param  {object} jsonId json-object like in json-schema-standard
 * @throws {Error} if something is not ok
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
};





export const rxdb = true;
export const hooks = {
    preCreateRxSchema: checkSchema
};


export default {
    rxdb,
    hooks
};
