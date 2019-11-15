/**
 * does additional checks over the schema-json
 * to ensure nothing is broken or not supported
 */

import objectPath from 'object-path';

import RxDocument from '../rx-document';
import {
    newRxError,
    newRxTypeError
} from '../rx-error';
import {
    getIndexes
} from '../rx-schema';
import {
    RxJsonSchema,
    KeyFunctionMap,
    NumberFunctionMap,
    RxCollectionCreator
} from '../types';
import {
    createWithConstructor as createRxDocumentWithConstructor,
    isInstanceOf as isRxDocument,
    properties as rxDocumentProperties
} from '../rx-document';
import {
    properties as rxCollectionProperties
} from '../rx-collection';
import {
    getPreviousVersions,
    RxSchema,
    createRxSchema
} from '../rx-schema';
import {flattenObject, trimDots} from '../util';

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


        // if ref given, must be type=='string' or type=='array' with string-items
        if (schemaObj.hasOwnProperty('ref')) {
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

        // if primary is ref, throw
        if (schemaObj.hasOwnProperty('ref') && schemaObj.primary) {
            throw newRxError('SC5', {
                fieldName
            });
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
 * computes real path of the index in the collection schema
 */
function getIndexRealPath(shortPath: string) {
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
export function checkSchema(jsonID: RxJsonSchema) {
    // check _rev
    if (jsonID.properties._rev) {
        throw newRxError('SC10', {
            schema: jsonID
        });
    }

    // check version
    if (!jsonID.hasOwnProperty('version') ||
        typeof jsonID.version !== 'number' ||
        jsonID.version < 0
    ) {
        throw newRxError('SC11', {
            version: jsonID.version
        });
    }

    validateFieldsDeep(jsonID);

    let primaryPath: string;
    Object.keys(jsonID.properties).forEach(key => {
        const value: any = jsonID.properties[key];
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
        if (RxDocument.properties().includes(key)) {
            throw newRxError('SC17', {
                key
            });
        }
    });

    // check format of jsonID.indexes
    if (jsonID.indexes) {
        // should be an array
        if (!Array.isArray(jsonID.indexes)) {
            throw newRxError('SC18', {
                indexes: jsonID.indexes
            });
        }

        jsonID.indexes.forEach(index => {
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

    /** TODO this check has to exist only in beta-version, to help developers migrate their schemas */
    // remove backward-compatibility for compoundIndexes
    if (Object.keys(jsonID).includes('compoundIndexes')) {
        throw newRxError('SC25');
    }
    // remove backward-compatibility for index: true
    Object.keys(flattenObject(jsonID))
        .map(key => {
            // flattenObject returns only ending paths, we need all paths pointing to an object
            const splitted = key.split('.');
            splitted.pop(); // all but last
            return splitted.join('.');
        })
        .filter(key => key !== '')
        .filter((elem, pos, arr) => arr.indexOf(elem) === pos) // unique
        .filter(key => { // check if this path defines an index
            const value = objectPath.get(jsonID, key);
            return !!value.index;
        })
        .forEach(key => { // replace inner properties
            key = key.replace('properties.', ''); // first
            key = key.replace(/\.properties\./g, '.'); // middle
            throw newRxError('SC26', {
                index: trimDots(key)
            });
        });

    (jsonID.indexes || [])
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
            const realPath = getIndexRealPath(indexPath); // real path in the collection schema
            const schemaObj = objectPath.get(jsonID, realPath); // get the schema of the indexed property
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
}


/**
 * checks if the given static methods are allowed
 * @throws if not allowed
 */
const checkOrmMethods = function (statics?: KeyFunctionMap) {
    if (!statics) {
        return;
    }
    Object
        .entries(statics)
        .forEach(([k, v]) => {
            if (typeof k !== 'string') {
                throw newRxTypeError('COL14', {
                    name: k
                });
            }

            if (k.startsWith('_')) {
                throw newRxTypeError('COL15', {
                    name: k
                });
            }

            if (typeof v !== 'function') {
                throw newRxTypeError('COL16', {
                    name: k,
                    type: typeof k
                });
            }

            if (rxCollectionProperties().includes(k) || rxDocumentProperties().includes(k)) {
                throw newRxError('COL17', {
                    name: k
                });
            }
        });
};

/**
 * checks if the migrationStrategies are ok, throws if not
 * @throws {Error|TypeError} if not ok
 */
function checkMigrationStrategies(
    schema: RxJsonSchema,
    migrationStrategies: NumberFunctionMap
): boolean {
    // migrationStrategies must be object not array
    if (
        typeof migrationStrategies !== 'object' ||
        Array.isArray(migrationStrategies)
    ) {
        throw newRxTypeError('COL11', {
            schema
        });
    }

    const previousVersions = getPreviousVersions(schema);

    // for every previousVersion there must be strategy
    if (
        previousVersions.length !== Object
            .keys(migrationStrategies).length
    ) {
        throw newRxError('COL12', {
            have: Object.keys(migrationStrategies),
            should: previousVersions
        });
    }

    // every strategy must have number as property and be a function
    previousVersions
        .map(vNr => ({
            v: vNr,
            s: migrationStrategies[(vNr + 1)]
        }))
        .filter(strat => typeof strat.s !== 'function')
        .forEach(strat => {
            throw newRxTypeError('COL13', {
                version: strat.v,
                type: typeof strat,
                schema
            });
        });

    return true;
}


export const rxdb = true;
export const hooks = {
    preCreateRxSchema: checkSchema,
    createRxCollection: (args: RxCollectionCreator) => {
        // check ORM-methods
        checkOrmMethods(args.statics);
        checkOrmMethods(args.methods);
        checkOrmMethods(args.attachments);

        // check migration strategies
        if (args.schema && args.migrationStrategies) {
            checkMigrationStrategies(
                args.schema,
                args.migrationStrategies
            );
        }
    }
};


export default {
    rxdb,
    hooks
};
