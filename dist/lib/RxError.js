'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.pluginMissing = pluginMissing;

var _util = require('./util');

var util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function pluginMissing(key) {
    return new Error('\n        RxDB.RxError:\n        Your are using a function which must be overwritten by a plugin.\n        Your should either prevent the usage of this function or add the plugin via:\n        - es5-required:\n          RxDB.plugin(require(\'rxdb/dist/lib/modules/' + key + '\'))\n        - es6-import:\n          import ' + util.ucfirst(key) + 'Plugin from \'rxdb/dist/es/modules/' + key + '\';\n          RxDB.plugin(' + util.ucfirst(key) + 'Plugin);\n        ');
};

exports['default'] = {
    pluginMissing: pluginMissing
};
