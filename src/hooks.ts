/**
 * stores the hooks that where added by the plugins
 */

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
    createRxDocument: [],
    /**
     * runs after a RxDocument is created,
     * cannot be async
     */
    postCreateRxDocument: [],
    /**
     * runs before a pouchdb-instance is created
     * gets pouchParameters as attribute so you can manipulate them
     * {
     *   location: string,
     *   adapter: any,
     *   settings: object
     * }
     */
    preCreatePouchDb: [],
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
    const hook = HOOKS[hookKey];
    if (!hook) throw new Error(`hook is undefined.`);
    hook.forEach(fun => fun(obj));
}


/**
 * TODO
 * we should not run the hooks in parallel
 * this makes stuff unpredictable.
 */
export function runAsyncPluginHooks(hookKey: string, obj: any): Promise<any> {
    const hook = HOOKS[hookKey];
    if (!hook) throw new Error(`hook is undefined.`);
    return Promise.all(
        hook.map(fun => fun(obj))
    );
}

/**
 * used in tests to remove hooks
 */
export function _clearHook(type: string, fun: Function) {
    const hook = HOOKS[type];
    if (!hook) throw new Error(`hook is undefined.`);
    HOOKS[type] = hook.filter(h => h !== fun);
}
