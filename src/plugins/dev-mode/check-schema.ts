/**
 * does additional checks over the schema-json
 * to ensure nothing is broken or not supported
 */

import objectPath from 'object-path';
import {
    newRxError
} from '../../rx-error';
import type {
    RxJsonSchema
} from '../../types';
import {
    flattenObject,
    trimDots
} from '../../util';
import { rxDocumentProperties } from './entity-properties';

/**
 * checks if the fieldname is allowed
 * this makes sure that the fieldnames can be transformed into javascript-vars
 * and does not conquer the observe$ and populate_ fields
 * @throws {Error}
 */
export function checkFieldNameRegex(fieldName: string) {
    if (fieldName === '') return;
    if (fieldName === '_id') return;

    if (['properties', 'language'].includes(fieldName)) {
        throw newRxError('SC23', {
            fieldName
        });
    }

    const regexStr = '^[a-zA-Z](?:[[a-zA-Z0-9_]*]?[a-zA-Z0-9])?$';
    const regex = new RegExp(regexStr);
    if (!fieldName.match(regex)) {
        throw newRxError('SC1', {
            regex: regexStr,
            fieldName
        });
    }
}

/**
 * validate that all schema-related things are ok
 */
export function validateFieldsDeep(jsonSchema: any): true {
    function checkField(
        fieldName: string,
        schemaObj: any,
        path: string
    ) {
        if (
            typeof fieldName === 'string' &&
            typeof schemaObj === 'object' &&
            !Array.isArray(schemaObj)
        ) checkFieldNameRegex(fieldName);

        // 'item' only allowed it type=='array'
        if (schemaObj.hasOwnProperty('item') && schemaObj.type !== 'array') {
            throw newRxError('SC2', {
                fieldName
            });
        }

        /**
         * required fields cannot be set via 'required: true',
         * but must be set via required: []
         */
        if (schemaObj.hasOwnProperty('required') && typeof schemaObj.required === 'boolean') {
            throw newRxError('SC24', {
                fieldName
            });
        }


        // if ref given, must be type=='string', type=='array' with string-items or type==['string','null']
        if (schemaObj.hasOwnProperty('ref')) {
            if (Array.isArray(schemaObj.type)) {
                if (schemaObj.type.length > 2 || !schemaObj.type.includes('string') || !schemaObj.type.includes('null')) {
                    throw newRxError('SC4', {
                        fieldName
                    });
                }
            } else {
                switch (schemaObj.type) {
                    case 'string':
                        break;
                    case 'array':
                        if (!schemaObj.items || !schemaObj.items.type || schemaObj.items.type !== 'string') {
                            throw newRxError('SC3', {
                                fieldName
                            });
                        }
                        break;
                    default:
                        throw newRxError('SC4', {
                            fieldName
                        });
                }
            }
        }

        const isNested = path.split('.').length >= 2;

        // nested only
        if (isNested) {
            if (schemaObj.primary) {
                throw newRxError('SC6', {
                    path,
                    primary: schemaObj.primary
                });
            }

            if (schemaObj.default) {
                throw newRxError('SC7', {
                    path
                });
            }
        }

        // first level
        if (!isNested) {
            // check underscore fields
            if (fieldName.charAt(0) === '_') {
                if (fieldName === '_id' && schemaObj.primary) {
                    return;
                }
                throw newRxError('SC8', {
                    fieldName
                });
            }
        }
    }

    function traverse(currentObj: any, currentPath: any) {
        if (typeof currentObj !== 'object') return;
        Object.keys(currentObj).forEach(attributeName => {
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
        });
    }
    traverse(jsonSchema, '');
    return true;
}

/**
 * computes real path of the object path in the collection schema
 */
function getSchemaPropertyRealPath(shortPath: string) {
    const pathParts = shortPath.split('.');
    let realPath = '';
    for (let i = 0; i < pathParts.length; i += 1) {
        if (pathParts[i] !== '[]') {
            realPath = realPath.concat('.properties.'.concat(pathParts[i]));
        } else {
            realPath = realPath.concat('.items');
        }
    }
    return trimDots(realPath);
}

/**
 * does the checking
 * @throws {Error} if something is not ok
 */
