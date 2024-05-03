import type { BulkWriteRow, RxDocumentData, RxStorageInstance } from '../../types/index.d.ts';
export declare function ensurePrimaryKeyValid(primaryKey: string, docData: RxDocumentData<any>): void;
/**
 * Deeply checks if the object contains an
 * instance of the JavaScript Date class.
 * @recursive
 */
export declare function containsDateInstance(obj: any): boolean;
export declare function checkWriteRows<RxDocType>(storageInstance: RxStorageInstance<RxDocType, any, any, any>, rows: BulkWriteRow<RxDocType>[]): void;
