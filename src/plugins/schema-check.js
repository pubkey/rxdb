/**
 * does additional checks over the schema-json
 * to ensure nothing is broken or not supported
 */

import objectPath from 'object-path';

import RxDocument from '../rx-document';
import RxError from '../rx-error';
import {
    getIndexes
} from '../rx-schema';

/**
 * checks if the fieldname is allowed
 * this makes sure that the fieldnames can be transformed into javascript-vars
 * and does not conquer the observe$ and populate_ fields
 * @param  {string} fieldName
 * @throws {Error}
 */
export function checkFieldNameRegex(fieldName) {
    if (fieldName === '') return;

    if (['properties', 'language'].includes(fieldName)) {
        throw RxError.newRxError('SC23', {
            fieldName
        });
    }

    const regexStr = '^[a-zA-Z][[a-zA-Z0-9_]*]?[a-zA-Z0-9]$';
    const regex = new RegExp(regexStr);
    if (!fieldName.match(regex)) {
        throw RxError.newRxError('SC1', {
            regex: regexStr,
            fieldName
        });
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
            typeof fieldName === 'string' &&
            typeof schemaObj === 'object' &&
            !Array.isArray(schemaObj)
        ) checkFieldNameRegex(fieldName);

        // 'item' only allowed it type=='array'
        if (schemaObj.hasOwnProperty('item') && schemaObj.type !== 'array') {
            throw RxError.newRxError('SC2', {
                fieldName
            });
        }

        // if ref given, must be type=='string' or type=='array' with string-items
        if (schemaObj.hasOwnProperty('ref')) {
            switch (schemaObj.type) {
                case 'string':
                    break;
                case 'array':
                    if (!schemaObj.items || !schemaObj.items.type || schemaObj.items.type !== 'string') {
                        throw RxError.newRxError('SC3', {
                            fieldName
                        });
                    }
                    break;
                default:
                    throw RxError.newRxError('SC4', {
                        fieldName
                    });
                    break;
            }
        }

        // if primary is ref, throw
        if (schemaObj.hasOwnProperty('ref') && schemaObj.primary) {
            throw RxError.newRxError('SC5', {
                fieldName
            });
        }


        const isNested = path.split('.').length >= 2;

        // nested only
        if (isNested) {
            if (schemaObj.primary) {
                throw RxError.newRxError('SC6', {
                    path,
                    primary: schemaObj.primary
                });
            }

            if (schemaObj.default) {
                throw RxError.newRxError('SC7', {
                    path
                });
            }
        }

        // first level
        if (!isNested) {
            // check underscore fields
            if (fieldName.charAt(0) === '_') {
                throw RxError.newRxError('SC8', {
                    fieldName
                });
            }
        }
    }

    function traverse(currentObj, currentPath) {
        if (typeof currentObj !== 'object') return;
        for (const attributeName in currentObj) {
            if (!currentObj.properties) {
                checkField(
                    attributeName,
                    currentObj[attributeName],
                    currentPath
                );
            }
            let nextPath = currentPath;
            if (attributeName !== 'properties') nextPath = nextPath + '.' + attributeName;
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
    if (jsonID.properties._id) {
        throw RxError.newRxError('SC9', {
            schema: jsonID
        });
    }

    // check _rev
    if (jsonID.properties._rev) {
        throw RxError.newRxError('SC10', {
            schema: jsonID
        });
    }

    // check version
    if (!jsonID.hasOwnProperty('version') ||
        typeof jsonID.version !== 'number' ||
        jsonID.version < 0
    ) {
        throw RxError.newRxError('SC11', {
            version: jsonID.version
        });
    }

    validateFieldsDeep(jsonID);

    let primaryPath;
    Object.keys(jsonID.properties).forEach(key => {
        const value = jsonID.properties[key];
        // check primary
        if (value.primary) {
            if (primaryPath) {
                throw RxError.newRxError('SC12', {
                    value
                });
            }

            primaryPath = key;

            if (value.index) {
                throw RxError.newRxError('SC13', {
                    value
                });
            }
            if (value.unique) {
                throw RxError.newRxError('SC14', {
                    value
                });
            }
            if (value.encrypted) {
                throw RxError.newRxError('SC15', {
                    value
                });
            }
            if (value.type !== 'string') {
                throw RxError.newRxError('SC16', {
                    value
                });
            }
        }

        // check if RxDocument-property
        if (RxDocument.properties().includes(key)) {
            throw RxError.newRxError('SC17', {
                key
            });
        }
    });

    // check format of jsonID.compoundIndexes
    if (jsonID.compoundIndexes) {
        if (!Array.isArray(jsonID.compoundIndexes)) {
            throw RxError.newRxError('SC18', {
                compoundIndexes: jsonID.compoundIndexes
            });
        }
        jsonID.compoundIndexes.forEach(ar => {
            if (!Array.isArray(ar)) {
                throw RxError.newRxError('SC19', {
                    compoundIndexes: jsonID.compoundIndexes
                });
            }

            ar.forEach(str => {
                if (typeof str !== 'string') {
                    throw RxError.newRxError('SC20', {
                        compoundIndexes: jsonID.compoundIndexes
                    });
                }
            });
        });
    }

    // check that indexes are string or number
    getIndexes(jsonID)
        .reduce((a, b) => a.concat(b), [])
        .filter((elem, pos, arr) => arr.indexOf(elem) === pos) // unique
        .map(key => {
            const schemaObj = objectPath.get(jsonID, 'properties.' + key.replace('.', '.properties.'));
            if (!schemaObj || typeof schemaObj !== 'object') {
                throw RxError.newRxError('SC21', {
                    key
                });
            }
            return {
                key,
                schemaObj
            };
        })
        .filter(index =>
            index.schemaObj.type !== 'string' &&
            index.schemaObj.type !== 'integer' &&
            index.schemaObj.type !== 'number'
        )
        .forEach(index => {
            throw RxError.newRxError('SC22', {
                key: index.key,
                type: index.schemaObj.type
            });
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
