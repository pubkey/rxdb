import type { FilledMangoQuery, MangoQuerySelector, MangoQuerySortPart, RxDocumentData, RxJsonSchema } from '../../types/index.d.ts';
import { Sort as MongoSort } from 'mongodb';
import { MongoDBPreparedQuery, MongoQuerySelector } from './mongodb-types.ts';
export declare const RX_STORAGE_NAME_MONGODB = "mongodb";
export declare const MONGO_OPTIONS_DRIVER_INFO: {
    driverInfo: {
        name: string;
        version: string;
    };
};
/**
 * MongoDB uses the _id field by itself (max 12 bytes)
 * so we have to substitute the _id field if
 * it is used in the RxDocType.
 */
export declare const MONGO_ID_SUBSTITUTE_FIELDNAME = "__id";
export declare function primarySwapMongoDBQuerySelector<RxDocType>(primaryKey: keyof RxDocType, selector: MangoQuerySelector<RxDocType>): MongoQuerySelector<RxDocType>;
export declare function prepareMongoDBQuery<RxDocType>(schema: RxJsonSchema<RxDocumentData<RxDocType>>, mutateableQuery: FilledMangoQuery<RxDocType>): MongoDBPreparedQuery<RxDocType>;
export declare function swapMongoToRxDoc<RxDocType>(docData: any): RxDocumentData<RxDocType>;
export declare function swapRxDocToMongo<RxDocType>(docData: RxDocumentData<RxDocType>): any;
export declare function swapToMongoSort<RxDocType>(sort: MangoQuerySortPart<RxDocType>[]): MongoSort;
export declare function getMongoDBIndexName(index: string[]): string;
