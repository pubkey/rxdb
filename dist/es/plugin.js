/**
 * this handles how plugins are added to rxdb
 * basically it changes the internal prototypes
 * by passing them to the plugins-functions
 */
import { RxSchema } from './rx-schema';
import { Crypter } from './crypter';
import { basePrototype as RxDocumentPrototype } from './rx-document';
import { RxQueryBase } from './rx-query';
import { RxCollectionBase } from './rx-collection';
import { RxDatabaseBase } from './rx-database';
import { PouchDB } from './pouch-db';
import { overwritable } from './overwritable';
import { HOOKS, runPluginHooks } from './hooks';
/**
 * prototypes that can be manipulated with a plugin
 */

var PROTOTYPES = {
  RxSchema: RxSchema.prototype,
  Crypter: Crypter.prototype,
  RxDocument: RxDocumentPrototype,
  RxQuery: RxQueryBase.prototype,
  RxCollection: RxCollectionBase.prototype,
  RxDatabase: RxDatabaseBase.prototype
};
var ADDED_PLUGINS = new Set();
export function addRxPlugin(plugin) {
  runPluginHooks('preAddRxPlugin', {
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
    PouchDB.plugin(plugin);
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
    Object.assign(overwritable, plugin.overwritable);
  } // extend-hooks


  if (rxPlugin.hooks) {
    Object.entries(plugin.hooks).forEach(function (_ref2) {
      var name = _ref2[0],
          fun = _ref2[1];
      return HOOKS[name].push(fun);
    });
  }
}
//# sourceMappingURL=plugin.js.map