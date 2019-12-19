import {
    Observable
} from 'rxjs';
import {
    PouchSettings
} from './pouch';
import {
    RxCollection,
    RxCollectionCreator,
    RxDumpCollection,
    RxDumpCollectionAsAny
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
    RxDatabaseBase
} from '../rx-database';

export interface RxDatabaseCreator {
    name: string;
    adapter: any;
    password?: string | any;
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

export type CollectionsOfDatabase = { [key: string]: RxCollection };
export type RxDatabase<Collections = CollectionsOfDatabase> = RxDatabaseBase<Collections> &
    Collections & RxDatabaseGenerated<Collections>;


export interface RxDatabaseGenerated<Collections> {
    insertLocal(id: string, data: any): Promise<
        RxLocalDocument<RxDatabase<Collections>>
    >;
    upsertLocal(id: string, data: any): Promise<
        RxLocalDocument<RxDatabase<Collections>>
    >;
    getLocal(id: string): Promise<
        RxLocalDocument<RxDatabase<Collections>>
    >;
}

/**
 * Extract the **DocumentType** of a collection.
 */
type ExtractDTcol<P> = P extends RxCollection<infer T> ? T : { [prop: string]: any };

interface RxDumpDatabaseBase {
    encrypted: boolean;
    instanceToken: string;
    name: string;
    passwordHash: string | null;
}
export interface RxDumpDatabase<Col> extends RxDumpDatabaseBase {
    collections: RxDumpCollection<ExtractDTcol<Col[keyof Col]>>[];
}
/**
 * All base properties are typed as any because they can be encrypted.
 */
export interface RxDumpDatabaseAny<Col> extends RxDumpDatabaseBase {
    collections: RxDumpCollection<RxDumpCollectionAsAny<ExtractDTcol<Col[keyof Col]>>>[];
}
