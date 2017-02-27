"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require("babel-runtime/helpers/createClass");

var _createClass3 = _interopRequireDefault(_createClass2);

exports.create = create;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DocCache = function () {
    function DocCache() {
        (0, _classCallCheck3.default)(this, DocCache);

        this._map = new WeakMap();
        this._keys = {};
    }

    (0, _createClass3.default)(DocCache, [{
        key: "_getKeyById",
        value: function _getKeyById(id) {
            if (!this._keys[id]) this._keys[id] = {};
            return this._keys[id];
        }
    }, {
        key: "_removeKey",
        value: function _removeKey(id) {
            delete this._keys[id];
        }
    }, {
        key: "get",
        value: function get(id) {
            return this._map.get(this._getKeyById(id));
        }
    }, {
        key: "set",
        value: function set(id, obj) {
            return this._map.set(this._getKeyById(id), obj);
        }
    }, {
        key: "delete",
        value: function _delete(id) {
            this._map.delete(this._getKeyById(id));
            this._removeKey(id);
        }
    }]);
    return DocCache;
}();

;

function create() {
    return new DocCache();
}