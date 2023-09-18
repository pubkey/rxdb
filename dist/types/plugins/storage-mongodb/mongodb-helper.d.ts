import { MangoQuerySelector, MangoQuerySortPart, RxDocumentData } from '../../types';
import { Sort as MongoSort } from 'mongodb';
import { MongoQuerySelector } from './mongodb-types';
export declare const RX_STORAGE_NAME_MONGODB = "mongodb";
/**
 * MongoDB uses the _id field by itself (max 12 bytes)
 * so we have to substitute the _id field if
 * it is used in the RxDocType.
 */
export declare const MONGO_ID_SUBSTITUTE_FIELDNAME = "__id";
export declare function primarySwapMongoDBQuerySelector<RxDocType>(primaryKey: keyof RxDocType, selector: MangoQuerySelector<RxDocType>): MongoQuerySelector<RxDocType>;
export declare function swapMongoToRxDoc<RxDocType>(docData: any): RxDocumentData<RxDocType>;
export declare function swapRxDocToMongo<RxDocType>(docData: RxDocumentData<RxDocType>): any;
export declare function swapToMongoSort<RxDocType>(sort: MangoQuerySortPart<RxDocType>[]): MongoSort;
export declare function getMongoDBIndexName(index: string[]): string;