export function checkSchema(jsonSchema: RxJsonSchema) {

    if (!jsonSchema.hasOwnProperty('properties')) {
        throw newRxError('SC29', {
            schema: jsonSchema
        });
    }

    // _rev MUST NOT exist, it is added by RxDB
    if (jsonSchema.properties._rev) {
        throw newRxError('SC10', {
            schema: jsonSchema
        });
    }

    // check version
    if (!jsonSchema.hasOwnProperty('version') ||
        typeof jsonSchema.version !== 'number' ||
        jsonSchema.version < 0
    ) {
        throw newRxError('SC11', {
            version: jsonSchema.version
        });
    }

    validateFieldsDeep(jsonSchema);

    let primaryPath: string;
    Object.keys(jsonSchema.properties).forEach(key => {
        const value: any = jsonSchema.properties[key];
        // check primary
        if (value.primary) {
            if (primaryPath) {
                throw newRxError('SC12', {
                    value
                });
            }

            primaryPath = key;

            if (value.index) {
                throw newRxError('SC13', {
                    value
                });
            }
            if (value.unique) {
                throw newRxError('SC14', {
                    value
                });
            }
            if (value.encrypted) {
                throw newRxError('SC15', {
                    value
                });
            }
            if (value.type !== 'string') {
                throw newRxError('SC16', {
                    value
                });
            }
        }

        // check if RxDocument-property
        if (rxDocumentProperties().includes(key)) {
            throw newRxError('SC17', {
                key
            });
        }
    });

    // check format of jsonSchema.indexes
    if (jsonSchema.indexes) {
        // should be an array
        if (!Array.isArray(jsonSchema.indexes)) {
            throw newRxError('SC18', {
                indexes: jsonSchema.indexes
            });
        }

        jsonSchema.indexes.forEach(index => {
            // should contain strings or array of strings
            if (!(typeof index === 'string' || Array.isArray(index))) {
                throw newRxError('SC19', { index });
            }
            // if is a compound index it must contain strings
            if (Array.isArray(index)) {
                for (let i = 0; i < index.length; i += 1) {
                    if (typeof index[i] !== 'string') {
                        throw newRxError('SC20', { index });
                    }
                }
            }
        });
    }

    /**
     * TODO
     * this check has to exist only in beta-version, to help developers migrate their schemas
     */
    // remove backward-compatibility for compoundIndexes
    if (Object.keys(jsonSchema).includes('compoundIndexes')) {
        throw newRxError('SC25');
    }

    // remove backward-compatibility for index: true
    Object.keys(flattenObject(jsonSchema))
        .map(key => {
            // flattenObject returns only ending paths, we need all paths pointing to an object
            const splitted = key.split('.');
            splitted.pop(); // all but last
            return splitted.join('.');
        })
        .filter(key => key !== '')
        .filter((elem, pos, arr) => arr.indexOf(elem) === pos) // unique
        .filter(key => { // check if this path defines an index
            const value = objectPath.get(jsonSchema, key);
            return !!value.index;
        })
        .forEach(key => { // replace inner properties
            key = key.replace('properties.', ''); // first
            key = key.replace(/\.properties\./g, '.'); // middle
            throw newRxError('SC26', {
                index: trimDots(key)
            });
        });

    /* check types of the indexes */
    (jsonSchema.indexes || [])
        .reduce((indexPaths: string[], currentIndex) => {
            if (Array.isArray(currentIndex)) {
                indexPaths.concat(currentIndex);
            } else {
                indexPaths.push(currentIndex);
            }
            return indexPaths;
        }, [])
        .filter((elem, pos, arr) => arr.indexOf(elem) === pos) // from now on working only with unique indexes
        .map(indexPath => {
            const realPath = getSchemaPropertyRealPath(indexPath); // real path in the collection schema
            const schemaObj = objectPath.get(jsonSchema, realPath); // get the schema of the indexed property
            if (!schemaObj || typeof schemaObj !== 'object') {
                throw newRxError('SC21', { index: indexPath });
            }
            return { indexPath, schemaObj };
        })
        .filter(index =>
            index.schemaObj.type !== 'string' &&
            index.schemaObj.type !== 'integer' &&
            index.schemaObj.type !== 'number'
        )
        .forEach(index => {
            throw newRxError('SC22', {
                key: index.indexPath,
                type: index.schemaObj.type
            });
        });


    /**
     * TODO
     * in 9.0.0 we changed the way encrypted fields are defined
     * This check ensures people do not oversee the breaking change
     * Remove this check in the future
     */
    Object.keys(flattenObject(jsonSchema))
        .map(key => {
            // flattenObject returns only ending paths, we need all paths pointing to an object
            const splitted = key.split('.');
            splitted.pop(); // all but last
            return splitted.join('.');
        })
        .filter(key => key !== '' && key !== 'attachments')
        .filter((elem, pos, arr) => arr.indexOf(elem) === pos) // unique
        .filter(key => {
            // check if this path defines an encrypted field
            const value = objectPath.get(jsonSchema, key);
            return !!value.encrypted;
        })
        .forEach(key => { // replace inner properties
            key = key.replace('properties.', ''); // first
            key = key.replace(/\.properties\./g, '.'); // middle
            throw newRxError('SC27', {
                index: trimDots(key)
            });
        });

    /* ensure encrypted fields exist in the schema */
    if (jsonSchema.encrypted) {
        jsonSchema.encrypted
            .forEach(propPath => {
                // real path in the collection schema
                const realPath = getSchemaPropertyRealPath(propPath);
                // get the schema of the indexed property
                const schemaObj = objectPath.get(jsonSchema, realPath);
                if (!schemaObj || typeof schemaObj !== 'object') {
                    throw newRxError('SC28', { field: propPath });
                }
            });
    }
}
