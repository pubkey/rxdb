/**
 * For the ORM capabilities,
 * we have to merge the document prototype
 * with the ORM functions and the data
 * We do this iterating over the properties and
 * adding them to a new object.
 * In the future we should do this by chaining the __proto__ objects
 */
import type { RxCollection, RxDocument, RxDocumentData } from './types';
export declare function getDocumentPrototype(rxCollection: RxCollection): any;
export declare function getRxDocumentConstructor(rxCollection: RxCollection): any;
/**
 * Create a RxDocument-instance from the jsonData
 * and the prototype merge.
 * If the document already exists in the _docCache,
 * return that instead to ensure we have no duplicates.
 */
export declare function createRxDocument<RxDocType, ORM>(rxCollection: RxCollection<RxDocType, ORM>, docData: RxDocumentData<RxDocType>): RxDocument<RxDocType, ORM>;
/**
 * create RxDocument from the docs-array
 */
export declare function createRxDocuments<DT, OM>(rxCollection: RxCollection, docsJSON: any[]): RxDocument<DT, OM>[];
/**
 * returns the prototype-object
 * that contains the orm-methods,
 * used in the proto-merge
 */
export declare function getDocumentOrmPrototype(rxCollection: RxCollection): any;
