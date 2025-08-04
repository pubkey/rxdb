import { Subject } from 'rxjs';
import { RxError, RxTypeError, newRxError } from '../../rx-error.ts';
import { ensureNotFalsy, errorToPlainJson, flatClone, promiseWait, requestIdlePromiseNoQueue, toArray } from '../utils/index.ts';
import type {
    MongoDBChangeStreamResumeToken
} from './mongodb-types';
import {
    Db as MongoDatabase,
    Collection as MongoCollection,
    MongoClient,
    ObjectId,
    ClientSession,
    ChangeStreamDocument,
    ChangeStream,
    WithId
} from 'mongodb';

export async function startChangeStream(
    mongoCollection: MongoCollection<any>,
    resumeToken?: MongoDBChangeStreamResumeToken,
    errorSubject?: Subject<RxError | RxTypeError>
): Promise<ChangeStream> {
    const changeStream = mongoCollection.watch([], resumeToken ? { resumeAfter: resumeToken } : {

    });
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
    console.log('---1 ');

    return changeStream;
}


export function mongodbDocToRxDB(primaryPath: string, doc: WithId<any>) {
    doc = flatClone(doc);
    let id = doc._id;
    if (typeof id !== 'string') {
        id = id.toString();
    }
    doc[primaryPath] = id;
    if (primaryPath !== '_id') {
        delete doc._id;
    }
    return doc;
}
