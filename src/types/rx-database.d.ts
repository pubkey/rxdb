import type {
    RxCollection,
    RxDumpCollection,
    RxDumpCollectionAsAny
} from './rx-collection.d.ts';
import type {
    RxDatabaseBase
} from '../rx-database.d.ts';
import { Observable } from 'rxjs';
import type { RxStorage } from './rx-storage.interface.d.ts';
import type { RxLocalDocument } from './plugins/local-documents.d.ts';
import type { RxCleanupPolicy } from './plugins/cleanup.d.ts';
import type { HashFunction } from './util.d.ts';

export interface RxDatabaseCreator<Internals = any, InstanceCreationOptions = any> {
    storage: RxStorage<Internals, InstanceCreationOptions>;
    instanceCreationOptions?: InstanceCreationOptions;
    name: string;
    password?: string | any;
    multiInstance?: boolean;
    eventReduce?: boolean;
    ignoreDuplicate?: boolean;
    options?: any;
    cleanupPolicy?: Partial<RxCleanupPolicy>;
    /**
     * Set this to true if you want to store local documents
     * in the RxDatabase instance.
     */
    localDocuments?: boolean;

    /**
     * Hash method used to hash strings and json-stringified objects.
     * This hash does not have to be cryptographically secure,
     * but it is very important that is does have not create
     * collisions.
     * Default is the sha256 from the ohash library
     * @link https://www.npmjs.com/package/ohash
     */
    hashFunction?: HashFunction;

    /**
     * By default, count() queries in 'slow' mode are not allowed.
     */
    allowSlowCount?: boolean;
}

export type CollectionsOfDatabase = { [key: string]: RxCollection; };
export type RxDatabase<
    Collections = CollectionsOfDatabase,
    Internals = any,
    InstanceCreationOptions = any,
> = RxDatabaseBase<
    Internals,
    InstanceCreationOptions,
    Collections
> &
    Collections & RxDatabaseGenerated<Collections>;


export interface RxLocalDocumentMutation<StorageType> {
    insertLocal<LocalDocType = any>(id: string, data: LocalDocType): Promise<
        RxLocalDocument<StorageType, LocalDocType>
    >;
    upsertLocal<LocalDocType = any>(id: string, data: LocalDocType): Promise<
        RxLocalDocument<StorageType, LocalDocType>
    >;
    getLocal<LocalDocType = any>(id: string): Promise<
        RxLocalDocument<StorageType, LocalDocType> | null
    >;
    getLocal$<LocalDocType = any>(id: string): Observable<
        RxLocalDocument<StorageType, LocalDocType> | null
    >;
}

export interface RxDatabaseGenerated<Collections> extends RxLocalDocumentMutation<RxDatabase<Collections>> { }

/**
 * Extract the **DocumentType** of a collection.
 */
type ExtractDTcol<P> = P extends RxCollection<infer T> ? T : { [prop: string]: any; };

interface RxDumpDatabaseBase {
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
