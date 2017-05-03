
// TODO this is wrong
// In a WeakMap, the keys are weak, not the values
// This must be reworked and the weak-thing must be tested

class DocCache {
    constructor() {
        this._map = new WeakMap();
        this._keys = {};
    }
    _getKeyById(id) {
        if (!this._keys[id])
            this._keys[id] = {};
        return this._keys[id];
    }
    _removeKey(id) {
        delete this._keys[id];
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
