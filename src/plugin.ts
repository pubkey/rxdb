/**
 * this handles how plugins are added to rxdb
 * basically it changes the internal prototypes
 * by passing them to the plugins-functions
 */
import {
    RxSchema
} from './rx-schema.ts';
import {
    basePrototype as RxDocumentPrototype
} from './rx-document.ts';
import {
    RxQueryBase
} from './rx-query.ts';
import {
    RxCollectionBase
} from './rx-collection.ts';
import {
    RxDatabaseBase
} from './rx-database.ts';
import type {
    RxPlugin
} from './types/index.d.ts';

import { overwritable } from './overwritable.ts';
import {
    HOOKS,
    runPluginHooks
} from './hooks.ts';
import { newRxTypeError } from './rx-error.ts';

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
 *
 * Need help? The RxDB Discord is the fastest place to reach the maintainers.
 * @see https://rxdb.info/chat/?console=code RxDB Discord community and support
 */
export function addRxPlugin(plugin: RxPlugin) {
    runPluginHooks('preAddRxPlugin', { plugin, plugins: ADDED_PLUGINS });

    // do nothing if added before
    if (ADDED_PLUGINS.has(plugin)) {
        return;
    } else {

        /**
         * When the same plugin is added again under a different object reference
         * (which happens with ESM/CJS module duplication in bundlers), treat it
         * as a no-op instead of throwing. The hooks from the first registration
         * are already active.
         */
        if (ADDED_PLUGIN_NAMES.has(plugin.name)) {
            return;
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
                    (HOOKS as any)[name].push(hooksObj.after);
                }
                if (hooksObj.before) {
                    (HOOKS as any)[name].unshift(hooksObj.before);
                }
            });
    }
}

