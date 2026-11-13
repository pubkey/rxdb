import type {
    RxDatabase,
    RxStorage
} from '../../types/index.d.ts';

/**
 * Messages that are exchanged between the JavaScript runtime
 * and the Dart runtime. Both sides send the same message shapes,
 * so each side can make requests to the other side.
 */
export type FlutterBridgeRequest = {
    t: 'req';
    id: number;
    /**
     * Method name
     */
    m: string;
    /**
     * Params
     */
    p: any;
};
export type FlutterBridgeResponse = {
    t: 'res';
    id: number;
    /**
     * Result, only set on success.
     */
    r?: any;
    /**
     * Error, only set on failure.
     */
    e?: FlutterBridgeError;
};
/**
 * Emitted value of a subscription
 * that was started via the 'sub.start' request.
 */
export type FlutterBridgeEvent = {
    t: 'evt';
    /**
     * Subscription id
     */
    s: string;
    v?: any;
    e?: FlutterBridgeError;
    /**
     * Set to 1 when the observable has completed.
     */
    c?: 1;
};
export type FlutterBridgeLog = {
    t: 'log';
    level: 'log' | 'info' | 'warn' | 'error' | 'debug';
    args: string[];
};
export type FlutterBridgeReady = {
    t: 'ready';
    version: string;
};

export type FlutterBridgeMessage =
    FlutterBridgeRequest |
    FlutterBridgeResponse |
    FlutterBridgeEvent |
    FlutterBridgeLog |
    FlutterBridgeReady;

export type FlutterBridgeError = {
    name?: string;
    message: string;
    code?: string;
    parameters?: any;
    stack?: string;
};

export type FlutterCollectionCreator = {
    schema: any;
    /**
     * Versions for which the Dart side has a migration strategy.
     * The migration itself runs in Dart.
     */
    migrationStrategyVersions?: number[];
    autoMigrate?: boolean;
    localDocuments?: boolean;
};

export type FlutterDatabaseCreationParams = {
    dbId: string;
    name: string;
    multiInstance?: boolean;
    eventReduce?: boolean;
    localDocuments?: boolean;
    ignoreDuplicate?: boolean;
    closeDuplicates?: boolean;
    allowSlowCount?: boolean;
    /**
     * Any JSON data that the Dart side
     * passes to a custom database creator.
     */
    options?: any;
};

/**
 * A custom database creator can be set with setFlutterRxDatabaseConnector()
 * when you build your own JavaScript bundle, for example to use a different
 * RxStorage or additional plugins.
 */
export type CreateRxDatabaseFunctionType = (
    databaseName: string,
    params: FlutterDatabaseCreationParams,
    helpers: {
        /**
         * The storage given to startRxDBFlutterBridge() or,
         * if none was given, the SQLite trial storage.
         * Both store the data via the Dart sqlite3 package.
         */
        storage: RxStorage<any, any>;
    }
) => Promise<RxDatabase>;

export type FlutterBridgeOptions = {
    /**
     * The RxStorage that the default database creator uses.
     * Defaults to the SQLite trial storage. To use the RxDB Premium
     * SQLite storage, pass getRxStorageSQLite({ sqliteBasics: getSQLiteBasicsFlutter() })
     * from 'rxdb-premium/plugins/storage-sqlite'.
     * All other database options are still set from the Dart side.
     */
    storage?: RxStorage<any, any>;
    /**
     * Replaces the default database creator completely,
     * for example to add RxDB plugins or hooks.
     * QuickJS has no crypto.subtle, so the created database
     * must use hashFunction: flutterHashSha256.
     */
    createDatabase?: CreateRxDatabaseFunctionType;
};
