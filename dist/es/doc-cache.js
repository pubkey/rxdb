import _classCallCheck from "babel-runtime/helpers/classCallCheck";

// TODO add a function to run a cache-clear

var DocCache = function () {
    function DocCache() {
        _classCallCheck(this, DocCache);

        this._map = {};
    }

    DocCache.prototype.get = function get(id) {
        return this._map[id];
    };

    DocCache.prototype.set = function set(id, obj) {
        return this._map[id] = obj;
    };

    DocCache.prototype["delete"] = function _delete(id) {
        delete this._map[id];
    };

    return DocCache;
}();

;

export function create() {
    return new DocCache();
}

export default {
    create: create
};