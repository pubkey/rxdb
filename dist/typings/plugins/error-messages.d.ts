/**
 * this plugin adds the error-messages
 * without it, only error-codes will be shown
 * This is mainly because error-string are hard to compress and we need a smaller build
 */
export declare const rxdb = true;
export declare const prototypes: {};
export declare const overwritable: {
    tunnelErrorMessage(code: string): string;
};
declare const _default: {
    rxdb: boolean;
    prototypes: {};
    overwritable: {
        tunnelErrorMessage(code: string): string;
    };
};
export default _default;
