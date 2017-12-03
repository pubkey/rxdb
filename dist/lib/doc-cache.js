"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require("babel-runtime/helpers/createClass");

var _createClass3 = _interopRequireDefault(_createClass2);

exports.create = create;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

// TODO add a function to run a cache-clear
var DocCache = function () {
    function DocCache() {
        (0, _classCallCheck3["default"])(this, DocCache);

        this._map = new Map();
    }

    (0, _createClass3["default"])(DocCache, [{
        key: "get",
        value: function get(id) {
            return this._map.get(id);
        }
    }, {
        key: "set",
        value: function set(id, obj) {
            return this._map.set(id, obj);
        }
    }, {
        key: "delete",
        value: function _delete(id) {
            delete this._map["delete"](id);
        }
    }]);
    return DocCache;
}();

;

function create() {
    return new DocCache();
}

exports["default"] = {
    create: create
};
