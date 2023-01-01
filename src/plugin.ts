/**
 * this handles how plugins are added to rxdb
 * basically it changes the internal prototypes
 * by passing them to the plugins-functions
 */
import {
    RxSchema
} from './rx-schema';
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
import type {
    RxPlugin
} from './types';

import { overwritable } from './overwritable';
import {
    HOOKS,
    runPluginHooks
} from './hooks';
import { newRxError, newRxTypeError } from './rx-error';

/**
 * prototypes that can be manipulated with a plugin
 */
const PROTOTYPES: { [k: string]: any; } = {
    RxSchema: RxSchema.prototype,
    RxDocument: RxDocumentPrototype,
    RxQuery: RxQueryBase.prototype,
    RxCollection: RxCollectionBase.prototype,
    RxDatabase: RxDatabaseBase.prototype
};

const ADDED_PLUGINS: Set<RxPlugin | any> = new Set();
const ADDED_PLUGIN_NAMES: Set<string> = new Set();

/**
 * Add a plugin to the RxDB library.
 * Plugins are added globally and cannot be removed.
 */
export function addRxPlugin(plugin: RxPlugin) {
    runPluginHooks('preAddRxPlugin', { plugin, plugins: ADDED_PLUGINS });

    // do nothing if added before
    if (ADDED_PLUGINS.has(plugin)) {
        return;
    } else {

        // ensure no other plugin with the same name was already added
        if (ADDED_PLUGIN_NAMES.has(plugin.name)) {
            throw newRxError('PL3', {
                name: plugin.name,
                plugin,
            });
        }

        ADDED_PLUGINS.add(plugin);
        ADDED_PLUGIN_NAMES.add(plugin.name);
    }

    /**
     * To identify broken configurations,
     * we only allow RxDB plugins to be passed into addRxPlugin().
     */
    if (!plugin.rxdb) {
        throw newRxTypeError('PL1', {
            plugin
        });
    }

    if (plugin.init) {
        plugin.init();
    }

    // prototype-overwrites
    if (plugin.prototypes) {
        Object
            .entries(plugin.prototypes)
            .forEach(([name, fun]) => {
                return (fun as any)(PROTOTYPES[name]);
            });
    }
    // overwritable-overwrites
    if (plugin.overwritable) {
        Object.assign(
            overwritable,
            plugin.overwritable
        );
    }
    // extend-hooks
    if (plugin.hooks) {
        Object
            .entries(plugin.hooks)
            .forEach(([name, hooksObj]) => {
                if (hooksObj.after) {
                    HOOKS[name].push(hooksObj.after);
                }
                if (hooksObj.before) {
                    HOOKS[name].unshift(hooksObj.before);
                }
            });
    }
}

