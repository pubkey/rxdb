"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createDocCache = createDocCache;
exports.DocCache = void 0;

// TODO add a function to run a cache-clear
var DocCache = /*#__PURE__*/function () {
  function DocCache() {
    this._map = new Map();
    this._map = new Map();
  }

  var _proto = DocCache.prototype;

  _proto.get = function get(id) {
    return this._map.get(id);
  };

  _proto.set = function set(id, obj) {
    return this._map.set(id, obj);
  };

  _proto["delete"] = function _delete(id) {
    return this._map["delete"](id);
  };

  return DocCache;
}();

exports.DocCache = DocCache;

function createDocCache() {
  return new DocCache();
}

//# sourceMappingURL=doc-cache.js.map