import type {
    RxQuery,
    RxQueryOP,
    MangoQuery
} from './rx-query.d.ts';
import type {
    RxCollection,
    RxCollectionCreator
} from './rx-collection.d.ts';
import type {
    RxStorageInstanceCreationParams
} from './rx-storage.d.ts';
import type {
    DeepReadonly,
    FilledMangoQuery,
    RxDatabase,
    RxDatabaseCreator,
    RxDocument,
    RxStorage,
    RxReplicationWriteToMasterRow,
    WithDeleted,
    RxState,
    BulkWriteRow,
    RxStorageInstance
} from './index.d.ts';
import type { RxSchema } from '../rx-schema.d.ts';

export type RxPluginPrePrepareRxQueryArgs = {
    op: RxQueryOP;
    queryObj: MangoQuery | string | number | Array<any>;
    collection: RxCollection;
};

export type RxPluginPreCreateRxQueryArgs = {
    op: RxQueryOP;
    queryObj: MangoQuery;
    collection: RxCollection;
};

export type RxPluginPreAddRxPluginArgs = {
    // the plugin that is getting added
    plugin: RxPlugin | any;
    // previous added plugins
    plugins: Set<RxPlugin | any>;
};

export type RxPluginPrePrepareQueryArgs = {
    rxQuery: RxQuery<any>;
    mangoQuery: FilledMangoQuery<any>;
};


/**
 * Depending on which plugins are used together,
 * it is important that the plugin is able to define if
 * the hooks must be added as first or as last array item.
 * For example the encryption plugin must run encryption
 * before the key-compression changes the fieldnames.
 */
export type RxPluginHooks<Input> = {
    /**
     * Hook function that is added as first.
     */
    before?: (i: Input) => void;
    /**
     * Hook function that is added as last.
     */
    after?: (i: Input) => void;
};

export interface RxPlugin {
    /**
     * A string to uniquely identifies the plugin.
     * Can be used to throw when different versions of the same plugin are used.
     * And also other checks.
     * Use kebab-case.
     */
    readonly name: string;

    /**
     * set this to true so RxDB
     * knows that this object in a rxdb plugin
     */
    readonly rxdb: true;

    /**
     * Init function where dependent plugins could be added.
     * (optional)
     */
    init?(): any;

    prototypes?: {
        RxSchema?: (proto: RxSchema) => void;
        RxDocument?: (proto: RxDocument) => void;
        RxQuery?: (proto: RxQuery) => void;
        RxCollection?: (proto: RxCollection) => void;
        RxDatabase?: (proto: RxDatabase) => void;
    };
    overwritable?: {
        isDevMode?: () => boolean;
        deepFreezeWhenDevMode?: <T>(obj: T) => DeepReadonly<T>;
        validatePassword?: Function;
        checkAdapter?: Function;
        tunnelErrorMessage?: Function;
    };
    hooks?: {
        preAddRxPlugin?: RxPluginHooks<RxPluginPreAddRxPluginArgs>;
        preCreateRxDatabase?: RxPluginHooks<any>;
        createRxDatabase?: RxPluginHooks<{
            database: RxDatabase;
            creator: RxDatabaseCreator;
        }>;
        preCloseRxDatabase?: RxPluginHooks<RxDatabase>;
        postRemoveRxDatabase?: RxPluginHooks<{
            databaseName: string;
            storage: RxStorage<any, any>;
        }>;
        createRxCollection?: RxPluginHooks<{
            collection: RxCollection;
            creator: RxCollectionCreator;
        }>;
        createRxState?: RxPluginHooks<{
            collection: RxCollection;
            state: RxState<unknown, unknown>;
        }>;
        preCreateRxCollection?: RxPluginHooks<RxCollectionCreator<any> & {
            name: string;
            database: RxDatabase;
        }>;
        postCloseRxCollection?: RxPluginHooks<RxCollection>;
        postRemoveRxCollection?: RxPluginHooks<{
            storage: RxStorage<any, any>;
            databaseName: string;
            collectionName: string;
        }>;
        preCreateRxSchema?: RxPluginHooks<any>;
        createRxSchema?: RxPluginHooks<any>;
        prePrepareRxQuery?: RxPluginHooks<RxPluginPrePrepareRxQueryArgs>;
        preCreateRxQuery?: RxPluginHooks<RxPluginPreCreateRxQueryArgs>;
        prePrepareQuery?: RxPluginHooks<RxPluginPrePrepareQueryArgs>;
        createRxQuery?: RxPluginHooks<RxQuery>;
        createRxDocument?: RxPluginHooks<any>;
        postCreateRxDocument?: RxPluginHooks<any>;
        preCreateRxStorageInstance?: RxPluginHooks<RxStorageInstanceCreationParams<any, any>>;
        /**
         * Runs before a write to the storage instance of a RxCollection or RxDatabase.
         */
        preStorageWrite?: RxPluginHooks<{
            storageInstance: RxStorageInstance<any, any, any, any>;
            rows: BulkWriteRow<any>[];
        }>;
        preMigrateDocument?: RxPluginHooks<any>;
        postMigrateDocument?: RxPluginHooks<any>;
        postCleanup?: RxPluginHooks<{
            databaseName: string;
            collectionName: string;
        }>;
        preReplicationMasterWrite?: RxPluginHooks<{
            rows: RxReplicationWriteToMasterRow<any>[];
            collection: RxCollection;
        }>;
        preReplicationMasterWriteDocumentsHandle?: RxPluginHooks<{
            result: WithDeleted<any>[];
            collection: RxCollection;
        }>;
    };
}
