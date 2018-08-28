// TODO add a function to run a cache-clear
var DocCache =
/*#__PURE__*/
function () {
  function DocCache() {
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
    delete this._map["delete"](id);
  };

  return DocCache;
}();

export function create() {
  return new DocCache();
}
export default {
  create: create
};