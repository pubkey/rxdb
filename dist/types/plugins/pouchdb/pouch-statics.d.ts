import type { MangoQuery, PreparedQuery, RxDocumentData, RxJsonSchema, RxStorageStatics } from '../../types';
export declare const RxStoragePouchStatics: RxStorageStatics;
/**
 * pouchdb has many bugs and strange behaviors
 * this functions takes a normal mango query
 * and transforms it to one that fits for pouchdb
 */
export declare function preparePouchDbQuery<RxDocType>(schema: RxJsonSchema<RxDocumentData<RxDocType>>, mutateableQuery: MangoQuery<RxDocType>): PreparedQuery<RxDocType>;
