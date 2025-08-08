import type {
    Filter as MongoQueryFilter,
    Sort as MongoSort,
    TransactionOptions
} from 'mongodb';
import type {
    FilledMangoQuery, RxDocumentData
} from '../../types/index.d.ts';


/**
 * MongoDB ConnectionString
 * Example: mongodb://localhost:<port>
 */
export type MongoDBConnectionString = string | 'mongodb://localhost:27017';

export type MongoQuerySelector<RxDocType> = MongoQueryFilter<RxDocType | any>;
export type MongoDBDatabaseSettings = {
    connection: MongoDBConnectionString;
    transactionOptions?: TransactionOptions;
};

export type MongoDBPreparedQuery<RxDocType> = {
    query: FilledMangoQuery<RxDocType>;
    mongoSelector: MongoQuerySelector<RxDocumentData<RxDocType>>;
    mongoSort: MongoSort;
};

export type MongoDBSettings = {};
export type MongoDBStorageInternals = {};
export type RxStorageMongoDBInstanceCreationOptions = {};
export type RxStorageMongoDBSettings = {};
