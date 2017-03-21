"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.create = create;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var QueryCache = function () {
    function QueryCache() {
        _classCallCheck(this, QueryCache);

        this._map = new WeakMap();
        this._set = new WeakSet();
        this._keys = {};
    }

    _createClass(QueryCache, [{
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