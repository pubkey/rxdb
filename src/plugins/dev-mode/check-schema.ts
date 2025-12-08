/**
 * does additional checks over the schema-json
 * to ensure nothing is broken or not supported
 */
import {
    newRxError
} from '../../rx-error.ts';
import {
    getPrimaryFieldOfPrimaryKey,
    getSchemaByObjectPath
} from '../../rx-schema-helper.ts';
import type {
    CompositePrimaryKey,
    JsonSchema,
    JsonSchemaTypes,
    RxJsonSchema,
    TopLevelProperty
} from '../../types/index.d.ts';
import {
    appendToArray,
    flattenObject, getProperty, isMaybeReadonlyArray,
    trimDots
} from '../../plugins/utils/index.ts';
import { rxDocumentProperties } from './entity-properties.ts';

/**
 * checks if the fieldname is allowed
 * this makes sure that the fieldnames can be transformed into javascript-vars
 * and does not conquer the observe$ and populate_ fields
 * @throws {Error}
 */
export function checkFieldNameRegex(fieldName: string) {
    if (fieldName === '_deleted') {
        return;
    }

    if (['properties'].includes(fieldName)) {
        throw newRxError('SC23', {
            fieldName
        });
    }

    const regexStr = '^[a-zA-Z](?:[[a-zA-Z0-9_]*]?[a-zA-Z0-9])?$';
    const regex = new RegExp(regexStr);
    if (
        /**
         * It must be allowed to set _id as primaryKey.
         * This makes it sometimes easier to work with RxDB+CouchDB
         * @link https://github.com/pubkey/rxdb/issues/681
         */
        fieldName !== '_id' &&
        !fieldName.match(regex)
    ) {
        throw newRxError('SC1', {
            regex: regexStr,
            fieldName
        });
    }
}

/**
 * validate that all schema-related things are ok
 */
