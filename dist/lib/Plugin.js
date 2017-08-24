'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.addPlugin = addPlugin;

var _RxSchema = require('./RxSchema');

var _RxSchema2 = _interopRequireDefault(_RxSchema);

var _Crypter = require('./Crypter');

var _Crypter2 = _interopRequireDefault(_Crypter);

var _RxDocument = require('./RxDocument');

var _RxDocument2 = _interopRequireDefault(_RxDocument);

var _RxQuery = require('./RxQuery');

var _RxQuery2 = _interopRequireDefault(_RxQuery);

var _RxCollection = require('./RxCollection');

var _RxCollection2 = _interopRequireDefault(_RxCollection);

var _RxDatabase = require('./RxDatabase');

var _RxDatabase2 = _interopRequireDefault(_RxDatabase);

var _RxReplicationState = require('./RxReplicationState');

var _RxReplicationState2 = _interopRequireDefault(_RxReplicationState);

var _overwritable = require('./overwritable');

var _overwritable2 = _interopRequireDefault(_overwritable);

var _hooks = require('./hooks');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * prototypes that can be manipulated with a plugin
 * @type {Object}
 */
var PROTOTYPES = {
    RxSchema: _RxSchema2['default'].RxSchema.prototype,
    Crypter: _Crypter2['default'].Crypter.prototype,
    RxDocument: _RxDocument2['default'].RxDocument.prototype,
    RxQuery: _RxQuery2['default'].RxQuery.prototype,
    RxCollection: _RxCollection2['default'].RxCollection.prototype,
    RxDatabase: _RxDatabase2['default'].RxDatabase.prototype,
    RxReplicationState: _RxReplicationState2['default'].RxReplicationState.prototype
}; /**
    * this handles how plugins are added to rxdb
    * basically it changes the internal prototypes
    * by passing them to the plugins-functions
    */

function addPlugin(plugin) {
    // prototype-overwrites
    if (plugin.prototypes) {
        Object.entries(plugin.prototypes).forEach(function (entry) {
            var name = entry[0];
            var fun = entry[1];
            fun(PROTOTYPES[name]);
        });
    }
    // overwritable-overwrites
    if (plugin.overwritable) {
        Object.entries(plugin.overwritable).forEach(function (entry) {
            var name = entry[0];
            var fun = entry[1];
            _overwritable2['default'][name] = fun;
        });
    }
    // extend-hooks
    if (plugin.hooks) {
        Object.entries(plugin.hooks).forEach(function (entry) {
            var name = entry[0];
            var fun = entry[1];
            _hooks.HOOKS[name].push(fun);
        });
    }
}

exports['default'] = {
    addPlugin: addPlugin
};
