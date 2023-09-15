import type {
    Filter as MongoQueryFilter,
    Sort as MongoSort,
    TransactionOptions
} from 'mongodb';
import type {
    MangoQuery
} from '../../types';
export type MongoQuerySelector<RxDocType> = MongoQueryFilter<RxDocType | any>;
export type MongoDBDatabaseSettings = {
    /**
     * MongoDB ConnectionString
     * Example: mongodb://localhost:<port>
     */
    connection: string | 'mongodb://localhost:27017';
    transactionOptions?: TransactionOptions;
};

export type MongoDBPreparedQuery<RxDocType> = {
    query: MangoQuery<RxDocType>;
    mongoSelector: MongoQuerySelector<RxDocType>;
    mongoSort: MongoSort;
};

export type MongoDBSettings = {};
export type MongoDBStorageInternals = {};
export type RxStorageMongoDBInstanceCreationOptions = {};
export type RxStorageMongoDBSettings = {};
