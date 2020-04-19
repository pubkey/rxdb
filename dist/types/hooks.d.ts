/**
 * stores the hooks that where added by the plugins
 */
/**
 * hook-functions that can be extended by the plugin
 */
export declare const HOOKS: {
    [k: string]: any[];
};
export declare function runPluginHooks(hookKey: string, obj: any): void;
export declare function runAsyncPluginHooks(hookKey: string, obj: any): Promise<any>;
/**
 * used in tests to remove hooks
 */
export declare function _clearHook(type: string, fun: Function): void;
