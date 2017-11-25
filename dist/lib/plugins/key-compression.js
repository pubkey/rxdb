'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.overwritable = exports.prototypes = exports.rxdb = undefined;

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

exports.create = create;

var _clone = require('clone');

var _clone2 = _interopRequireDefault(_clone);

var _util = require('../util');

var util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * this plugin adds the keycompression-capabilities to rxdb
 * if you dont use this, ensure that you set disableKeyComression to false in your schema
 */

var KeyCompressor = function () {
    /**
     * @param {RxSchema} schema
     */
    function KeyCompressor(schema) {
        (0, _classCallCheck3['default'])(this, KeyCompressor);

        this.schema = schema;
        this._table;
        this._reverseTable;
        this._fullTable;
    }

    (0, _createClass3['default'])(KeyCompressor, [{
        key: '_compressObj',
        value: function _compressObj(obj) {
            var _this = this;

            var path = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

            var ret = {};
            if ((typeof obj === 'undefined' ? 'undefined' : (0, _typeof3['default'])(obj)) !== 'object' || obj === null) return obj;
            if (Array.isArray(obj)) {
                return obj.map(function (o) {
                    return _this._compressObj(o, util.trimDots(path + '.item'));
                });
            }
            Object.keys(obj).forEach(function (key) {
                var propertyObj = obj[key];
                var fullPath = util.trimDots(path + '.' + key);
                var replacedKey = _this.table[fullPath] ? _this.table[fullPath] : key;
                var nextObj = propertyObj;
                nextObj = _this._compressObj(propertyObj, fullPath);
                ret[replacedKey] = nextObj;
            });
            return ret;
        }

        /**
         * compress the keys of an object via the compression-table
         * @param {Object} obj
         * @param {Object} compressed obj
         */

    }, {
        key: 'compress',
        value: function compress(obj) {
            if (!this.schema.doKeyCompression()) return (0, _clone2['default'])(obj);
            return this._compressObj(obj);
        }
    }, {
        key: '_decompressObj',
        value: function _decompressObj(obj) {
            var _this2 = this;

            var reverseTable = this.reverseTable;

            // non-object
            if ((typeof obj === 'undefined' ? 'undefined' : (0, _typeof3['default'])(obj)) !== 'object' || obj === null) return obj;

            // array
            if (Array.isArray(obj)) return obj.map(function (item) {
                return _this2._decompressObj(item);
            });

            // object
            else {
                    var ret = {};
                    Object.keys(obj).forEach(function (key) {
                        var replacedKey = key;
                        if ((key.startsWith('|') || key.startsWith('_')) && reverseTable[key]) replacedKey = reverseTable[key];

                        ret[replacedKey] = _this2._decompressObj(obj[key]);
                    });
                    return ret;
                }
        }
    }, {
        key: 'decompress',
        value: function decompress(obj) {
            if (!this.schema.doKeyCompression()) return (0, _clone2['default'])(obj);
            var returnObj = this._decompressObj(obj);
            return returnObj;
        }

        /**
         * get the full compressed-key-path of a object-path
         * @param {string} prePath | 'mainSkill'
         * @param {string} prePathCompressed | '|a'
         * @param {string[]} remainPathAr | ['attack', 'count']
         * @return {string} compressedPath | '|a.|b.|c'
         */

    }, {
        key: '_transformKey',
        value: function _transformKey(prePath, prePathCompressed, remainPathAr) {
            var table = this.table;
            prePath = util.trimDots(prePath);
            prePathCompressed = util.trimDots(prePathCompressed);
            var nextPath = remainPathAr.shift();

            var nextFullPath = util.trimDots(prePath + '.' + nextPath);
            if (table[nextFullPath]) prePathCompressed += '.' + table[nextFullPath];else prePathCompressed += '.' + nextPath;

            if (remainPathAr.length > 0) return this._transformKey(nextFullPath, prePathCompressed, remainPathAr);else return util.trimDots(prePathCompressed);
        }

        /**
         * replace the keys of a query-obj with the compressed keys
         * @param {{selector: {}}} queryJSON
         * @return {{selector: {}}} compressed queryJSON
         */

    }, {
        key: 'compressQuery',
        value: function compressQuery(queryJSON) {
            var _this3 = this;

            queryJSON = (0, _clone2['default'])(queryJSON);
            if (!this.schema.doKeyCompression()) return queryJSON;

            // selector
            var selector = {};
            Object.keys(queryJSON.selector).forEach(function (key) {
                var value = queryJSON.selector[key];
                if (key.startsWith('$')) {
                    // $or, $not etc have different structure
                    var setObj = value.map(function (obj) {
                        var newObj = {};
                        Object.keys(obj).forEach(function (k) {
                            var transKey = _this3._transformKey('', '', k.split('.'));
                            newObj[transKey] = obj[k];
                        });
                        return newObj;
                    });
                    selector[key] = setObj;
                } else {
                    var transKey = _this3._transformKey('', '', key.split('.'));
                    selector[transKey] = value;
                }
            });
            queryJSON.selector = selector;

            // sort
            if (queryJSON.sort) {
                queryJSON.sort = queryJSON.sort.map(function (sortObj) {
                    var key = Object.keys(sortObj)[0];
                    var value = sortObj[key];
                    var ret = {};
                    ret[_this3._transformKey('', '', key.split('.'))] = value;
                    return ret;
                });
            }

            return queryJSON;
        }
    }, {
        key: 'table',
        get: function get() {
            var _this4 = this;

            if (!this._table) {
                // create new table

                var lastKeyNumber = 0;
                var nextKey = function nextKey() {
                    lastKeyNumber++;
                    return util.numberToLetter(lastKeyNumber - 1);
                };
                this._table = {};
                var jsonSchema = this.schema.normalized;

                var propertiesToTable = function propertiesToTable(path, obj) {
                    Object.keys(obj).map(function (key) {
                        var propertyObj = obj[key];
                        var fullPath = key === 'properties' ? path : util.trimDots(path + '.' + key);
                        if ((typeof propertyObj === 'undefined' ? 'undefined' : (0, _typeof3['default'])(propertyObj)) === 'object' && // do not add schema-attributes
                        !Array.isArray(propertyObj) && // do not use arrays
                        !_this4._table[fullPath] && fullPath !== '' && key.length > 3 && // do not compress short keys
                        !fullPath.startsWith('_') // _id/_rev etc should never be compressed
                        ) _this4._table[fullPath] = '|' + nextKey();

                        // primary-key is always compressed to _id
                        if (propertyObj.primary === true) _this4._table[fullPath] = '_id';

                        if ((typeof propertyObj === 'undefined' ? 'undefined' : (0, _typeof3['default'])(propertyObj)) === 'object' && !Array.isArray(propertyObj)) propertiesToTable(fullPath, propertyObj);
                    });
                };
                propertiesToTable('', jsonSchema);
            }
            return this._table;
        }
    }, {
        key: 'reverseTable',
        get: function get() {
            var _this5 = this;

            if (!this._reverseTable) {
                var table = this.table;
                this._reverseTable = {};
                Object.keys(table).forEach(function (key) {
                    var value = table[key];
                    var fieldName = key.split('.').pop();
                    _this5._reverseTable[value] = fieldName;
                });
            }
            return this._reverseTable;
        }
    }]);
    return KeyCompressor;
}();

function create(schema) {
    return new KeyCompressor(schema);
}

var rxdb = exports.rxdb = true;
var prototypes = exports.prototypes = {};
var overwritable = exports.overwritable = {
    createKeyCompressor: create
};

exports['default'] = {
    rxdb: rxdb,
    prototypes: prototypes,
    overwritable: overwritable
};
