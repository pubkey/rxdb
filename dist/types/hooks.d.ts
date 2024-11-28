/**
 * hook-functions that can be extended by the plugin
 */
export declare const HOOKS: {
    /**
     * Runs before a plugin is added.
     * Use this to block the usage of non-compatible plugins.
     */
    preAddRxPlugin: never[];
    /**
     * functions that run before the database is created
     */
    preCreateRxDatabase: never[];
    /**
     * runs after the database is created and prepared
     * but before the instance is returned to the user
     * @async
     */
    createRxDatabase: never[];
    preCreateRxCollection: never[];
    createRxCollection: never[];
    createRxState: never[];
    /**
    * runs at the end of the close-process of a collection
    * @async
    */
    postCloseRxCollection: never[];
    /**
     * Runs after a collection is removed.
     * @async
     */
    postRemoveRxCollection: never[];
    /**
      * functions that get the json-schema as input
      * to do additionally checks/manipulation
      */
    preCreateRxSchema: never[];
    /**
     * functions that run after the RxSchema is created
     * gets RxSchema as attribute
     */
    createRxSchema: never[];
    prePrepareRxQuery: never[];
    preCreateRxQuery: never[];
    /**
     * Runs before a query is send to the
     * prepareQuery function of the storage engine.
     */
    prePrepareQuery: never[];
    createRxDocument: never[];
    /**
     * runs after a RxDocument is created,
     * cannot be async
     */
    postCreateRxDocument: never[];
    /**
     * Runs before a RxStorageInstance is created
     * gets the params of createStorageInstance()
     * as attribute so you can manipulate them.
     * Notice that you have to clone stuff before mutating the inputs.
     */
    preCreateRxStorageInstance: never[];
    preStorageWrite: never[];
    /**
     * runs on the document-data before the document is migrated
     * {
     *   doc: Object, // original doc-data
     *   migrated: // migrated doc-data after run through migration-strategies
     * }
     */
    preMigrateDocument: never[];
    /**
     * runs after the migration of a document has been done
     */
    postMigrateDocument: never[];
    /**
     * runs at the beginning of the close-process of a database
     */
    preCloseRxDatabase: never[];
    /**
     * runs after a database has been removed
     * @async
     */
    postRemoveRxDatabase: never[];
    postCleanup: never[];
    /**
     * runs before the replication writes the rows to master
     * but before the rows have been modified
     * @async
     */
    preReplicationMasterWrite: never[];
    /**
     * runs after the replication has been sent to the server
     * but before the new documents have been handled
     * @async
     */
    preReplicationMasterWriteDocumentsHandle: never[];
};
export declare function runPluginHooks(hookKey: keyof typeof HOOKS, obj: any): void;
/**
 * We do intentionally not run the hooks in parallel
 * because that makes stuff unpredictable and we use runAsyncPluginHooks()
 * only in places that are not that relevant for performance.
 */
export declare function runAsyncPluginHooks(hookKey: keyof typeof HOOKS, obj: any): Promise<any>;
/**
 * used in tests to remove hooks
 */
export declare function _clearHook(type: keyof typeof HOOKS, fun: Function): void;
