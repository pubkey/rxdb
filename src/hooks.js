/**
 * stores the hooks that where added by the plugins
 */

/**
 * hook-functions that can be extended by the plugin
 */
export const HOOKS = {
    createRxDatabase: [],
    createRxCollection: [],
    /**
     * functions that get the json-schema as input
     * to do additionally checks/manipulation
     */
    preCreateRxSchema: [],
    createRxSchema: [],
    createRxQuery: [],
    createRxDocument: []
};

export function runPluginHooks(hookKey, obj) {
    HOOKS[hookKey].forEach(fun => fun(obj));
}

export default {
    runPluginHooks,
    HOOKS
};
