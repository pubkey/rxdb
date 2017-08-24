import * as util from './util';

export function pluginMissing(key) {
    return new Error(
        `
        RxDB.RxError:
        Your are using a function which must be overwritten by a plugin.
        Your should either prevent the usage of this function or add the plugin via:
        - es5-required:
          RxDB.plugin(require(\'rxdb/dist/lib/modules/${key}\'))
        - es6-import:
          import ${util.ucfirst(key)}Plugin from \'rxdb/dist/es/modules/${key}\';
          RxDB.plugin(${util.ucfirst(key)}Plugin);
        `
    );
};

export default {
    pluginMissing
};
