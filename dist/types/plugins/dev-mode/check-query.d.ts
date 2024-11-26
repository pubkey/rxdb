import type { RxPluginPreCreateRxQueryArgs, RxPluginPrePrepareQueryArgs, FilledMangoQuery, RxJsonSchema, RxDocumentData, RxPluginPrePrepareRxQueryArgs } from '../../types/index.d.ts';
/**
 * accidentally passing a non-valid object into the query params
 * is very hard to debug especially when queries are observed
 * This is why we do some checks here in dev-mode
 */
export declare function checkQuery(args: RxPluginPreCreateRxQueryArgs): void;
export declare function checkMangoQuery(args: RxPluginPrePrepareQueryArgs): void;
export declare function areSelectorsSatisfiedByIndex<RxDocType>(schema: RxJsonSchema<RxDocumentData<RxDocType>>, query: FilledMangoQuery<RxDocType>): boolean;
/**
 * Ensures that the selector does not contain any RegExp instance.
 * @recursive
 */
export declare function ensureObjectDoesNotContainRegExp(selector: any): void;
/**
 * People often use queries wrong
 * so we have some checks here.
 * For example people use numbers as primary keys
 * which is not allowed.
 */
export declare function isQueryAllowed(args: RxPluginPrePrepareRxQueryArgs): void;
