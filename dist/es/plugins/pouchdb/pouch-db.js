/**
 * this handles the pouchdb-instance
 * to easy add modules and manipulate things
 * Adapters can be found here:
 * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
 */
import PouchDBCore from 'pouchdb-core'; // pouchdb-find

import PouchDBFind from 'pouchdb-find';
/*
// comment in to debug
const pouchdbDebug = require('pouchdb-debug');
PouchDB.plugin(pouchdbDebug);
PouchDB.debug.enable('*');
*/
// TODO we can delete most of these functions in the file because it was migrated to rx-storage-pouchdb

import { newRxError, newRxTypeError } from '../../rx-error';
import { addCustomEventsPluginToPouch } from './custom-events-plugin';
addPouchPlugin(PouchDBFind);
addCustomEventsPluginToPouch();
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
/**
 * get the correct function-name for pouchdb-replication
 */

export function pouchReplicationFunction(pouch, _ref) {
  var _ref$pull = _ref.pull,
      pull = _ref$pull === void 0 ? true : _ref$pull,
      _ref$push = _ref.push,
      push = _ref$push === void 0 ? true : _ref$push;
  if (pull && push) return pouch.sync.bind(pouch);
  if (!pull && push) return pouch.replicate.to.bind(pouch);
  if (pull && !push) return pouch.replicate.from.bind(pouch);

  if (!pull && !push) {
    throw newRxError('UT3', {
      pull: pull,
      push: push
    });
  }
}
export function isInstanceOf(obj) {
  return obj instanceof PouchDBCore;
}
/**
 * Add a pouchdb plugin to the pouchdb library.
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

  PouchDBCore.plugin(plugin);
}
export var PouchDB = PouchDBCore;
//# sourceMappingURL=pouch-db.js.map