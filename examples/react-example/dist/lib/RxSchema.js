'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.getEncryptedPaths = undefined;

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

exports.hasCrypt = hasCrypt;
exports.getIndexes = getIndexes;
exports.getPrimary = getPrimary;
exports.validateFieldsDeep = validateFieldsDeep;
exports.checkSchema = checkSchema;
exports.create = create;

var _objectPath = require('object-path');

var _objectPath2 = _interopRequireDefault(_objectPath);

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

var _util = require('./util');

var util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var RxSchema = function () {
    function RxSchema(jsonID) {
        var _this = this;

        (0, _classCallCheck3.default)(this, RxSchema);

        this.hash = function () {
            return util.hash(_this.jsonID);
        };

        this.jsonID = (0, _clone2.default)(jsonID);

        this.compoundIndexes = this.jsonID.compoundIndexes || [];
        delete this.jsonID.compoundIndexes;

        // make indexes required
        this.indexes = getIndexes(this.jsonID);
        this.jsonID.required = this.jsonID.required || [];

        this.indexes.map(function (indexAr) {
            indexAr.filter(function (index) {
                return !_this.jsonID.required.includes(index);
            }).forEach(function (index) {
                return _this.jsonID.required.push(index);
            });
        });

        // primary
        this.primaryPath = getPrimary(this.jsonID);
        if (this.primaryPath) this.jsonID.required.push(this.primaryPath);

        // add _id
        this.jsonID.properties._id = {
            type: 'string',
            minLength: 1
        };

        // add _rev
        this.jsonID.properties._rev = {
            type: 'string',
            minLength: 1
        };

        // true if schema contains a crypt-field
        this.crypt = hasCrypt(this.jsonID);
        this.encryptedPaths;

        this.jsonID.additionalProperties = false;
    }

    (0, _createClass3.default)(RxSchema, [{
        key: 'getSchemaByObjectPath',
        value: function getSchemaByObjectPath(path) {
            path = path.replace(/\./g, '.properties.');
            path = 'properties.' + path;
            return _objectPath2.default.get(this.jsonID, path);
        }

        /**
         * get all encrypted paths
         */

    }, {
        key: 'getEncryptedPaths',
        value: function getEncryptedPaths() {
            if (!this.encryptedPaths) this.encryptedPaths = _getEncryptedPaths(this.jsonID);
            return this.encryptedPaths;
        }

        /**
         * validate if the obj matches the schema
         * @param {Object} obj
         * @param {Object} schemaObj json-schema
         */

    }, {
        key: 'validate',
        value: function validate(obj, schemaObj) {
            schemaObj = schemaObj || this.jsonID;
            util.jsonSchemaValidate(schemaObj, obj);
            return true;
        }
    }, {
        key: 'swapIdToPrimary',
        value: function swapIdToPrimary(obj) {
            if (!this.primaryPath) return obj;
            obj[this.primaryPath] = obj._id;
            delete obj._id;
            return obj;
        }
    }, {
        key: 'swapPrimaryToId',
        value: function swapPrimaryToId(obj) {
            if (!this.primaryPath) return obj;
            obj._id = obj[this.primaryPath];
            delete obj[this.primaryPath];
            return obj;
        }
    }]);
    return RxSchema;
}();

/**
 * returns all encrypted paths of the schema
 * @param  {Object} jsonSchema [description]
 * @return {Object} with paths as attr and schema as value
 */


function _getEncryptedPaths(jsonSchema) {
    var ret = {};

    function traverse(currentObj, currentPath) {
        if ((typeof currentObj === 'undefined' ? 'undefined' : (0, _typeof3.default)(currentObj)) !== 'object') return;
        if (currentObj.encrypted) {
            ret[currentPath.substring(1)] = currentObj;
            return;
        }
        for (var attributeName in currentObj) {
            var nextPath = currentPath;
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
exports.getEncryptedPaths = _getEncryptedPaths;
function hasCrypt(jsonSchema) {
    var paths = _getEncryptedPaths(jsonSchema);
    if (Object.keys(paths).length > 0) return true;else return false;
}

function getIndexes(jsonID) {
    return Object.keys(jsonID.properties).filter(function (key) {
        return jsonID.properties[key].index;
    }).map(function (key) {
        return [key];
    }).concat(jsonID.compoundIndexes || []).filter(function (elem, pos, arr) {
        return arr.indexOf(elem) == pos;
    }); // unique
}

function getPrimary(jsonID) {
    return Object.keys(jsonID.properties).filter(function (key) {
        return jsonID.properties[key].primary;
    }).shift();
}

/**
 * validate that all schema-related things are ok
 * @param  {object} jsonSchema
 * @return {boolean} true always
 */
function validateFieldsDeep(jsonSchema) {

    function checkField(fieldName, schemaObj, path) {
        // all
        if (['properties', 'language'].includes(fieldName)) throw new Error('fieldname is not allowed: ' + fieldName);
        if (fieldName.includes('.')) throw new Error('field-names cannot contain dots: ' + fieldName);

        var isNested = path.split('.').length >= 2;
        // nested only
        if (isNested) {
            if (schemaObj.primary) throw new Error('primary can only be defined at top-level');
            if (schemaObj.index) throw new Error('index can only be defined at top-level');
        }
        // first level
        if (!isNested) {
            // check underscore fields
            if (fieldName.charAt(0) == '_') throw new Error('first level-fields cannot start with underscore _ ' + fieldName);
        }
    }

    function traverse(currentObj, currentPath) {
        if ((typeof currentObj === 'undefined' ? 'undefined' : (0, _typeof3.default)(currentObj)) !== 'object') return;
        for (var attributeName in currentObj) {
            if (!currentObj.properties) {
                checkField(attributeName, currentObj[attributeName], currentPath);
            }
            var nextPath = currentPath;
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
function checkSchema(jsonID) {

    // check _id
    if (jsonID.properties._id) throw new Error('schema defines ._id, this will be done automatically');

    // check _rev
    if (jsonID.properties._rev) throw new Error('schema defines ._rev, this will be done automatically');

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
    });

    if (primaryPath && jsonID && jsonID.required && jsonID.required.includes(primaryPath)) throw new Error('primary is always required, do not declare it as required');

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
    getIndexes(jsonID).reduce(function (a, b) {
        return a.concat(b);
    }, []).filter(function (elem, pos, arr) {
        return arr.indexOf(elem) == pos;
    }) // unique
    .filter(function (indexKey) {
        return jsonID.properties[indexKey].type != 'string' && jsonID.properties[indexKey].type != 'integer';
    }).forEach(function (indexKey) {
        throw new Error('given indexKey (' + indexKey + ') is not type:string but\n                ' + jsonID.properties[indexKey].type);
    });
}

function create(jsonID) {
    checkSchema(jsonID);
    return new RxSchema(jsonID);
}