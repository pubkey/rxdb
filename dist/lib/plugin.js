'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

exports.addPlugin = addPlugin;

var _rxSchema = require('./rx-schema');

var _rxSchema2 = _interopRequireDefault(_rxSchema);

var _crypter = require('./crypter');

var _crypter2 = _interopRequireDefault(_crypter);

var _rxDocument = require('./rx-document');

var _rxDocument2 = _interopRequireDefault(_rxDocument);

var _rxQuery = require('./rx-query');

var _rxQuery2 = _interopRequireDefault(_rxQuery);

var _rxCollection = require('./rx-collection');

var _rxCollection2 = _interopRequireDefault(_rxCollection);

var _rxDatabase = require('./rx-database');

var _rxDatabase2 = _interopRequireDefault(_rxDatabase);

var _pouchDb = require('./pouch-db');

var _pouchDb2 = _interopRequireDefault(_pouchDb);

var _overwritable = require('./overwritable');

var _overwritable2 = _interopRequireDefault(_overwritable);

var _hooks = require('./hooks');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * prototypes that can be manipulated with a plugin
 * @type {Object}
 */
var PROTOTYPES = {
    RxSchema: _rxSchema2['default'].RxSchema.prototype,
    Crypter: _crypter2['default'].Crypter.prototype,
    RxDocument: _rxDocument2['default'].RxDocument.prototype,
    RxQuery: _rxQuery2['default'].RxQuery.prototype,
    RxCollection: _rxCollection2['default'].RxCollection.prototype,
    RxDatabase: _rxDatabase2['default'].RxDatabase.prototype
}; /**
    * this handles how plugins are added to rxdb
    * basically it changes the internal prototypes
    * by passing them to the plugins-functions
    */


var ADDED_PLUGINS = new Set();

function addPlugin(plugin) {
    // do nothing if added before
    if (ADDED_PLUGINS.has(plugin)) return;else ADDED_PLUGINS.add(plugin);

    if (!plugin.rxdb) {
        // pouchdb-plugin
        if ((typeof plugin === 'undefined' ? 'undefined' : (0, _typeof3['default'])(plugin)) === 'object' && plugin['default']) plugin = plugin['default'];
        _pouchDb2['default'].plugin(plugin);
    }

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
    addPlugin: addPlugin,
    overwritable: _overwritable2['default']
};
