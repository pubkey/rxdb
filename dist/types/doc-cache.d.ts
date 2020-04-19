export declare class DocCache<T> {
    private _map;
    constructor();
    get(id: string): T | undefined;
    set(id: string, obj: T): Map<string, T>;
    delete(id: string): boolean;
}
export declare function createDocCache<T = any>(): DocCache<T>;
