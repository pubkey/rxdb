"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PouchDB = void 0;
exports.addPouchPlugin = addPouchPlugin;
exports.isInstanceOf = isInstanceOf;
exports.isLevelDown = isLevelDown;
exports.pouchReplicationFunction = pouchReplicationFunction;

var _pouchdbCore = _interopRequireDefault(require("pouchdb-core"));

var _pouchdbFind = _interopRequireDefault(require("pouchdb-find"));

var _rxError = require("../../rx-error");

var _customEventsPlugin = require("./custom-events-plugin");

/**
 * this handles the pouchdb-instance
 * to easy add modules and manipulate things
 * Adapters can be found here:
 * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
 */
// pouchdb-find

/*
// comment in to debug
const pouchdbDebug = require('pouchdb-debug');
PouchDB.plugin(pouchdbDebug);
PouchDB.debug.enable('*');
*/
// TODO we can delete most of these functions in the file because it was migrated to rx-storage-pouchdb
addPouchPlugin(_pouchdbFind["default"]);
(0, _customEventsPlugin.addCustomEventsPluginToPouch)();
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
/**
 * get the correct function-name for pouchdb-replication
 */


function pouchReplicationFunction(pouch, _ref) {
  var _ref$pull = _ref.pull,
      pull = _ref$pull === void 0 ? true : _ref$pull,
      _ref$push = _ref.push,
      push = _ref$push === void 0 ? true : _ref$push;
  if (pull && push) return pouch.sync.bind(pouch);
  if (!pull && push) return pouch.replicate.to.bind(pouch);
  if (pull && !push) return pouch.replicate.from.bind(pouch);

  if (!pull && !push) {
    throw (0, _rxError.newRxError)('UT3', {
      pull: pull,
      push: push
    });
  }
}

function isInstanceOf(obj) {
  return obj instanceof _pouchdbCore["default"];
}
/**
 * Add a pouchdb plugin to the pouchdb library.
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

  _pouchdbCore["default"].plugin(plugin);
}

var PouchDB = _pouchdbCore["default"];
exports.PouchDB = PouchDB;
//# sourceMappingURL=pouch-db.js.map