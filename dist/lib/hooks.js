"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.runPluginHooks = runPluginHooks;
/**
 * stores the hooks that where added by the plugins
 */

/**
 * hook-functions that can be extended by the plugin
 */
var HOOKS = exports.HOOKS = {
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
   * runs before a pouchdb-instance is created
   * gets pouchParameters as attribute so you can manipulate them
   * {
   *   location: string,
   *   adapter: any,
   *   settings: object
   * }
   * @type {Array}
   */
  preCreatePouchDb: []
};

function runPluginHooks(hookKey, obj) {
  HOOKS[hookKey].forEach(function (fun) {
    return fun(obj);
  });
}

exports["default"] = {
  runPluginHooks: runPluginHooks,
  HOOKS: HOOKS
};
