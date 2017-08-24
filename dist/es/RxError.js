import * as util from './util';

export function pluginMissing(key) {
    return new Error('\n        RxDB.RxError:\n        Your are using a function which must be overwritten by a plugin.\n        Your should either prevent the usage of this function or add the plugin via:\n        - es5-required:\n          RxDB.plugin(require(\'rxdb/dist/lib/modules/' + key + '\'))\n        - es6-import:\n          import ' + util.ucfirst(key) + 'Plugin from \'rxdb/dist/es/modules/' + key + '\';\n          RxDB.plugin(' + util.ucfirst(key) + 'Plugin);\n        ');
};

export default {
    pluginMissing: pluginMissing
};