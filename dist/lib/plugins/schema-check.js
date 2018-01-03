'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.hooks = exports.rxdb = undefined;

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

exports.checkFieldNameRegex = checkFieldNameRegex;
exports.validateFieldsDeep = validateFieldsDeep;
exports.checkSchema = checkSchema;

var _objectPath = require('object-path');

var _objectPath2 = _interopRequireDefault(_objectPath);

var _rxDocument = require('../rx-document');

var _rxDocument2 = _interopRequireDefault(_rxDocument);

var _rxError = require('../rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

var _rxSchema = require('../rx-schema');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * checks if the fieldname is allowed
 * this makes sure that the fieldnames can be transformed into javascript-vars
 * and does not conquer the observe$ and populate_ fields
 * @param  {string} fieldName
 * @throws {Error}
 */
/**
 * does additional checks over the schema-json
 * to ensure nothing is broken or not supported
 */

function checkFieldNameRegex(fieldName) {
    if (fieldName === '') return;

    if (['properties', 'language'].includes(fieldName)) {
        throw _rxError2['default'].newRxError('SC23', {
            fieldName: fieldName
        });
    }

    var regexStr = '^[a-zA-Z][[a-zA-Z0-9_]*]?[a-zA-Z0-9]$';
    var regex = new RegExp(regexStr);
    if (!fieldName.match(regex)) {
        throw _rxError2['default'].newRxError('SC1', {
            regex: regexStr,
            fieldName: fieldName
        });
    }
};

/**
 * validate that all schema-related things are ok
 * @param  {object} jsonSchema
 * @return {boolean} true always
 */
function validateFieldsDeep(jsonSchema) {
    function checkField(fieldName, schemaObj, path) {
        if (typeof fieldName === 'string' && (typeof schemaObj === 'undefined' ? 'undefined' : (0, _typeof3['default'])(schemaObj)) === 'object' && !Array.isArray(schemaObj)) checkFieldNameRegex(fieldName);

        // 'item' only allowed it type=='array'
        if (schemaObj.hasOwnProperty('item') && schemaObj.type !== 'array') {
            throw _rxError2['default'].newRxError('SC2', {
                fieldName: fieldName
            });
        }

        // if ref given, must be type=='string' or type=='array' with string-items
        if (schemaObj.hasOwnProperty('ref')) {
            switch (schemaObj.type) {
                case 'string':
                    break;
                case 'array':
                    if (!schemaObj.items || !schemaObj.items.type || schemaObj.items.type !== 'string') {
                        throw _rxError2['default'].newRxError('SC3', {
                            fieldName: fieldName
                        });
                    }
                    break;
                default:
                    throw _rxError2['default'].newRxError('SC4', {
                        fieldName: fieldName
                    });
                    break;
            }
        }

        // if primary is ref, throw
        if (schemaObj.hasOwnProperty('ref') && schemaObj.primary) {
            throw _rxError2['default'].newRxError('SC5', {
                fieldName: fieldName
            });
        }

        var isNested = path.split('.').length >= 2;

        // nested only
        if (isNested) {
            if (schemaObj.primary) {
                throw _rxError2['default'].newRxError('SC6', {
                    path: path,
                    primary: schemaObj.primary
                });
            }

            if (schemaObj['default']) {
                throw _rxError2['default'].newRxError('SC7', {
                    path: path
                });
            }
        }

        // first level
        if (!isNested) {
            // check underscore fields
            if (fieldName.charAt(0) === '_') {
                throw _rxError2['default'].newRxError('SC8', {
                    fieldName: fieldName
                });
            }
        }
    }

    function traverse(currentObj, currentPath) {
        if ((typeof currentObj === 'undefined' ? 'undefined' : (0, _typeof3['default'])(currentObj)) !== 'object') return;
        for (var attributeName in currentObj) {
            if (!currentObj.properties) {
                checkField(attributeName, currentObj[attributeName], currentPath);
            }
            var nextPath = currentPath;
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
function checkSchema(jsonID) {
    // check _id
    if (jsonID.properties._id) {
        throw _rxError2['default'].newRxError('SC9', {
            schema: jsonID
        });
    }

    // check _rev
    if (jsonID.properties._rev) {
        throw _rxError2['default'].newRxError('SC10', {
            schema: jsonID
        });
    }

    // check version
    if (!jsonID.hasOwnProperty('version') || typeof jsonID.version !== 'number' || jsonID.version < 0) {
        throw _rxError2['default'].newRxError('SC11', {
            version: jsonID.version
        });
    }

    validateFieldsDeep(jsonID);

    var primaryPath = void 0;
    Object.keys(jsonID.properties).forEach(function (key) {
        var value = jsonID.properties[key];
        // check primary
        if (value.primary) {
            if (primaryPath) {
                throw _rxError2['default'].newRxError('SC12', {
                    value: value
                });
            }

            primaryPath = key;

            if (value.index) {
                throw _rxError2['default'].newRxError('SC13', {
                    value: value
                });
            }
            if (value.unique) {
                throw _rxError2['default'].newRxError('SC14', {
                    value: value
                });
            }
            if (value.encrypted) {
                throw _rxError2['default'].newRxError('SC15', {
                    value: value
                });
            }
            if (value.type !== 'string') {
                throw _rxError2['default'].newRxError('SC16', {
                    value: value
                });
            }
        }

        // check if RxDocument-property
        if (_rxDocument2['default'].properties().includes(key)) {
            throw _rxError2['default'].newRxError('SC17', {
                key: key
            });
        }
    });

    // check format of jsonID.compoundIndexes
    if (jsonID.compoundIndexes) {
        if (!Array.isArray(jsonID.compoundIndexes)) {
            throw _rxError2['default'].newRxError('SC18', {
                compoundIndexes: jsonID.compoundIndexes
            });
        }
        jsonID.compoundIndexes.forEach(function (ar) {
            if (!Array.isArray(ar)) {
                throw _rxError2['default'].newRxError('SC19', {
                    compoundIndexes: jsonID.compoundIndexes
                });
            }

            ar.forEach(function (str) {
                if (typeof str !== 'string') {
                    throw _rxError2['default'].newRxError('SC20', {
                        compoundIndexes: jsonID.compoundIndexes
                    });
                }
            });
        });
    }

    // check that indexes are string or number
    (0, _rxSchema.getIndexes)(jsonID).reduce(function (a, b) {
        return a.concat(b);
    }, []).filter(function (elem, pos, arr) {
        return arr.indexOf(elem) === pos;
    }) // unique
    .map(function (key) {
        var schemaObj = _objectPath2['default'].get(jsonID, 'properties.' + key.replace('.', '.properties.'));
        if (!schemaObj || (typeof schemaObj === 'undefined' ? 'undefined' : (0, _typeof3['default'])(schemaObj)) !== 'object') {
            throw _rxError2['default'].newRxError('SC21', {
                key: key
            });
        }
        return {
            key: key,
            schemaObj: schemaObj
        };
    }).filter(function (index) {
        return index.schemaObj.type !== 'string' && index.schemaObj.type !== 'integer' && index.schemaObj.type !== 'number';
    }).forEach(function (index) {
        throw _rxError2['default'].newRxError('SC22', {
            key: index.key,
            type: index.schemaObj.type
        });
    });
};

var rxdb = exports.rxdb = true;
var hooks = exports.hooks = {
    preCreateRxSchema: checkSchema
};

exports['default'] = {
    rxdb: rxdb,
    hooks: hooks
};
