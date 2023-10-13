"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addRxPlugin = addRxPlugin;
var _rxSchema = require("./rx-schema.js");
var _rxDocument = require("./rx-document.js");
var _rxQuery = require("./rx-query.js");
var _rxCollection = require("./rx-collection.js");
var _rxDatabase = require("./rx-database.js");
var _overwritable = require("./overwritable.js");
var _hooks = require("./hooks.js");
var _rxError = require("./rx-error.js");
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
    plugin,
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
        plugin
      });
    }
    ADDED_PLUGINS.add(plugin);
    ADDED_PLUGIN_NAMES.add(plugin.name);
  }

  /**
   * To identify broken configurations,
   * we only allow RxDB plugins to be passed into addRxPlugin().
   */
  if (!plugin.rxdb) {
    throw (0, _rxError.newRxTypeError)('PL1', {
      plugin
    });
  }
  if (plugin.init) {
    plugin.init();
  }

  // prototype-overwrites
  if (plugin.prototypes) {
    Object.entries(plugin.prototypes).forEach(([name, fun]) => {
      return fun(PROTOTYPES[name]);
    });
  }
  // overwritable-overwrites
  if (plugin.overwritable) {
    Object.assign(_overwritable.overwritable, plugin.overwritable);
  }
  // extend-hooks
  if (plugin.hooks) {
    Object.entries(plugin.hooks).forEach(([name, hooksObj]) => {
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