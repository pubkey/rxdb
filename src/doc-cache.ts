// TODO add a function to run a cache-clear
export class DocCache<T> {
    private _map: Map<string, T> = new Map();
    constructor() {
        this._map = new Map();
    }

    get(id: string): T {
        return this._map.get(id);
    }
    set(id: string, obj: T) {
        return this._map.set(id, obj);
    }
    delete(id: string) {
        return this._map.delete(id);
    }
}

export function createDocCache<T = any>(): DocCache<T> {
    return new DocCache();
}