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

var QueryCache = function () {
    function QueryCache() {
        (0, _classCallCheck3.default)(this, QueryCache);

        this._map = new WeakMap();
        this._set = new WeakSet();
        this._keys = {};
    }

    (0, _createClass3.default)(QueryCache, [{
        key: "_getKeyByMQuery",
        value: function _getKeyByMQuery(mquery) {
            // TODO
        }
    }, {
        key: "_removeKeyByMQuery",
        value: function _removeKeyByMQuery(mquery) {}
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
    return QueryCache;
}();

;

function create() {
    return new DocCache();
}