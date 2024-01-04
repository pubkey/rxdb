import type { PlainJsonError, RxError, RxTypeError } from '../../types/index.d.ts';
/**
 * Returns an error that indicates that a plugin is missing
 * We do not throw a RxError because this should not be handled
 * programmatically but by using the correct import
 */
export declare function pluginMissing(pluginKey: string): Error;
export declare function errorToPlainJson(err: Error | TypeError | RxError | RxTypeError): PlainJsonError;
