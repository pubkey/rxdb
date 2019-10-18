/**
 * For the ORM capabilities,
 * we have to merge the document prototype
 * with the ORM functions and the data
 * We do this itterating over the properties and
 * adding them to a new object.
 * In the future we should do this by chaining the __proto__ objects
 */
import { RxCollection, RxDocument } from './types';
export declare function getDocumentPrototype(rxCollection: RxCollection): any;
export declare function getRxDocumentConstructor(rxCollection: RxCollection): any;
/**
 * create a RxDocument-instance from the jsonData
 * and the prototype merge
 */
export declare function createRxDocument<DT, OM>(rxCollection: RxCollection<DT, OM>, docData: any): RxDocument<DT, OM>;
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
