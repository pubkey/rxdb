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
exports.getFinalFields = getFinalFields;
exports.normalize = normalize;
exports.create = create;
exports.isInstanceOf = isInstanceOf;

var _objectPath = require('object-path');

var _objectPath2 = _interopRequireDefault(_objectPath);

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

var _util = require('./util');

var util = _interopRequireWildcard(_util);

var _rxError = require('./rx-error');

var _rxError2 = _interopRequireDefault(_rxError);

var _hooks = require('./hooks');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

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

        // final fields are always required
        this.finalFields = getFinalFields(this.jsonID);
        this.jsonID.required = this.jsonID.required.concat(this.finalFields).filter(function (elem, pos, arr) {
            return arr.indexOf(elem) === pos;
        }); // unique;

        // add primary to schema if not there (if _id)
        if (!this.jsonID.properties[this.primaryPath]) {
            this.jsonID.properties[this.primaryPath] = {
                type: 'string',
                minLength: 1
            };
        }
    }

    /**
     * @return {number}
     */


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
         * @overwritten by plugin (required)
         * @param {Object} obj
         * @param {string} schemaPath if given, validates agains deep-path of schema
         * @throws {Error} if not valid
         * @param {Object} obj equal to input-obj
         */
        value: function validate() {
            throw _rxError2['default'].pluginMissing('validate');
        }
    }, {
        key: 'fillObjectWithDefaults',


        /**
         * fills all unset fields with default-values if set
         * @param  {object} obj
         * @return {object}
         */
        value: function fillObjectWithDefaults(obj) {
            obj = (0, _clone2['default'])(obj);
            Object.entries(this.defaultValues).filter(function (entry) {
                return !obj.hasOwnProperty(entry[0]);
            }).forEach(function (entry) {
                obj[entry[0]] = entry[1];
            });
            return obj;
        }
    }, {
        key: 'swapIdToPrimary',
        value: function swapIdToPrimary(obj) {
            if (this.primaryPath === '_id' || obj[this.primaryPath]) return obj;
            obj[this.primaryPath] = obj._id;
            delete obj._id;
            return obj;
        }
    }, {
        key: 'swapPrimaryToId',
        value: function swapPrimaryToId(obj) {
            var _this2 = this;

            if (this.primaryPath === '_id') return obj;
            var ret = {};
            Object.entries(obj).forEach(function (entry) {
                var newKey = entry[0] === _this2.primaryPath ? '_id' : entry[0];
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
    }, {
        key: 'defaultValues',
        get: function get() {
            var _this3 = this;

            if (!this._defaultValues) {
                this._defaultValues = {};
                Object.entries(this.normalized.properties).filter(function (entry) {
                    return entry[1]['default'];
                }).forEach(function (entry) {
                    return _this3._defaultValues[entry[0]] = entry[1]['default'];
                });
            }
            return this._defaultValues;
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
            if (attributeName !== 'properties') nextPath = nextPath + '.' + attributeName;
            traverse(currentObj[attributeName], nextPath);
        }
    }
    traverse(jsonSchema.properties, '');
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
        var path = key === 'properties' ? prePath : util.trimDots(prePath + '.' + key);

        if (obj.index) indexes.push([path]);

        if ((typeof obj === 'undefined' ? 'undefined' : (0, _typeof3['default'])(obj)) === 'object' && !Array.isArray(obj)) {
            var add = getIndexes(obj, path);
            indexes = indexes.concat(add);
        }
    });

    if (prePath === '') {
        var addCompound = jsonID.compoundIndexes || [];
        indexes = indexes.concat(addCompound);
    }

    indexes = indexes.filter(function (elem, pos, arr) {
        return arr.indexOf(elem) === pos;
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
 * returns the final-fields of the schema
 * @param  {Object} jsonId
 * @return {string[]} field-names of the final-fields
 */
function getFinalFields(jsonId) {
    return Object.keys(jsonId.properties).filter(function (key) {
        return jsonId.properties[key].final;
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
 * fills the schema-json with default-settings
 * @param  {Object} schemaObj
 * @return {Object} cloned schemaObj
 */
var fillWithDefaultSettings = function fillWithDefaultSettings(schemaObj) {
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

    // add attachments
    schemaObj.properties._attachments = {
        type: 'object'
    };

    // version is 0 by default
    schemaObj.version = schemaObj.version || 0;

    return schemaObj;
};

function create(jsonID) {
    var runPreCreateHooks = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

    if (runPreCreateHooks) (0, _hooks.runPluginHooks)('preCreateRxSchema', jsonID);
    var schema = new RxSchema(fillWithDefaultSettings(jsonID));
    (0, _hooks.runPluginHooks)('createRxSchema', schema);
    return schema;
}

function isInstanceOf(obj) {
    return obj instanceof RxSchema;
}

exports['default'] = {
    RxSchema: RxSchema,
    getEncryptedPaths: getEncryptedPaths,
    hasCrypt: hasCrypt,
    getIndexes: getIndexes,
    getPrimary: getPrimary,
    getFinalFields: getFinalFields,
    normalize: normalize,
    create: create,
    isInstanceOf: isInstanceOf
};
