/**
 * stores the hooks that where added by the plugins
 */

/**
 * hook-functions that can be extended by the plugin
 */
export var HOOKS = {
  createRxDatabase: [],
  preCreateRxCollection: [],
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
   * cannot be async
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
  postMigrateDocument: [],

  /**
   * runs at the beginning of the destroy-process of a database
   * @type {Array}
   */
  preDestroyRxDatabase: []
};
export function runPluginHooks(hookKey, obj) {
  HOOKS[hookKey].forEach(function (fun) {
    return fun(obj);
  });
}
/**
 * @return {Promise}
 */

export function runAsyncPluginHooks(hookKey, obj) {
  return Promise.all(HOOKS[hookKey].map(function (fun) {
    return fun(obj);
  }));
}
/**
 * used in tests to remove hooks
 */

export function clearHook(type, fun) {
  HOOKS[type] = HOOKS[type].filter(function (h) {
    return h !== fun;
  });
}
export default {
  runPluginHooks: runPluginHooks,
  runAsyncPluginHooks: runAsyncPluginHooks,
  HOOKS: HOOKS
};