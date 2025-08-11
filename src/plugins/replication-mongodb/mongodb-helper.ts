import { Subject } from 'rxjs';
import { RxError, RxTypeError, newRxError } from '../../rx-error.ts';
import {
    errorToPlainJson,
    flatClone,
    toArray
} from '../utils/index.ts';
import type {
    MongoDBChangeStreamResumeToken
} from './mongodb-types';
import {
    Collection as MongoCollection,
    ChangeStream,
    WithId
} from 'mongodb';
import type { RxDocumentData, WithDeleted } from '../../types/rx-storage';

export async function startChangeStream(
    mongoCollection: MongoCollection<any>,
    resumeToken?: MongoDBChangeStreamResumeToken,
    errorSubject?: Subject<RxError | RxTypeError>
): Promise<ChangeStream> {
    const changeStream = mongoCollection.watch([], resumeToken ? { resumeAfter: resumeToken } : {

    });

    // TODO remove this, only used in debugging
    changeStream.on('error', (err: any) => {
        console.log('ERRROR ON CHANGESTREAM;');
        console.dir(err);
    });
    if (errorSubject) {
        changeStream.on('error', (err: any) => {
            const emitError = newRxError('RC_STREAM', {
                errors: toArray(err).map(er => errorToPlainJson(er))
            });
            errorSubject.next(emitError);
        });
    }
    // console.log('---0 ');
    // await new Promise<void>(res => {
    //     changeStream.on('init', () => {
    //         res();
    //     });
    // });

    return changeStream;
}


export function mongodbDocToRxDB<DocType>(primaryPath: string, doc: WithId<DocType>): WithDeleted<DocType> {
    if (primaryPath === '_id' && typeof doc._id !== 'string') {
        throw newRxError('MG1', {
            document: doc
        });
    }

    const useDoc: any = flatClone(doc);
    useDoc._deleted = false;

    if (primaryPath === '_id') {
        return useDoc;
    } else {
        delete useDoc._id;
        return useDoc;
    }
}


/**
 * MongoDB operations like mongoCollection.updateOne() will mutate the input!
 * So we have to flat-clone first here.
 * Also we do not want to store RxDB-specific metadata in the mongodb database.
 */
export function rxdbDocToMongo<DocType>(doc: RxDocumentData<DocType>): DocType {
    const ret: any = flatClone(doc);
    delete ret._deleted;
    delete ret._meta;
    delete ret._attachments;
    return ret;
}
