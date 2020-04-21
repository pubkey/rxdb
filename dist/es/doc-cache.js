export var DocCache = /*#__PURE__*/function () {
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
export function createDocCache() {
  return new DocCache();
}
//# sourceMappingURL=doc-cache.js.map