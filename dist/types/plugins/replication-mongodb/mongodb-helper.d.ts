import { Subject } from 'rxjs';
import { RxError, RxTypeError } from '../../rx-error.ts';
import type { MongoDBChangeStreamResumeToken } from './mongodb-types';
import { Collection as MongoCollection, ChangeStream, WithId } from 'mongodb';
import type { RxDocumentData, WithDeleted } from '../../types/rx-storage';
export declare function startChangeStream(mongoCollection: MongoCollection<any>, resumeToken?: MongoDBChangeStreamResumeToken, errorSubject?: Subject<RxError | RxTypeError>): Promise<ChangeStream>;
export declare function mongodbDocToRxDB<DocType>(primaryPath: string, doc: WithId<DocType>): WithDeleted<DocType>;
/**
 * MongoDB operations like mongoCollection.updateOne() will mutate the input!
 * So we have to flat-clone first here.
 * Also we do not want to store RxDB-specific metadata in the mongodb database.
 */
export declare function rxdbDocToMongo<DocType>(doc: RxDocumentData<DocType>): DocType;
