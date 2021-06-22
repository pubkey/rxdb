import type { BulkWriteRow, RxCollection, RxDocumentData } from './types';
import { RxCollectionBase } from './rx-collection';
/**
 * Every write access on the storage engine,
 * goes throught this method
 * so we can run hooks and resolve stuff etc.
 */
export declare function writeToStorageInstance<RxDocumentType>(collection: RxCollection<RxDocumentType, any> | RxCollectionBase<any, RxDocumentType, any>, writeRow: BulkWriteRow<RxDocumentType>, overwrite?: boolean): Promise<RxDocumentData<RxDocumentType>>;
/**
 * wrappers to process document data beofre/after it goes to the storage instnace.
 * Used to handle keycompression, encryption etc
 */
export declare function _handleToStorageInstance(col: RxCollection | any, data: any): any;
export declare function _handleFromStorageInstance(col: RxCollection | any, data: any, noDecrypt?: boolean): any;
/**
 * fills in the default data.
 * This also clones the data.
 */
export declare function fillObjectDataBeforeInsert(collection: RxCollection | RxCollectionBase<any>, data: any): any;
