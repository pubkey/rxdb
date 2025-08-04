import type {
    ReplicationOptions,
    ReplicationPullOptions,
    ReplicationPushOptions
} from '../../types';
import type {
    MongoDBConnectionString
} from '../storage-mongodb/mongodb-types';

export type MongoDBChangeStreamResumeToken = {
    _data: string;
};

export type MongoDbCheckpointType = {
    changestreamResumeToken: MongoDBChangeStreamResumeToken;
    docId?: string;
}

export type MongoDbConnectionConfig = {
    connection: MongoDBConnectionString;
    databaseName: string;
    collectionName: string;
};

export type SyncOptionsMongoDB<RxDocType> = Omit<
    ReplicationOptions<RxDocType, any>,
    'pull' | 'push' | 'deletedField'
> & {
    config: MongoDbConnectionConfig;
    deletedField: string;
    pull?: Omit<ReplicationPullOptions<RxDocType, MongoDbCheckpointType>, 'handler' | 'stream$'> & {
    };
    push?: Omit<ReplicationPushOptions<RxDocType>, 'handler'>;
};
