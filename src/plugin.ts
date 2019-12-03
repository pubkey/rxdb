/**
 * this handles how plugins are added to rxdb
 * basically it changes the internal prototypes
 * by passing them to the plugins-functions
 */
import {
    RxSchema
} from './rx-schema';
import Crypter from './crypter';
import {
    basePrototype as RxDocumentPrototype
} from './rx-document';
import {
    RxQueryBase
} from './rx-query';
import {
    RxCollectionBase
} from './rx-collection';
import {
    RxDatabaseBase
} from './rx-database';
import {
    PouchDB
} from './pouch-db';
import {
    RxPlugin
} from './types';

import overwritable from './overwritable';
import {
    HOOKS
} from './hooks';

/**
 * prototypes that can be manipulated with a plugin
 */
const PROTOTYPES: { [k: string]: any } = {
    RxSchema: RxSchema.prototype,
    Crypter: Crypter.Crypter.prototype,
    RxDocument: RxDocumentPrototype,
    RxQuery: RxQueryBase.prototype,
    RxCollection: RxCollectionBase.prototype,
    RxDatabase: RxDatabaseBase.prototype
};

const ADDED_PLUGINS = new Set();


export default function addPlugin(plugin: RxPlugin | any) {
    // do nothing if added before
    if (ADDED_PLUGINS.has(plugin)) return;
    else ADDED_PLUGINS.add(plugin);

    if (!plugin.rxdb) {
        // pouchdb-plugin
        if (typeof plugin === 'object' && plugin.default) plugin = plugin.default;
        PouchDB.plugin(plugin);
        return;
    }

    const rxPlugin: RxPlugin = plugin;

    // prototype-overwrites
    if (rxPlugin.prototypes) {
        Object
            .entries(plugin.prototypes)
            .forEach(([name, fun]) => {
                return (fun as any)(PROTOTYPES[name]);
            });
    }
    // overwritable-overwrites
    if (rxPlugin.overwritable) {
        Object
            .entries(plugin.overwritable)
            .forEach(([name, fun]) => overwritable[name] = (fun as Function));
    }
    // extend-hooks
    if (rxPlugin.hooks) {
        Object
            .entries(plugin.hooks)
            .forEach(([name, fun]) => HOOKS[name].push(fun));
    }
}
