"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PouchDB = void 0;
exports.addPouchPlugin = addPouchPlugin;
exports.isInstanceOf = isInstanceOf;
exports.isLevelDown = isLevelDown;
var _pouchdbCore = _interopRequireDefault(require("pouchdb-core"));
var _rxError = require("../../rx-error");
/**
 * this handles the pouchdb-instance
 * to easy add modules and manipulate things
 * Adapters can be found here:
 * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
 */

/*
// comment in to debug
const pouchdbDebug = require('pouchdb-debug');
PouchDB.plugin(pouchdbDebug);
PouchDB.debug.enable('*');
*/

/**
 * check if the given module is a leveldown-adapter
 * throws if not
 */
function isLevelDown(adapter) {
  if (!adapter || typeof adapter.super_ !== 'function') {
    throw (0, _rxError.newRxError)('UT4', {
      adapter: adapter
    });
  }
}
function isInstanceOf(obj) {
  return obj instanceof _pouchdbCore["default"];
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
function addPouchPlugin(plugin) {
  if (plugin.rxdb) {
    throw (0, _rxError.newRxTypeError)('PL2', {
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
    _pouchdbCore["default"].plugin(plugin);
  }
}
var PouchDB = _pouchdbCore["default"];
exports.PouchDB = PouchDB;
//# sourceMappingURL=pouch-db.js.map