import type {
    Filter as MongoQueryFilter,
    Sort as MongoSort
} from 'mongodb';
import type {
    EventBulk,
    MangoQuery,
    RxConflictResultionTask,
    RxDocumentData,
    RxStorageChangeEvent,
    RxStorageDefaultCheckpoint
} from '../../types';
import { Subject } from 'rxjs';
export type MongoQuerySelector<RxDocType> = MongoQueryFilter<RxDocType | any>;
export type MongoDBDatabaseSettings = {
    /**
     * MongoDB ConnectionString
     * Example: mongodb://localhost:<port>
     */
    connection: string | 'mongodb://localhost:27017';
};

export type MongoDBPreparedQuery<RxDocType> = {
    query: MangoQuery<RxDocType>;
    mongoSelector: MongoQuerySelector<RxDocType>;
    mongoSort: MongoSort;
};

export type MongoDBStorageInternals<RxDocType> = {
    /**
     * To easier test the conflict resolution,
     * the memory storage exposes the conflict resolution task subject
     * so that we can inject own tasks during tests.
     */
    conflictResultionTasks$: Subject<RxConflictResultionTask<RxDocType>>;
    changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>>;
};
export type RxStorageMongoDBInstanceCreationOptions = {};
export type RxStorageMongoDBSettings = {};
