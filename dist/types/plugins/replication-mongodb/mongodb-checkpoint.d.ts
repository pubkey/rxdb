import { WithDeleted } from '../../types/rx-storage';
import type { MongoDBChangeStreamResumeToken, MongoDBCheckpointIterationState, MongoDbCheckpointType } from './mongodb-types';
import { Collection as MongoCollection } from 'mongodb';
export declare function getCurrentResumeToken(mongoCollection: MongoCollection): Promise<MongoDBChangeStreamResumeToken>;
export declare function getDocsSinceChangestreamCheckpoint<MongoDocType>(primaryPath: string, mongoCollection: MongoCollection, 
/**
 * MongoDB has no way to start the stream from 'timestamp zero',
 * we always need a resumeToken
 */
resumeToken: MongoDBChangeStreamResumeToken, limit: number): Promise<{
    docs: WithDeleted<MongoDocType>[];
    nextToken: MongoDBChangeStreamResumeToken;
}>;
export declare function getDocsSinceDocumentCheckpoint<MongoDocType>(primaryPath: string, mongoCollection: MongoCollection, limit: number, checkpointId?: string): Promise<WithDeleted<MongoDocType>[]>;
export declare function iterateCheckpoint<MongoDocType>(primaryPath: string, mongoCollection: MongoCollection, limit: number, checkpoint?: MongoDbCheckpointType): Promise<MongoDBCheckpointIterationState<MongoDocType>>;
