/**
 * this handles how plugins are added to rxdb
 * basically it changes the internal prototypes
 * by passing them to the plugins-functions
 */

import RxSchema from './RxSchema';
import Crypter from './Crypter';
import overwritable from './overwritable';

const PROTOTYPES = {
    RxSchema: RxSchema.RxSchema.prototype,
    Crypter: Crypter.Crypter.prototype
};

export function addPlugin(plugin) {
    // prototype-overwrites
    if (plugin.prototypes) {
        Object.entries(plugin.prototypes).forEach(entry => {
            const name = entry[0];
            const fun = entry[1];
            fun(PROTOTYPES[name]);
        });
    }
    // overwritable-overwrites
    if (plugin.overwritable) {
        Object.entries(plugin.overwritable).forEach(entry => {
            const name = entry[0];
            const fun = entry[1];
            overwritable[name] = fun;
        });
    }
}

export default {
    addPlugin
};
