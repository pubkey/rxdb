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

    if (['properties', 'language'].includes(fieldName)) throw new Error('fieldname is not allowed: ' + fieldName);

    var regexStr = '^[a-zA-Z][[a-zA-Z0-9_]*]?[a-zA-Z0-9]$';
    var regex = new RegExp(regexStr);
    if (!fieldName.match(regex)) {
        throw _rxError2['default'].newRxError('fieldnames do not match the regex', {
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
        if (schemaObj.hasOwnProperty('item') && schemaObj.type !== 'array') throw new Error('name \'item\' reserved for array-fields: ' + fieldName);

        // if ref given, must be type=='string' or type=='array' with string-items
        if (schemaObj.hasOwnProperty('ref')) {
            switch (schemaObj.type) {
                case 'string':
                    break;
                case 'array':
                    if (!schemaObj.items || !schemaObj.items.type || schemaObj.items.type !== 'string') throw new Error('fieldname ' + fieldName + ' has a ref-array but items-type is not string');
                    break;
                default:
                    throw new Error('fieldname ' + fieldName + ' has a ref but is not type string or array<string>');
                    break;
            }
        }

        // if primary is ref, throw
        if (schemaObj.hasOwnProperty('ref') && schemaObj.primary) throw new Error('fieldname ' + fieldName + ' cannot be primary and ref at same time');

        var isNested = path.split('.').length >= 2;

        // nested only
        if (isNested) {
            if (schemaObj.primary) throw new Error('primary can only be defined at top-level');

            if (schemaObj['default']) throw new Error('default-values can only be defined at top-level');
        }

        // first level
        if (!isNested) {
            // check underscore fields
            if (fieldName.charAt(0) === '_') throw new Error('first level-fields cannot start with underscore _ ' + fieldName);
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
    if (jsonID.properties._id) throw new Error('schema defines ._id, this will be done automatically');

    // check _rev
    if (jsonID.properties._rev) throw new Error('schema defines ._rev, this will be done automatically');

    // check version
    if (!jsonID.hasOwnProperty('version') || typeof jsonID.version !== 'number' || jsonID.version < 0) throw new Error('schema need an number>=0 as version; given: ' + jsonID.version);

    validateFieldsDeep(jsonID);

    var primaryPath = void 0;
    Object.keys(jsonID.properties).forEach(function (key) {
        var value = jsonID.properties[key];
        // check primary
        if (value.primary) {
            if (primaryPath) throw new Error('primary can only be defined once');

            primaryPath = key;

            if (value.index) throw new Error('primary is always index, do not declare it as index');
            if (value.unique) throw new Error('primary is always unique, do not declare it as unique');
            if (value.encrypted) throw new Error('primary cannot be encrypted');
            if (value.type !== 'string') throw new Error('primary must have type: string');
        }

        // check if RxDocument-property
        if (_rxDocument2['default'].properties().includes(key)) throw new Error('top-level fieldname is not allowed: ' + key);
    });

    if (primaryPath && jsonID && jsonID.required && jsonID.required.includes(primaryPath)) throw new Error('primary is always required, do not declare it as required');

    // check format of jsonID.compoundIndexes
    if (jsonID.compoundIndexes) {
        if (!Array.isArray(jsonID.compoundIndexes)) throw new Error('compoundIndexes must be an array');
        jsonID.compoundIndexes.forEach(function (ar) {
            if (!Array.isArray(ar)) throw new Error('compoundIndexes must contain arrays');

            ar.forEach(function (str) {
                if (typeof str !== 'string') throw new Error('compoundIndexes.array must contains strings');
            });
        });
    }

    // check that indexes are string
    (0, _rxSchema.getIndexes)(jsonID).reduce(function (a, b) {
        return a.concat(b);
    }, []).filter(function (elem, pos, arr) {
        return arr.indexOf(elem) === pos;
    }) // unique
    .map(function (key) {
        var schemaObj = _objectPath2['default'].get(jsonID, 'properties.' + key.replace('.', '.properties.'));
        if (!schemaObj || (typeof schemaObj === 'undefined' ? 'undefined' : (0, _typeof3['default'])(schemaObj)) !== 'object') throw new Error('given index(' + key + ') is not defined in schema');
        return {
            key: key,
            schemaObj: schemaObj
        };
    }).filter(function (index) {
        return index.schemaObj.type !== 'string' && index.schemaObj.type !== 'integer';
    }).forEach(function (index) {
        throw new Error('given indexKey (' + index.key + ') is not type:string but\n                 ' + index.schemaObj.type);
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
