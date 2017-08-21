/**
 * this handles how plugins are added to rxdb
 * basically it changes the internal prototypes
 * by passing them to the plugins-functions
 */

import RxSchema from './RxSchema';
import Crypter from './Crypter';
import RxDocument from './RxDocument';
import RxQuery from './RxQuery';
import RxCollection from './RxCollection';
import RxDatabase from './RxDatabase';
import RxReplicationState from './RxReplicationState';

import overwritable from './overwritable';

/**
 * prototypes that can be manipulated with a plugin
 * @type {Object}
 */
const PROTOTYPES = {
    RxSchema: RxSchema.RxSchema.prototype,
    Crypter: Crypter.Crypter.prototype,
    RxDocument: RxDocument.RxDocument.prototype,
    RxQuery: RxQuery.RxQuery.prototype,
    RxCollection: RxCollection.RxCollection.prototype,
    RxDatabase: RxDatabase.RxDatabase.prototype,
    RxReplicationState: RxReplicationState.RxReplicationState.prototype
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
