/**
 * stores the hooks that where added by the plugins
 */

/**
 * hook-functions that can be extended by the plugin
 */
export const HOOKS = {
    createRxDatabase: [],
    createRxCollection: [],
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
    createRxQuery: [],
    createRxDocument: [],
    /**
     * runs after a RxDocument is created,
     * async
     * @type {Array}
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
     * @type {Array}
     */
    preCreatePouchDb: [],
    /**
     * runs on the document-data before the document is migrated
     * {
     *   doc: Object, // originam doc-data
     *   migrated: // migrated doc-data after run throught migration-strategies
     * }
     * @type {Array}
     */
    preMigrateDocument: [],
    /**
     * runs after the migration of a document has been done
     * @type {Array}
     */
    postMigrateDocument: []
};

export function runPluginHooks(hookKey, obj) {
    HOOKS[hookKey].forEach(fun => fun(obj));
}

export async function runAsyncPluginHooks(hookKey, obj) {
    return Promise.all(
        HOOKS[hookKey].map(fun => fun(obj))
    );
};

export default {
    runPluginHooks,
    runAsyncPluginHooks,
    HOOKS
};
