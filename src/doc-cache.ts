// TODO add a function to run a cache-clear
export class DocCache {
    constructor() {
        this._map = new Map();
    }

    get(id) {
        return this._map.get(id);
    }
    set(id, obj) {
        return this._map.set(id, obj);
    }
    delete(id) {
        delete this._map.delete(id);
    }
}

export function createDocCache() {
    return new DocCache();
}