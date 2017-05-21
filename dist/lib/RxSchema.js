'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.RxSchema = undefined;

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

exports.getEncryptedPaths = getEncryptedPaths;
exports.hasCrypt = hasCrypt;
exports.getIndexes = getIndexes;
exports.getPrimary = getPrimary;
exports.checkFieldNameRegex = checkFieldNameRegex;
exports.validateFieldsDeep = validateFieldsDeep;
exports.checkSchema = checkSchema;
exports.normalize = normalize;
exports.create = create;
exports.isInstanceOf = isInstanceOf;

var _objectPath = require('object-path');

var _objectPath2 = _interopRequireDefault(_objectPath);

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

var _util = require('./util');

var util = _interopRequireWildcard(_util);

var _RxDocument = require('./RxDocument');

var RxDocument = _interopRequireWildcard(_RxDocument);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var validator = require('is-my-json-valid');

var RxSchema = exports.RxSchema = function () {
    function RxSchema(jsonID) {
        var _this = this;

        (0, _classCallCheck3['default'])(this, RxSchema);

        this.jsonID = jsonID;

        this.compoundIndexes = this.jsonID.compoundIndexes;

        // make indexes required
        this.indexes = getIndexes(this.jsonID);
        this.indexes.forEach(function (indexAr) {
            indexAr.filter(function (index) {
                return !_this.jsonID.required.includes(index);
            }).filter(function (index) {
                return !index.includes('.');
            }) // TODO make them sub-required
            .forEach(function (index) {
                return _this.jsonID.required.push(index);
            });
        });

        // primary is always required
        this.primaryPath = getPrimary(this.jsonID);
        if (this.primaryPath) this.jsonID.required.push(this.primaryPath);

        // add primary to schema if not there (if _id)
        if (!this.jsonID.properties[this.primaryPath]) {
            this.jsonID.properties[this.primaryPath] = {
                type: 'string',
                minLength: 1
            };
        }
    }

    (0, _createClass3['default'])(RxSchema, [{
        key: 'getSchemaByObjectPath',
        value: function getSchemaByObjectPath(path) {
            path = path.replace(/\./g, '.properties.');
            path = 'properties.' + path;
            path = util.trimDots(path);

            var ret = _objectPath2['default'].get(this.jsonID, path);
            return ret;
        }
    }, {
        key: 'validate',


        /**
         * validate if the obj matches the schema
         * @param {Object} obj
         * @param {string} schemaPath if given, validates agains deep-path of schema
         * @throws {Error} if not valid
         * @param {Object} obj equal to input-obj
         */
        value: function validate(obj) {
            var schemaPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

            if (!this._validators) this._validators = {};

            if (!this._validators[schemaPath]) {
                var schemaPart = schemaPath == '' ? this.jsonID : this.getSchemaByObjectPath(schemaPath);

                if (!schemaPart) {
                    throw new Error(JSON.stringify({
                        name: 'sub-schema not found',
                        error: 'does the field ' + schemaPath + ' exist in your schema?'
                    }));
                }
                this._validators[schemaPath] = validator(schemaPart);
            }
            var useValidator = this._validators[schemaPath];
            var isValid = useValidator(obj);
            if (isValid) return obj;else {
                throw new Error(JSON.stringify({
                    name: 'object does not match schema',
                    errors: useValidator.errors,
                    schemaPath: schemaPath,
                    obj: obj,
                    schema: this.jsonID
                }));
            }
        }
    }, {
        key: 'swapIdToPrimary',
        value: function swapIdToPrimary(obj) {
            if (this.primaryPath == '_id' || obj[this.primaryPath]) return obj;
            obj[this.primaryPath] = obj._id;
            delete obj._id;
            return obj;
        }
    }, {
        key: 'swapPrimaryToId',
        value: function swapPrimaryToId(obj) {
            var _this2 = this;

            if (this.primaryPath == '_id') return obj;
            var ret = {};
            Object.entries(obj).forEach(function (entry) {
                var newKey = entry[0] == _this2.primaryPath ? '_id' : entry[0];
                ret[newKey] = entry[1];
            });
            return ret;
        }

        /**
         * returns true if key-compression should be done
         */

    }, {
        key: 'doKeyCompression',
        value: function doKeyCompression() {
            return !!!this.jsonID.disableKeyCompression;
        }
    }, {
        key: 'version',
        get: function get() {
            return this.jsonID.version;
        }

        /**
         * @return {number[]} array with previous version-numbers
         */

    }, {
        key: 'previousVersions',
        get: function get() {
            var c = 0;
            return new Array(this.version).fill(0).map(function () {
                return c++;
            });
        }

        /**
         * true if schema contains at least one encrypted path
         * @type {boolean}
         */

    }, {
        key: 'crypt',
        get: function get() {
            if (!this._crypt) this._crypt = hasCrypt(this.jsonID);
            return this._crypt;
        }
    }, {
        key: 'normalized',
        get: function get() {
            if (!this._normalized) this._normalized = normalize(this.jsonID);
            return this._normalized;
        }
    }, {
        key: 'topLevelFields',
        get: function get() {
            return Object.keys(this.normalized.properties);
        }

        /**
         * get all encrypted paths
         */

    }, {
        key: 'encryptedPaths',
        get: function get() {
            if (!this._encryptedPaths) this._encryptedPaths = getEncryptedPaths(this.jsonID);
            return this._encryptedPaths;
        }
    }, {
        key: 'hash',
        get: function get() {
            if (!this._hash) this._hash = util.hash(this.normalized);
            return this._hash;
        }
    }]);
    return RxSchema;
}();

