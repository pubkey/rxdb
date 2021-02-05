import {
    PouchSettings
} from './pouch';
import {
    RxCollection,
    RxDumpCollection,
    RxDumpCollectionAsAny
} from './rx-collection';
import {
    RxLocalDocument
} from './rx-document';
import {
    RxDatabaseBase
} from '../rx-database';
import { Observable } from 'rxjs';

export interface RxDatabaseCreator {
    name: string;
    adapter: any;
    password?: string | any;
    multiInstance?: boolean;
    eventReduce?: boolean;
    ignoreDuplicate?: boolean;
    options?: any;
    pouchSettings?: PouchSettings;
}


/**
 * Options that can be passed to express-pouchdb
 * @link https://github.com/pouchdb/pouchdb-server#api
 */
export type PouchDBExpressServerOptions = {
    // a path to the configuration file to use. Defaults to './config.json'.
    configPath?: string;
    // a path to the log file to use. Defaults to './log.txt'.
    logPath?: string;
    // if all configuration should be in-memory. Defaults to false.
    inMemoryConfig?: boolean;
    // determines which parts of the HTTP API express-pouchdb offers are enabled
    mode?: 'fullCouchDB' | 'minimumForPouchDB' | 'custom',
    // Sometimes the preprogrammed modes are insufficient for your needs
    overrideMode?: {
        // a javascript array that specifies parts to include on top of the ones specified by opts.mode
        include?: any[];
        // a javascript array that specifies parts to exclude from the ones specified by opts.mode
        exclude?: any[];
    }
};

// options for the server-plugin
export interface ServerOptions {
    path?: string;
    port?: number;
    cors?: boolean;
    startServer?: boolean;
    pouchdbExpressOptions?: PouchDBExpressServerOptions;
}

export type CollectionsOfDatabase = { [key: string]: RxCollection };
export type RxDatabase<Collections = CollectionsOfDatabase> = RxDatabaseBase<Collections> &
    Collections & RxDatabaseGenerated<Collections>;

export interface RxLocalDocumentMutation<StorageType> {
    insertLocal<LocalDocType = any>(id: string, data: LocalDocType): Promise<
        RxLocalDocument<StorageType, LocalDocType>
    >;
    upsertLocal<LocalDocType = any>(id: string, data: LocalDocType): Promise<
        RxLocalDocument<StorageType, LocalDocType>
    >;
    getLocal<LocalDocType = any>(id: string): Promise<
        RxLocalDocument<StorageType, LocalDocType>
    >;
    getLocal$<LocalDocType = any>(id: string): Observable<
        RxLocalDocument<StorageType, LocalDocType> | null
    >;
}

export interface RxDatabaseGenerated<Collections> extends RxLocalDocumentMutation<RxDatabase<Collections>> { }

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
