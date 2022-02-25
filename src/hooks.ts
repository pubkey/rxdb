
/**
 * hook-functions that can be extended by the plugin
 */
export const HOOKS: { [k: string]: any[] } = {
    /**
     * Runs before a plugin is added.
     * Use this to block the usage of non-compatible plugins.
     */
    preAddRxPlugin: [],
    /**
     * functions that run before the database is created
     */
    preCreateRxDatabase: [],
    /**
     * runs after the database is created and prepared
     * but before the instance is returned to the user
     * @async
     */
    createRxDatabase: [],
    preCreateRxCollection: [],
    createRxCollection: [],
    /**
    * runs at the end of the destroy-process of a collection
    * @async
    */
    postDestroyRxCollection: [],
    /**
      * functions that get the json-schema as input
      * to do additionally checks/manipulation
      */
    preCreateRxSchema: [],
    /**
     * functions that run after the RxSchema is created
     * gets RxSchema as attribute
     */
    createRxSchema: [],
    preCreateRxQuery: [],
    createRxQuery: [],
    /**
     * Runs before a document is send to the query matcher.
     */
    preQueryMatcher: [],
    /**
     * Runs before a document is send to the sortComparator.
     */
    preSortComparator: [],
    /**
     * Runs before a query is send to the
     * prepareQuery function of the storage engine.
     */
    prePrepareQuery: [],
    /**
     * Runs before the document data is send to the
     * bulkWrite of the storage instance
     */
    preWriteToStorageInstance: [],
    /**
     * Runs after the document data is ready from
     * the RxStorage instance.
     */
    postReadFromInstance: [],
    preWriteAttachment: [],
    postReadAttachment: [],
    createRxDocument: [],
    /**
     * runs after a RxDocument is created,
     * cannot be async
     */
    postCreateRxDocument: [],
    /**
     * Runs before a RxStorageInstance is created
     * gets the params of createStorageInstance()
     * as attribute so you can manipulate them.
     * Notice that you have to clone stuff before mutating the inputs.
     */
    preCreateRxStorageInstance: [],
    /**
     * runs on the document-data before the document is migrated
     * {
     *   doc: Object, // originam doc-data
     *   migrated: // migrated doc-data after run throught migration-strategies
     * }
     */
    preMigrateDocument: [],
    /**
     * runs after the migration of a document has been done
     */
    postMigrateDocument: [],
    /**
     * runs at the beginning of the destroy-process of a database
     */
    preDestroyRxDatabase: []
};

export function runPluginHooks(hookKey: string, obj: any) {
    HOOKS[hookKey].forEach(fun => fun(obj));
}


/**
 * TODO
 * we should not run the hooks in parallel
 * this makes stuff unpredictable.
 */
export function runAsyncPluginHooks(hookKey: string, obj: any): Promise<any> {
    return Promise.all(
        HOOKS[hookKey].map(fun => fun(obj))
    );
}

/**
 * used in tests to remove hooks
 */
export function _clearHook(type: string, fun: Function) {
    HOOKS[type] = HOOKS[type].filter(h => h !== fun);
}