/**
 * returns all encrypted paths of the schema
 * @param  {Object} jsonSchema [description]
 * @return {Object} with paths as attr and schema as value
 */


function getEncryptedPaths(jsonSchema) {
    var ret = {};

    function traverse(currentObj, currentPath) {
        if ((typeof currentObj === 'undefined' ? 'undefined' : (0, _typeof3['default'])(currentObj)) !== 'object') return;
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
function hasCrypt(jsonSchema) {
    var paths = getEncryptedPaths(jsonSchema);
    if (Object.keys(paths).length > 0) return true;else return false;
}

function getIndexes(jsonID) {
    var prePath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

    var indexes = [];
    Object.entries(jsonID).forEach(function (entry) {
        var key = entry[0];
        var obj = entry[1];
        var path = key == 'properties' ? prePath : util.trimDots(prePath + '.' + key);

        if (obj.index) indexes.push([path]);

        if ((typeof obj === 'undefined' ? 'undefined' : (0, _typeof3['default'])(obj)) === 'object' && !Array.isArray(obj)) {
            var add = getIndexes(obj, path);
            indexes = indexes.concat(add);
        }
    });

    if (prePath == '') {
        var addCompound = jsonID.compoundIndexes || [];
        indexes = indexes.concat(addCompound);
    }

    indexes = indexes.filter(function (elem, pos, arr) {
        return arr.indexOf(elem) == pos;
    }); // unique;
    return indexes;
}

/**
 * returns the primary path of a jsonschema
 * @param {Object} jsonID
 * @return {string} primaryPath which is _id if none defined
 */
function getPrimary(jsonID) {
    var ret = Object.keys(jsonID.properties).filter(function (key) {
        return jsonID.properties[key].primary;
    }).shift();
    if (!ret) return '_id';else return ret;
}

/**
 * checks if the fieldname is allowed
 * this makes sure that the fieldnames can be transformed into javascript-vars
 * and does not conquer the observe$ and populate_ fields
 * @param  {string} fieldName
 * @throws {Error}
 */
function checkFieldNameRegex(fieldName) {
    if (fieldName == '') return;

    if (['properties', 'language'].includes(fieldName)) throw new Error('fieldname is not allowed: ' + fieldName);

    var regexStr = '^[a-zA-Z][[a-zA-Z0-9_]*]?[a-zA-Z0-9]$';
    var regex = new RegExp(regexStr);
    if (!fieldName.match(regex)) {
        throw new Error('\n        fieldnames must match the regex:\n        - regex: ' + regexStr + '\n        - fieldName: ' + fieldName + '\n        ');
    }
}

/**
 * validate that all schema-related things are ok
 * @param  {object} jsonSchema
 * @return {boolean} true always
 */
function validateFieldsDeep(jsonSchema) {

    function checkField(fieldName, schemaObj, path) {
        if (typeof fieldName == 'string' && (typeof schemaObj === 'undefined' ? 'undefined' : (0, _typeof3['default'])(schemaObj)) == 'object' && !Array.isArray(schemaObj)) checkFieldNameRegex(fieldName);

        // 'item' only allowed it type=='array'
        if (schemaObj.hasOwnProperty('item') && schemaObj.type != 'array') throw new Error('name \'item\' reserved for array-fields: ' + fieldName);

        // if ref given, must be type=='string' or type=='array' with string-items
        if (schemaObj.hasOwnProperty('ref')) {
            switch (schemaObj.type) {
                case 'string':
                    break;
                case 'array':
                    if (!schemaObj.items || !schemaObj.items.type || schemaObj.items.type != 'string') throw new Error('fieldname ' + fieldName + ' has a ref-array but items-type is not string');
                    break;
                default:
                    throw new Error('fieldname ' + fieldName + ' has a ref but is not type string or array<string>');
                    break;
            }
        }

        // if primary is ref, throw
        if (schemaObj.hasOwnProperty('ref') && schemaObj.primary) throw new Error('fieldname ' + fieldName + ' cannot be primary and ref at same time');

        var isNested = path.split('.').length > 2;

        // nested only
        if (isNested) {
            if (schemaObj.primary) throw new Error('primary can only be defined at top-level');
        }

        // first level
        if (!isNested) {
            // check underscore fields
            if (fieldName.charAt(0) == '_') throw new Error('first level-fields cannot start with underscore _ ' + fieldName);
        }
    }

    function traverse(currentObj, currentPath) {
        if ((typeof currentObj === 'undefined' ? 'undefined' : (0, _typeof3['default'])(currentObj)) !== 'object') return;
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
        if (RxDocument.properties().includes(key)) throw new Error('top-level fieldname is not allowed: ' + key);
    });

    if (primaryPath && jsonID && jsonID.required && jsonID.required.includes(primaryPath)) throw new Error('primary is always required, do not declare it as required');

    // check format of jsonID.compoundIndexes
    if (jsonID.compoundIndexes) {
        var error = null;
        if (!Array.isArray(jsonID.compoundIndexes)) throw new Error('compoundIndexes must be an array');
        jsonID.compoundIndexes.forEach(function (ar) {
            if (!Array.isArray(ar)) throw new Error('compoundIndexes must contain arrays');

            ar.forEach(function (str) {
                if (typeof str !== 'string') throw new Error('compoundIndexes.array must contains strings');
            });
        });
    }

    // check that indexes are string
    getIndexes(jsonID).reduce(function (a, b) {
        return a.concat(b);
    }, []).filter(function (elem, pos, arr) {
        return arr.indexOf(elem) == pos;
    }) // unique
    .map(function (key) {
        var schemaObj = _objectPath2['default'].get(jsonID, 'properties.' + key.replace('.', '.properties.'));
        if (!schemaObj || (typeof schemaObj === 'undefined' ? 'undefined' : (0, _typeof3['default'])(schemaObj)) !== 'object') throw new Error('given index(' + key + ') is not defined in schema');
        return {
            key: key,
            schemaObj: schemaObj
        };
    }).filter(function (index) {
        return index.schemaObj.type != 'string' && index.schemaObj.type != 'integer';
    }).forEach(function (index) {
        throw new Error('given indexKey (' + index.key + ') is not type:string but\n                ' + index.schemaObj.type);
    });
}

/**
 * orders the schemas attributes by alphabetical order
 * @param {Object} jsonSchema
 * @return {Object} jsonSchema - ordered
 */
function normalize(jsonSchema) {
    return util.sortObject((0, _clone2['default'])(jsonSchema));
}

/**
 * fills the schema-json with default-values
 * @param  {Object} schemaObj
 * @return {Object} cloned schemaObj
 */
var fillWithDefaults = function fillWithDefaults(schemaObj) {
    schemaObj = (0, _clone2['default'])(schemaObj);

    // additionalProperties is always false
    schemaObj.additionalProperties = false;

    // fill with key-compression-state ()
    if (!schemaObj.hasOwnProperty('disableKeyCompression')) schemaObj.disableKeyCompression = false;

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

function create(jsonID) {
    var doCheck = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

    if (doCheck) checkSchema(jsonID);
    return new RxSchema(fillWithDefaults(jsonID));
}

function isInstanceOf(obj) {
    return obj instanceof RxSchema;
}
