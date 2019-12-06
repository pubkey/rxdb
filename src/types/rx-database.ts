import { RxDatabaseBase } from '../rx-database';
import { PouchSettings } from './pouch';
import { RxCollection, RxDumpCollection, RxDumpCollectionAsAny } from './rx-collection';
import { RxLocalDocument } from './rx-document';

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
type ExtractDT<P> = P extends RxCollection<infer T> ? T : never;

interface RxDumpDatabaseBase {
    encrypted: boolean;
    instanceToken: string;
    name: string;
    passwordHash: string | null;
}
export interface RxDumpDatabase<Col> extends RxDumpDatabaseBase {
    collections: RxDumpCollection<ExtractDT<Col[keyof Col]>>[];
}
export interface RxDumpDatabaseEncrypted<Col> extends RxDumpDatabaseBase {
    collections: RxDumpCollection<RxDumpCollectionAsAny<ExtractDT<Col[keyof Col]>>>[];
}
export interface RxDumpDatabaseImport<Col> extends RxDumpDatabaseBase {
    collections: RxDumpCollection<RxDumpCollectionAsAny<ExtractDT<Col[keyof Col]>>>[];
}
