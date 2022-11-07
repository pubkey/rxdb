"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addRxPlugin = addRxPlugin;
var _rxSchema = require("./rx-schema");
var _rxDocument = require("./rx-document");
var _rxQuery = require("./rx-query");
var _rxCollection = require("./rx-collection");
var _rxDatabase = require("./rx-database");
var _overwritable = require("./overwritable");
var _hooks = require("./hooks");
var _rxError = require("./rx-error");
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
  RxDocument: _rxDocument.basePrototype,
  RxQuery: _rxQuery.RxQueryBase.prototype,
  RxCollection: _rxCollection.RxCollectionBase.prototype,
  RxDatabase: _rxDatabase.RxDatabaseBase.prototype
};
var ADDED_PLUGINS = new Set();
var ADDED_PLUGIN_NAMES = new Set();

/**
 * Add a plugin to the RxDB library.
 * Plugins are added globally and cannot be removed.
 */
function addRxPlugin(plugin) {
  (0, _hooks.runPluginHooks)('preAddRxPlugin', {
    plugin: plugin,
    plugins: ADDED_PLUGINS
  });

  // do nothing if added before
  if (ADDED_PLUGINS.has(plugin)) {
    return;
  } else {
    // ensure no other plugin with the same name was already added
    if (ADDED_PLUGIN_NAMES.has(plugin.name)) {
      throw (0, _rxError.newRxError)('PL3', {
        name: plugin.name,
        plugin: plugin
      });
    }
    ADDED_PLUGINS.add(plugin);
    ADDED_PLUGIN_NAMES.add(plugin.name);
  }

  /**
   * Since version 10.0.0 we decoupled pouchdb from
   * the rxdb core. Therefore pouchdb plugins must be added
   * with the addPouchPlugin() method of the pouchdb plugin.
   */
  if (!plugin.rxdb) {
    throw (0, _rxError.newRxTypeError)('PL1', {
      plugin: plugin
    });
  }
  if (plugin.init) {
    plugin.init();
  }

  // prototype-overwrites
  if (plugin.prototypes) {
    Object.entries(plugin.prototypes).forEach(function (_ref) {
      var name = _ref[0],
        fun = _ref[1];
      return fun(PROTOTYPES[name]);
    });
  }
  // overwritable-overwrites
  if (plugin.overwritable) {
    Object.assign(_overwritable.overwritable, plugin.overwritable);
  }
  // extend-hooks
  if (plugin.hooks) {
    Object.entries(plugin.hooks).forEach(function (_ref2) {
      var name = _ref2[0],
        hooksObj = _ref2[1];
      if (hooksObj.after) {
        _hooks.HOOKS[name].push(hooksObj.after);
      }
      if (hooksObj.before) {
        _hooks.HOOKS[name].unshift(hooksObj.before);
      }
    });
  }
}
//# sourceMappingURL=plugin.js.map