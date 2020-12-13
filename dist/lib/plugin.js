"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addRxPlugin = addRxPlugin;

var _rxSchema = require("./rx-schema");

var _crypter = require("./crypter");

var _rxDocument = require("./rx-document");

var _rxQuery = require("./rx-query");

var _rxCollection = require("./rx-collection");

var _rxDatabase = require("./rx-database");

var _pouchDb = require("./pouch-db");

var _overwritable = require("./overwritable");

var _hooks = require("./hooks");

/**
 * this handles how plugins are added to rxdb
 * basically it changes the internal prototypes
 * by passing them to the plugins-functions
 */

/**
 * prototypes that can be manipulated with a plugin
 */
var PROTOTYPES = {
  RxSchema: _rxSchema.RxSchema.prototype,
  Crypter: _crypter.Crypter.prototype,
  RxDocument: _rxDocument.basePrototype,
  RxQuery: _rxQuery.RxQueryBase.prototype,
  RxCollection: _rxCollection.RxCollectionBase.prototype,
  RxDatabase: _rxDatabase.RxDatabaseBase.prototype
};
var ADDED_PLUGINS = new Set();

function addRxPlugin(plugin) {
  (0, _hooks.runPluginHooks)('preAddRxPlugin', {
    plugin: plugin,
    plugins: ADDED_PLUGINS
  }); // do nothing if added before

  if (ADDED_PLUGINS.has(plugin)) {
    return;
  } else {
    ADDED_PLUGINS.add(plugin);
  }

  if (!plugin.rxdb) {
    // pouchdb-plugin
    if (typeof plugin === 'object' && plugin["default"]) plugin = plugin["default"];

    _pouchDb.PouchDB.plugin(plugin);

    return;
  }

  var rxPlugin = plugin; // prototype-overwrites

  if (rxPlugin.prototypes) {
    Object.entries(plugin.prototypes).forEach(function (_ref) {
      var name = _ref[0],
          fun = _ref[1];
      return fun(PROTOTYPES[name]);
    });
  } // overwritable-overwrites


  if (rxPlugin.overwritable) {
    Object.assign(_overwritable.overwritable, plugin.overwritable);
  } // extend-hooks


  if (rxPlugin.hooks) {
    Object.entries(plugin.hooks).forEach(function (_ref2) {
      var name = _ref2[0],
          fun = _ref2[1];
      return _hooks.HOOKS[name].push(fun);
    });
  }
}

//# sourceMappingURL=plugin.js.map