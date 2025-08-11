import { WithId } from 'mongodb';
import type {
    ReplicationOptions,
    ReplicationPullOptions,
    ReplicationPushOptions,
    WithDeleted
} from '../../types';
import type {
    MongoDBConnectionString
} from '../storage-mongodb/mongodb-types';

export type MongoDBChangeStreamResumeToken = {
    _data: string;
};


export type MongoDbCheckpointType = {
    /**
     * MongoDB has no wait to iterate over events
     * from the beginning of time.
     * Therefore we first iterate over the documents by their
     * _id field and if that reached an end, we iterate from then on
     * over the changestream resume token.
     */
    iterate: 'changestream' | 'docs-by-id';
    changestreamResumeToken: MongoDBChangeStreamResumeToken;
    docId?: string;
}

export type MongoDBCheckpointIterationState<MongoDocType> = {
    docs: WithDeleted<MongoDocType>[];
    checkpoint: MongoDbCheckpointType;
};

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
    pull?: Omit<ReplicationPullOptions<RxDocType, MongoDbCheckpointType>, 'handler' | 'stream$'> & {
    };
    push?: Omit<ReplicationPushOptions<RxDocType>, 'handler'>;
};
