/**
 * this handles how plugins are added to rxdb
 * basically it changes the internal prototypes
 * by passing them to the plugins-functions
 */
import RxSchema from './rx-schema';
import Crypter from './crypter';
import { basePrototype as RxDocumentPrototype } from './rx-document';
import RxQuery from './rx-query';
import RxCollection from './rx-collection';
import RxDatabase from './rx-database';
import PouchDB from './pouch-db';
import overwritable from './overwritable';
import { HOOKS } from './hooks';
/**
 * prototypes that can be manipulated with a plugin
 * @type {Object}
 */

var PROTOTYPES = {
  RxSchema: RxSchema.RxSchema.prototype,
  Crypter: Crypter.Crypter.prototype,
  RxDocument: RxDocumentPrototype,
  RxQuery: RxQuery.RxQuery.prototype,
  RxCollection: RxCollection.RxCollection.prototype,
  RxDatabase: RxDatabase.RxDatabase.prototype
};
var ADDED_PLUGINS = new Set();
export function addPlugin(plugin) {
  // do nothing if added before
  if (ADDED_PLUGINS.has(plugin)) return;else ADDED_PLUGINS.add(plugin);

  if (!plugin.rxdb) {
    // pouchdb-plugin
    if (typeof plugin === 'object' && plugin["default"]) plugin = plugin["default"];
    PouchDB.plugin(plugin);
  } // prototype-overwrites


  if (plugin.prototypes) {
    Object.entries(plugin.prototypes).forEach(function (_ref) {
      var name = _ref[0],
          fun = _ref[1];
      return fun(PROTOTYPES[name]);
    });
  } // overwritable-overwrites


  if (plugin.overwritable) {
    Object.entries(plugin.overwritable).forEach(function (_ref2) {
      var name = _ref2[0],
          fun = _ref2[1];
      return overwritable[name] = fun;
    });
  } // extend-hooks


  if (plugin.hooks) {
    Object.entries(plugin.hooks).forEach(function (_ref3) {
      var name = _ref3[0],
          fun = _ref3[1];
      return HOOKS[name].push(fun);
    });
  }
}
export default {
  addPlugin: addPlugin,
  overwritable: overwritable
};