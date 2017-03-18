class QueryCache {
    constructor() {
        this._map = new WeakMap();
        this._set = new WeakSet();
        this._keys = {};
    }
    _getKeyByMQuery(mquery) {
      // TODO
    }
    _removeKeyByMQuery(mquery) {
    }
    get(id) {
        return this._map.get(this._getKeyById(id));
    }
    set(id, obj) {
        return this._map.set(this._getKeyById(id), obj);
    }
    delete(id) {
        this._map.delete(this._getKeyById(id));
        this._removeKey(id);
    }
};

export function create() {
    return new DocCache();
}