export function validateFieldsDeep(rxJsonSchema: RxJsonSchema<any>): true {

    const primaryPath = getPrimaryFieldOfPrimaryKey(rxJsonSchema.primaryKey);

    function checkField(
        fieldName: string,
        schemaObj: JsonSchema<any>,
        path: string
    ) {
        if (
            typeof fieldName === 'string' &&
            typeof schemaObj === 'object' &&
            !Array.isArray(schemaObj) &&
            path.split('.').pop() !== 'patternProperties'
        ) checkFieldNameRegex(fieldName);

        // 'item' only allowed it type=='array'
        if (Object.prototype.hasOwnProperty.call(schemaObj, 'item') && schemaObj.type !== 'array') {
            throw newRxError('SC2', {
                fieldName
            });
        }

        /**
         * required fields cannot be set via 'required: true',
         * but must be set via required: []
         */
        if (
            Object.prototype.hasOwnProperty.call(schemaObj, 'required') &&
            typeof schemaObj.required === 'boolean'
        ) {
            throw newRxError('SC24', {
                fieldName
            });
        }

        // $ref is not allowed
        if (Object.prototype.hasOwnProperty.call(schemaObj, '$ref')) {
            throw newRxError('SC40', {
                fieldName
            });
        }


        // if ref given, must be type=='string', type=='array' with string-items or type==['string','null']
        if (Object.prototype.hasOwnProperty.call(schemaObj, 'ref')) {
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
                        if (
                            !schemaObj.items ||
                            !(schemaObj.items as any).type ||
                            (schemaObj.items as any).type !== 'string'
                        ) {
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
            if ((schemaObj as any).default) {
                throw newRxError('SC7', {
                    path
                });
            }
        }

        // first level
        if (!isNested) {

            // if _id is used, it must be primaryKey
            if (
                fieldName === '_id' &&
                primaryPath !== '_id'
            ) {
                throw newRxError('COL2', {
                    fieldName
                });
            }

            // check underscore fields
            if (fieldName.charAt(0) === '_') {
                if (
                    // exceptional allow underscore on these fields.
                    fieldName === '_id' ||
                    fieldName === '_deleted'
                ) {
                    return;
                }
                throw newRxError('SC8', {
                    fieldName
                });
            }
        }
    }

    function traverse(currentObj: any, currentPath: any) {
        if (!currentObj || typeof currentObj !== 'object') {
            return;
        }
        Object.keys(currentObj).forEach(attributeName => {
            const schemaObj = currentObj[attributeName];
            if (
                !currentObj.properties &&
                schemaObj &&
                typeof schemaObj === 'object' &&
                !Array.isArray(currentObj)
            ) {
                checkField(
                    attributeName,
                    schemaObj,
                    currentPath
                );
            }
            let nextPath = currentPath;
            if (attributeName !== 'properties') nextPath = nextPath + '.' + attributeName;
            traverse(schemaObj, nextPath);
        });
    }
    traverse(rxJsonSchema, '');
    return true;
}

export function checkPrimaryKey(
    jsonSchema: RxJsonSchema<any>
) {
    if (!jsonSchema.primaryKey) {
        throw newRxError('SC30', { schema: jsonSchema });
    }



    function validatePrimarySchemaPart(
        schemaPart: JsonSchema | TopLevelProperty
    ) {
        if (!schemaPart) {
            throw newRxError('SC33', { schema: jsonSchema });
        }

        const type: string = schemaPart.type as any;
        if (
            !type ||
            !['string', 'number', 'integer'].includes(type)
        ) {
            throw newRxError('SC32', { schema: jsonSchema, args: { schemaPart } });
        }
    }

    if (typeof jsonSchema.primaryKey === 'string') {
        const key = jsonSchema.primaryKey;
        const schemaPart = jsonSchema.properties[key];
        validatePrimarySchemaPart(schemaPart);
    } else {
        const compositePrimaryKey: CompositePrimaryKey<any> = jsonSchema.primaryKey as any;

        const keySchemaPart = getSchemaByObjectPath(jsonSchema, compositePrimaryKey.key);
        validatePrimarySchemaPart(keySchemaPart);

        compositePrimaryKey.fields.forEach(field => {
            const schemaPart = getSchemaByObjectPath(jsonSchema, field);
            validatePrimarySchemaPart(schemaPart);
        });
    }


    /**
     * The primary key must have a maxLength set
     * which is required by some RxStorage implementations
     * to ensure we can craft custom index strings.
     */
    const primaryPath = getPrimaryFieldOfPrimaryKey(jsonSchema.primaryKey);
    const primaryPathSchemaPart = jsonSchema.properties[primaryPath];
    if (!primaryPathSchemaPart.maxLength) {
        throw newRxError('SC39', { schema: jsonSchema, args: { primaryPathSchemaPart } });
    } else if (!isFinite(primaryPathSchemaPart.maxLength)) {
        throw newRxError('SC41', { schema: jsonSchema, args: { primaryPathSchemaPart } });
    }
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
export function checkSchema(jsonSchema: RxJsonSchema<any>) {

    if (!jsonSchema.primaryKey) {
        throw newRxError('SC30', {
            schema: jsonSchema
        });
    }

    if (!Object.prototype.hasOwnProperty.call(jsonSchema, 'properties')) {
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
    if (!Object.prototype.hasOwnProperty.call(jsonSchema, 'version') ||
        typeof jsonSchema.version !== 'number' ||
        jsonSchema.version < 0
    ) {
        throw newRxError('SC11', {
            version: jsonSchema.version
        });
    }

    validateFieldsDeep(jsonSchema);
    checkPrimaryKey(jsonSchema);

    Object.keys(jsonSchema.properties).forEach(key => {
        const value: any = jsonSchema.properties[key];
        // check primary
        if (key === jsonSchema.primaryKey) {
            if (jsonSchema.indexes && jsonSchema.indexes.includes(key)) {
                throw newRxError('SC13', {
                    value,
                    schema: jsonSchema
                });
            }
            if (value.unique) {
                throw newRxError('SC14', {
                    value,
                    schema: jsonSchema
                });
            }
            if (jsonSchema.encrypted && jsonSchema.encrypted.includes(key)) {
                throw newRxError('SC15', {
                    value,
                    schema: jsonSchema
                });
            }
            if (value.type !== 'string') {
                throw newRxError('SC16', {
                    value,
                    schema: jsonSchema
                });
            }
        }

        // check if RxDocument-property
        if (rxDocumentProperties().includes(key)) {
            throw newRxError('SC17', {
                key,
                schema: jsonSchema
            });
        }
    });

    // check format of jsonSchema.indexes
    if (jsonSchema.indexes) {
        // should be an array
        if (!isMaybeReadonlyArray(jsonSchema.indexes)) {
            throw newRxError('SC18', {
                indexes: jsonSchema.indexes,
                schema: jsonSchema
            });
        }

        jsonSchema.indexes.forEach(index => {
            // should contain strings or array of strings
            if (!(typeof index === 'string' || Array.isArray(index))) {
                throw newRxError('SC19', { index, schema: jsonSchema });
            }
            // if is a compound index it must contain strings
            if (Array.isArray(index)) {
                for (let i = 0; i < index.length; i += 1) {
                    if (typeof index[i] !== 'string') {
                        throw newRxError('SC20', { index, schema: jsonSchema });
                    }
                }
            }

            /**
             * To be able to craft custom indexable string with compound fields,
             * we need to know the maximum fieldlength of the fields values
             * when they are transformed to strings.
             * Therefore we need to enforce some properties inside of the schema.
             */
            const indexAsArray = isMaybeReadonlyArray(index) ? index : [index];
            indexAsArray.forEach(fieldName => {
                const schemaPart = getSchemaByObjectPath(
                    jsonSchema,
                    fieldName
                );


                const type: JsonSchemaTypes = schemaPart.type as any;
                switch (type) {
                    case 'string':
                        const maxLength = schemaPart.maxLength;
                        if (!maxLength) {
                            throw newRxError('SC34', {
                                index,
                                field: fieldName,
                                schema: jsonSchema
                            });
                        }
                        if (maxLength > 2048) {
                            throw newRxError('SC42', {
                                index,
                                field: fieldName,
                                schema: jsonSchema
                            });
                        }
                        break;
                    case 'number':
                    case 'integer':
                        const multipleOf = schemaPart.multipleOf;
                        if (!multipleOf) {
                            throw newRxError('SC35', {
                                index,
                                field: fieldName,
                                schema: jsonSchema
                            });
                        }
                        const maximum = schemaPart.maximum;
                        const minimum = schemaPart.minimum;
                        if (
                            typeof maximum === 'undefined' ||
                            typeof minimum === 'undefined'
                        ) {
                            throw newRxError('SC37', {
                                index,
                                field: fieldName,
                                schema: jsonSchema
                            });
                        }

                        if (
                            !isFinite(maximum) ||
                            !isFinite(minimum)
                        ) {
                            throw newRxError('SC41', {
                                index,
                                field: fieldName,
                                schema: jsonSchema
                            });
                        }

                        break;
                    case 'boolean':
                        /**
                         * If a boolean field is used as an index,
                         * it must be required.
                         */
                        let parentPath = '';
                        let lastPathPart = fieldName;
                        if (fieldName.includes('.')) {
                            const partParts = fieldName.split('.');
                            lastPathPart = partParts.pop();
                            parentPath = partParts.join('.');
                        }
                        const parentSchemaPart = parentPath === '' ? jsonSchema : getSchemaByObjectPath(
                            jsonSchema,
                            parentPath
                        );

                        if (
                            !parentSchemaPart.required ||
                            !parentSchemaPart.required.includes(lastPathPart)
                        ) {
                            throw newRxError('SC38', {
                                index,
                                field: fieldName,
                                schema: jsonSchema
                            });
                        }
                        break;

                    default:
                        throw newRxError('SC36', {
                            fieldName,
                            type: schemaPart.type as any,
                            schema: jsonSchema,
                        });
                }
            });

        });
    }

    // remove backward-compatibility for index: true
    Object.keys(flattenObject(jsonSchema))
        .map(key => {
            // flattenObject returns only ending paths, we need all paths pointing to an object
            const split = key.split('.');
            split.pop(); // all but last
            return split.join('.');
        })
        .filter(key => key !== '')
        .filter((elem, pos, arr) => arr.indexOf(elem) === pos) // unique
        .filter(key => { // check if this path defines an index
            const value = getProperty(jsonSchema, key);
            return value && !!value.index;
        })
        .forEach(key => { // replace inner properties
            key = key.replace('properties.', ''); // first
            key = key.replace(/\.properties\./g, '.'); // middle
            throw newRxError('SC26', {
                index: trimDots(key),
                schema: jsonSchema
            });
        });

    /* check types of the indexes */
    (jsonSchema.indexes || [])
        .reduce((indexPaths: string[], currentIndex) => {
            if (isMaybeReadonlyArray(currentIndex)) {
                appendToArray(indexPaths, currentIndex);
            } else {
                indexPaths.push(currentIndex);
            }
            return indexPaths;
        }, [])
        .filter((elem, pos, arr) => arr.indexOf(elem) === pos) // from now on working only with unique indexes
        .map(indexPath => {
            const realPath = getSchemaPropertyRealPath(indexPath); // real path in the collection schema
            const schemaObj = getProperty(jsonSchema, realPath); // get the schema of the indexed property
            if (!schemaObj || typeof schemaObj !== 'object') {
                throw newRxError('SC21', {
                    index: indexPath,
                    schema: jsonSchema
                });
            }
            return { indexPath, schemaObj };
        })
        .filter(index =>
            index.schemaObj.type !== 'string' &&
            index.schemaObj.type !== 'integer' &&
            index.schemaObj.type !== 'number' &&
            index.schemaObj.type !== 'boolean'
        )
        .forEach(index => {
            throw newRxError('SC22', {
                key: index.indexPath,
                type: index.schemaObj.type,
                schema: jsonSchema
            });
        });

    /* ensure encrypted fields exist in the schema */
    if (jsonSchema.encrypted) {
        jsonSchema.encrypted
            .forEach(propPath => {
                // real path in the collection schema
                const realPath = getSchemaPropertyRealPath(propPath);
                // get the schema of the indexed property
                const schemaObj = getProperty(jsonSchema, realPath);
                if (!schemaObj || typeof schemaObj !== 'object') {
                    throw newRxError('SC28', {
                        field: propPath,
                        schema: jsonSchema
                    });
                }
            });
    }
}
