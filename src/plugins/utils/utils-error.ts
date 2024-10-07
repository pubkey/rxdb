import type {
    PlainJsonError,
    RxError,
    RxTypeError
} from '../../types/index.d.ts';
import { ucfirst } from './utils-string.ts';



/**
 * Returns an error that indicates that a plugin is missing
 * We do not throw a RxError because this should not be handled
 * programmatically but by using the correct import
 */
export function pluginMissing(
    pluginKey: string
): Error {
    const keyParts = pluginKey.split('-');
    let pluginName = 'RxDB';
    keyParts.forEach(part => {
        pluginName += ucfirst(part);
    });
    pluginName += 'Plugin';
    return new Error(
        `You are using a function which must be overwritten by a plugin.
        You should either prevent the usage of this function or add the plugin via:
            import { ${pluginName} } from 'rxdb/plugins/${pluginKey}';
            addRxPlugin(${pluginName});
        `
    );
}



export function errorToPlainJson(err: Error | TypeError | RxError | RxTypeError): PlainJsonError {
    const ret: PlainJsonError = {
        name: err.name,
        message: err.message,
        rxdb: (err as any).rxdb,
        parameters: (err as RxError).parameters,
        extensions: (err as any).extensions,
        code: (err as RxError).code,
        url: (err as RxError).url,
        /**
         * stack must be last to make it easier to read the json in a console.
         * Also we ensure that each linebreak is spaced so that the chrome devtools
         * shows urls to the source code that can be clicked to inspect
         * the correct place in the code.
         */
        stack: !err.stack ? undefined : err.stack.replace(/\n/g, ' \n ')
    };
    return ret;
}
