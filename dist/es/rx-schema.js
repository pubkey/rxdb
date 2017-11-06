import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
import _createClass from 'babel-runtime/helpers/createClass';
import objectPath from 'object-path';
import clone from 'clone';

import * as util from './util';
import RxError from './rx-error';
import { runPluginHooks } from './hooks';

export var RxSchema = function () {
    function RxSchema(jsonID) {
        var _this = this;

        _classCallCheck(this, RxSchema);

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


    RxSchema.prototype.getSchemaByObjectPath = function getSchemaByObjectPath(path) {
        path = path.replace(/\./g, '.properties.');
        path = 'properties.' + path;
        path = util.trimDots(path);

        var ret = objectPath.get(this.jsonID, path);
        return ret;
    };

    /**
     * validate if the obj matches the schema
     * @overwritten by plugin (required)
     * @param {Object} obj
     * @param {string} schemaPath if given, validates agains deep-path of schema
     * @throws {Error} if not valid
     * @param {Object} obj equal to input-obj
     */
    RxSchema.prototype.validate = function validate() {
        throw RxError.pluginMissing('validate');
    };

    /**
     * fills all unset fields with default-values if set
     * @param  {object} obj
     * @return {object}
     */
    RxSchema.prototype.fillObjectWithDefaults = function fillObjectWithDefaults(obj) {
        obj = clone(obj);
        Object.entries(this.defaultValues).filter(function (entry) {
            return !obj.hasOwnProperty(entry[0]);
        }).forEach(function (entry) {
            obj[entry[0]] = entry[1];
        });
        return obj;
    };

    RxSchema.prototype.swapIdToPrimary = function swapIdToPrimary(obj) {
        if (this.primaryPath === '_id' || obj[this.primaryPath]) return obj;
        obj[this.primaryPath] = obj._id;
        delete obj._id;
        return obj;
    };

    RxSchema.prototype.swapPrimaryToId = function swapPrimaryToId(obj) {
        var _this2 = this;

        if (this.primaryPath === '_id') return obj;
        var ret = {};
        Object.entries(obj).forEach(function (entry) {
            var newKey = entry[0] === _this2.primaryPath ? '_id' : entry[0];
            ret[newKey] = entry[1];
        });
        return ret;
    };

    /**
     * returns true if key-compression should be done
     */


    RxSchema.prototype.doKeyCompression = function doKeyCompression() {
        return !!!this.jsonID.disableKeyCompression;
    };

    _createClass(RxSchema, [{
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
export function getEncryptedPaths(jsonSchema) {
    var ret = {};

    function traverse(currentObj, currentPath) {
        if (typeof currentObj !== 'object') return;
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
export function hasCrypt(jsonSchema) {
    var paths = getEncryptedPaths(jsonSchema);
    if (Object.keys(paths).length > 0) return true;else return false;
}

export function getIndexes(jsonID) {
    var prePath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

    var indexes = [];
    Object.entries(jsonID).forEach(function (entry) {
        var key = entry[0];
        var obj = entry[1];
        var path = key === 'properties' ? prePath : util.trimDots(prePath + '.' + key);

        if (obj.index) indexes.push([path]);

        if (typeof obj === 'object' && !Array.isArray(obj)) {
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
export function getPrimary(jsonID) {
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
export function getFinalFields(jsonId) {
    return Object.keys(jsonId.properties).filter(function (key) {
        return jsonId.properties[key].final;
    });
}

/**
 * orders the schemas attributes by alphabetical order
 * @param {Object} jsonSchema
 * @return {Object} jsonSchema - ordered
 */
export function normalize(jsonSchema) {
    return util.sortObject(clone(jsonSchema));
}

/**
 * fills the schema-json with default-settings
 * @param  {Object} schemaObj
 * @return {Object} cloned schemaObj
 */
var fillWithDefaultSettings = function fillWithDefaultSettings(schemaObj) {
    schemaObj = clone(schemaObj);

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

export function create(jsonID) {
    var runPreCreateHooks = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

    if (runPreCreateHooks) runPluginHooks('preCreateRxSchema', jsonID);
    var schema = new RxSchema(fillWithDefaultSettings(jsonID));
    runPluginHooks('createRxSchema', schema);
    return schema;
}

export function isInstanceOf(obj) {
    return obj instanceof RxSchema;
}

export default {
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