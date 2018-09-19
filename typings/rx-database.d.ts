import { Observable } from 'rxjs';
import BroadcastChannel from 'broadcast-channel';

import {
    RxCollectionCreator,
    RxCollection
} from './rx-collection';

import {
    RxLocalDocument
} from './rx-document';
import {
    RxChangeEventInsert,
    RxChangeEventUpdate,
    RxChangeEventRemove,
    RxChangeEventCollection
} from './rx-change-event';

import {
    PouchSettings
} from "./pouch";

export interface RxDatabaseCreator {
    name: string;
    adapter: any;
    password?: string;
    multiInstance?: boolean;
    queryChangeDetection?: boolean;
    ignoreDuplicate?: boolean;
    options?: any;
    pouchSettings?: PouchSettings;
}

// options for the server-plugin
export interface ServerOptions {
    path?: string;
    port?: number;
    cors?: boolean;
}

export type RxDatabase<Collections = { [key: string]: RxCollection }> = RxDatabaseBase<Collections> & Collections;


type collectionCreateType =
    <RxDocumentType = any, OrmMethods = {}, StaticMethods = { [key: string]: any }>
    (args: RxCollectionCreator) => Promise<RxCollection<RxDocumentType, OrmMethods, StaticMethods>>;

export declare class RxDatabaseBase<Collections= { [key: string]: RxCollection }> {
    readonly name: string;
    readonly token: string;
    readonly multiInstance: boolean;
    readonly queryChangeDetection: boolean;
    readonly broadcastChannel: BroadcastChannel;
    readonly password: string;
    readonly collections: any;
    options?: any;
    pouchSettings?: PouchSettings;

    readonly $: Observable<RxChangeEventInsert<any> | RxChangeEventUpdate<any> | RxChangeEventRemove<any> | RxChangeEventCollection>;

    collection: collectionCreateType;
    destroy(): Promise<boolean>;
    dump(): Promise<any>;
    importDump(json: any): Promise<any>;
    remove(): Promise<any>;

    readonly isLeader: boolean;

    insertLocal(id: string, data: any): Promise<RxLocalDocument<RxDatabase<Collections>>>;
    upsertLocal(id: string, data: any): Promise<RxLocalDocument<RxDatabase<Collections>>>;
    getLocal(id: string): Promise<RxLocalDocument<RxDatabase<Collections>>>;

    // from rxdb/plugins/server
    server(options?: ServerOptions): {
        app: any;
        server: any;
    };

    /**
     * returns a promise which resolves when the instance becomes leader
     * @return {Promise<boolean>}
     */
    waitForLeadership(): Promise<boolean>;

    /**
     * removes all internal collection-info
     * only use this if you have to upgrade from a major rxdb-version
     * do NEVER use this to change the schema of a collection
     */
    dangerousRemoveCollectionInfo(): Promise<void>;
}
