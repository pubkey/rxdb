/**
 * For the ORM capabilities,
 * we have to merge the document prototype
 * with the ORM functions and the data
 * We do this iterating over the properties and
 * adding them to a new object.
 * In the future we should do this by chaining the __proto__ objects
 */
import type { RxCollection, RxDocument, RxDocumentData } from './types/index.d.ts';
export declare function getDocumentPrototype(rxCollection: RxCollection): any;
export declare function getRxDocumentConstructor<RxDocType, ORM>(rxCollection: RxCollection<RxDocType, ORM>): any;
/**
 * Create a RxDocument-instance from the jsonData
 * and the prototype merge.
 * You should never call this method directly,
 * instead you should get the document from collection._docCache.getCachedRxDocument().
 */
export declare function createNewRxDocument<RxDocType, ORM, Reactivity>(rxCollection: RxCollection<RxDocType, ORM, {}, {}, Reactivity>, documentConstructor: any, docData: RxDocumentData<RxDocType>): RxDocument<RxDocType, ORM, Reactivity>;
/**
 * returns the prototype-object
 * that contains the orm-methods,
 * used in the proto-merge
 */
export declare function getDocumentOrmPrototype(rxCollection: RxCollection): any;
