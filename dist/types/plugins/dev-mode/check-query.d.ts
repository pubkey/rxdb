import { RxPluginPreCreateRxQueryArgs } from '../../types';
/**
 * accidentially passing a non-valid object into the query params
 * is very hard to debug especially when queries are observed
 * This is why we do some checks here in dev-mode
 */
export declare function checkQuery(args: RxPluginPreCreateRxQueryArgs): void;
