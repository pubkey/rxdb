/**
 * this handles the pouchdb-instance
 * to easy add modules and manipulate things
 * Adapters can be found here:
 * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
 */
import PouchDBCore from 'pouchdb-core';

/*
// comment in to debug
const pouchdbDebug = require('pouchdb-debug');
PouchDB.plugin(pouchdbDebug);
PouchDB.debug.enable('*');
*/

import { newRxError, newRxTypeError } from '../../rx-error';

/**
 * check if the given module is a leveldown-adapter
 * throws if not
 */
export function isLevelDown(adapter) {
  if (!adapter || typeof adapter.super_ !== 'function') {
    throw newRxError('UT4', {
      adapter: adapter
    });
  }
}
export function isInstanceOf(obj) {
  return obj instanceof PouchDBCore;
}

/**
 * Adding a PouchDB plugin multiple times,
 * can sometimes error. So we have to check if the plugin
 * was added before.
 */
var ADDED_POUCH_PLUGINS = new Set();

/**
 * Add a pouchdb plugin to the pouchdb library.
 * @deprecated PouchDB RxStorage is deprecated, see
 * @link https://rxdb.info/questions-answers.html#why-is-the-pouchdb-rxstorage-deprecated
 */
export function addPouchPlugin(plugin) {
  if (plugin.rxdb) {
    throw newRxTypeError('PL2', {
      plugin: plugin
    });
  }
  /**
   * Pouchdb has confusing typings and modules.
   * So we monkeypatch the plugin to use the default property
   * when it was imported or packaged this way.
   */
  if (typeof plugin === 'object' && plugin["default"]) {
    plugin = plugin["default"];
  }
  if (!ADDED_POUCH_PLUGINS.has(plugin)) {
    ADDED_POUCH_PLUGINS.add(plugin);
    PouchDBCore.plugin(plugin);
  }
}
export var PouchDB = PouchDBCore;
//# sourceMappingURL=pouch-db.js.map