
// TODO add a function to run a cache-clear

class DocCache {
    constructor() {
        this._map = {};
    }

    get(id) {
        return this._map[id];
    }
    set(id, obj) {
        return this._map[id] = obj;
    }
    delete(id) {
        delete this._map[id];
    }
};

export function create() {
    return new DocCache();
}

export default {
    create
};
