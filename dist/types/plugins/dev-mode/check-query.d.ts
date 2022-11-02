import type { RxPluginPreCreateRxQueryArgs, RxPluginPrePrepareQueryArgs, FilledMangoQuery, RxJsonSchema, RxDocumentData } from '../../types';
/**
 * accidentally passing a non-valid object into the query params
 * is very hard to debug especially when queries are observed
 * This is why we do some checks here in dev-mode
 */
export declare function checkQuery(args: RxPluginPreCreateRxQueryArgs): void;
export declare function checkMangoQuery(args: RxPluginPrePrepareQueryArgs): void;
export declare function areSelectorsSatisfiedByIndex<RxDocType>(schema: RxJsonSchema<RxDocumentData<RxDocType>>, query: FilledMangoQuery<RxDocType>): boolean;
