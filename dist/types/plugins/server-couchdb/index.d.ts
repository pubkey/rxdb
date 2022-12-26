import type { RxDatabase, RxPlugin, CouchDBServerResponse } from '../../types';
export declare function spawnServer(this: RxDatabase, { path, port, cors, startServer, pouchdbExpressOptions }: {
    path?: string | undefined;
    port?: number | undefined;
    cors?: boolean | undefined;
    startServer?: boolean | undefined;
    pouchdbExpressOptions?: {} | undefined;
}): Promise<CouchDBServerResponse>;
/**
 * runs when the database gets destroyed
 */
export declare function onDestroy(db: RxDatabase): void;
export declare const RxDBServerCouchDBPlugin: RxPlugin;
