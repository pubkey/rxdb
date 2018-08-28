"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.addPlugin = addPlugin;
exports["default"] = void 0;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _rxSchema = _interopRequireDefault(require("./rx-schema"));

var _crypter = _interopRequireDefault(require("./crypter"));

var _rxDocument = require("./rx-document");

var _rxQuery = _interopRequireDefault(require("./rx-query"));

var _rxCollection = _interopRequireDefault(require("./rx-collection"));

var _rxDatabase = _interopRequireDefault(require("./rx-database"));

var _pouchDb = _interopRequireDefault(require("./pouch-db"));

var _overwritable = _interopRequireDefault(require("./overwritable"));

var _hooks = require("./hooks");

/**
 * this handles how plugins are added to rxdb
 * basically it changes the internal prototypes
 * by passing them to the plugins-functions
 */

/**
 * prototypes that can be manipulated with a plugin
 * @type {Object}
 */
var PROTOTYPES = {
  RxSchema: _rxSchema["default"].RxSchema.prototype,
  Crypter: _crypter["default"].Crypter.prototype,
  RxDocument: _rxDocument.basePrototype,
  RxQuery: _rxQuery["default"].RxQuery.prototype,
  RxCollection: _rxCollection["default"].RxCollection.prototype,
  RxDatabase: _rxDatabase["default"].RxDatabase.prototype
};
var ADDED_PLUGINS = new Set();

function addPlugin(plugin) {
  // do nothing if added before
  if (ADDED_PLUGINS.has(plugin)) return;else ADDED_PLUGINS.add(plugin);

  if (!plugin.rxdb) {
    // pouchdb-plugin
    if ((0, _typeof2["default"])(plugin) === 'object' && plugin["default"]) plugin = plugin["default"];

    _pouchDb["default"].plugin(plugin);
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
      return _overwritable["default"][name] = fun;
    });
  } // extend-hooks


  if (plugin.hooks) {
    Object.entries(plugin.hooks).forEach(function (_ref3) {
      var name = _ref3[0],
          fun = _ref3[1];
      return _hooks.HOOKS[name].push(fun);
    });
  }
}

var _default = {
  addPlugin: addPlugin,
  overwritable: _overwritable["default"]
};
exports["default"] = _default;
