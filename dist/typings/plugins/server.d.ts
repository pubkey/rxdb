/// <reference types="node" />
import { RxDatabase } from '../types';
export declare function spawnServer(this: RxDatabase, { path, port, cors, startServer, }: {
    path?: string | undefined;
    port?: number | undefined;
    cors?: boolean | undefined;
    startServer?: boolean | undefined;
}): {
    app: import("express-serve-static-core").Express;
    server: import("http").Server | null;
};
/**
 * when a server is created, no more collections can be spawned
 */
declare function ensureNoMoreCollections(args: any): void;
/**
 * runs when the database gets destroyed
 */
export declare function onDestroy(db: any): void;
export declare const rxdb = true;
export declare const prototypes: {
    RxDatabase: (proto: any) => void;
};
export declare const hooks: {
    preDestroyRxDatabase: typeof onDestroy;
    preCreateRxCollection: typeof ensureNoMoreCollections;
};
export declare const overwritable: {};
declare const _default: {
    rxdb: boolean;
    prototypes: {
        RxDatabase: (proto: any) => void;
    };
    overwritable: {};
    hooks: {
        preDestroyRxDatabase: typeof onDestroy;
        preCreateRxCollection: typeof ensureNoMoreCollections;
    };
    spawnServer: typeof spawnServer;
};
export default _default;
