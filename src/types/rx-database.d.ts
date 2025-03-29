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
import type { ById, HashFunction } from './util.d.ts';
import type { RxReactivityFactory } from './plugins/reactivity.d.ts';

export interface RxDatabaseCreator<Internals = any, InstanceCreationOptions = any, Reactivity = unknown> {
    storage: RxStorage<Internals, InstanceCreationOptions>;
    instanceCreationOptions?: InstanceCreationOptions;
    name: string;
    password?: string | any;
    multiInstance?: boolean;
    eventReduce?: boolean;
    ignoreDuplicate?: boolean;
    options?: any;
    cleanupPolicy?: Partial<RxCleanupPolicy>;
    closeDuplicates?: boolean;
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
     * Default is the sha256 from crypto.subtle.digest('SHA-256', data)
     */
    hashFunction?: HashFunction;

    /**
     * By default, count() queries in 'slow' mode are not allowed.
     */
    allowSlowCount?: boolean;

    /**
     * Can be used to add a custom reactivity Factory
     * that is used on all getters and values that end with the double $$.
     * For example you can use the signals api of your framework and vuejs ref()
     */
    reactivity?: RxReactivityFactory<Reactivity>;
}

export type CollectionsOfDatabase = ById<RxCollection>;
export type RxDatabase<
    Collections = CollectionsOfDatabase,
    Internals = any,
    InstanceCreationOptions = any,
    Reactivity = any
> = RxDatabaseBase<
    Internals,
    InstanceCreationOptions,
    Collections,
    Reactivity
> & Collections & RxDatabaseGenerated<Collections, Reactivity>;


export interface RxLocalDocumentMutation<StorageType, Reactivity = unknown> {
    insertLocal<LocalDocType = any>(id: string, data: LocalDocType): Promise<
        RxLocalDocument<StorageType, LocalDocType, Reactivity>
    >;
    upsertLocal<LocalDocType = any>(id: string, data: LocalDocType): Promise<
        RxLocalDocument<StorageType, LocalDocType, Reactivity>
    >;
    getLocal<LocalDocType = any>(id: string): Promise<
        RxLocalDocument<StorageType, LocalDocType, Reactivity> | null
    >;
    getLocal$<LocalDocType = any>(id: string): Observable<
        RxLocalDocument<StorageType, LocalDocType, Reactivity> | null
    >;
}

export interface RxDatabaseGenerated<Collections, Reactivity> extends RxLocalDocumentMutation<RxDatabase<Collections, any, any, Reactivity>> { }

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
