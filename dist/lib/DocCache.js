"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.create = create;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// TODO this is wrong
// In a WeakMap, the keys are weak, not the values
// This must be reworked and the weak-thing must be tested

var DocCache = function () {
    function DocCache() {
        _classCallCheck(this, DocCache);

        this._map = new WeakMap();
        this._keys = {};
    }

    _createClass(DocCache, [{
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
