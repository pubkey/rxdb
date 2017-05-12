"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.create = create;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// TODO add a function to run a cache-clear

var DocCache = function () {
    function DocCache() {
        _classCallCheck(this, DocCache);

        this._map = {};
    }

    _createClass(DocCache, [{
        key: "get",
        value: function get(id) {
            return this._map[id];
        }
    }, {
        key: "set",
        value: function set(id, obj) {
            return this._map[id] = obj;
        }
    }, {
        key: "delete",
        value: function _delete(id) {
            delete this._map[id];
        }
    }]);

    return DocCache;
}();

;

function create() {
    return new DocCache();
}
