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

/**
 * Options for creating an RxDatabase instance.
 *
 * ## Preferred `database/` folder structure
 *
 * Keep all database-related code under a single `database/` folder so that
 * every collection follows the same layout and is easy to locate.
 *
 * ```txt
 * src/
 *   database/
 *     index.ts          ← createRxDatabase() call, exports the db instance and entity RxDocument/RxCollection types.
 *     plugins.ts        ← addRxPlugin() calls (dev-mode, validate, etc.)
 *     storage.ts        ← contains the storage configuration(s)
 *     collections/
 *       todos/
 *         schema.ts     ← schema literal + derived TypeScript type
 *         methods.ts    ← document-level ORM methods
 *         hooks.ts      ← pre/post insert/save/remove hooks
 *         migration.ts  ← migrationStrategies per version
 *       users/
 *         schema.ts
 *         methods.ts
 *         hooks.ts
 *         migration.ts
 *     replication.ts    ← replication setup, starts the replication of all collections
 * ```
 *
 */
export interface RxDatabaseCreator<Internals = any, InstanceCreationOptions = any, Reactivity = unknown> {
    /**
     * The RxStorage implementation that persists documents.
     *
     * In development, wrap the storage with one of the RxDB schema-validator
     * plugins so that every write is checked against the collection schema and
     * schema errors surface with a clear message instead of silently corrupting
     * data.
     *
     * See the schema validation docs for available validator wrappers:
     * {@link https://rxdb.info/schema-validation.html}
     *
     * Remove the wrapper in production builds — validation adds overhead that is
     * not needed once the schema is stable.
     *
     * @example
     * ```ts
     * import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
     * import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
     *
     * const storage = process.env.NODE_ENV !== 'production'
     *   ? wrappedValidateAjvStorage({ storage: getRxStorageDexie() })
     *   : getRxStorageDexie();
     * ```
     */
    storage: RxStorage<Internals, InstanceCreationOptions>;
    instanceCreationOptions?: InstanceCreationOptions;
    name: string;
    /**
     * Typed as `any` because different encryption plugins
     * may use passwords that are not strings.
     */
    password?: string | any;
    multiInstance?: boolean;
    eventReduce?: boolean;
    ignoreDuplicate?: boolean;
    options?: any;
    /**
     * When set to a positive number (in milliseconds), live query updates triggered by
     * write events are grouped using auditTime before _ensureEqual() runs.
     * This reduces the number of expensive live-query reruns during write bursts.
     * The first query result is always emitted immediately.
     * Defaults to 0 (disabled).
     * Can be overridden per collection via RxCollectionCreator.liveQueryUpdateThrottleTime.
     */
    liveQueryUpdateThrottleTime?: number;
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
export interface RxDumpDatabaseAny<Col> extends RxDumpDatabaseBase {
    collections: RxDumpCollection<RxDumpCollectionAsAny<ExtractDTcol<Col[keyof Col]>>>[];
}



export type RxCollectionCreatedEvent = {
    type: 'ADDED';
    collection: RxCollection;
};

export type RxCollectionClosedEvent = {
    type: 'CLOSED';
    collection: RxCollection;
};

/**
 * Fired on RxDatabase.collection$
 */
export type RxCollectionEvent =
    | RxCollectionCreatedEvent
    | RxCollectionClosedEvent;
