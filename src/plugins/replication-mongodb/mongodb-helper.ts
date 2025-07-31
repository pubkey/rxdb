import { Subject } from 'rxjs';
import { RxError, RxTypeError, newRxError } from '../../rx-error.ts';
import { errorToPlainJson, toArray } from '../utils/index.ts';
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
    ChangeStream
} from 'mongodb';

export async function startChangeStream(
    mongoCollection: MongoCollection<any>,
    resumeToken?: MongoDBChangeStreamResumeToken,
    errorSubject?: Subject<RxError | RxTypeError>
): Promise<ChangeStream> {
    const changeStream = mongoCollection.watch([], resumeToken ? { resumeAfter: resumeToken } : {});
    if (errorSubject) {
        changeStream.on('error', (err: any) => {
            const emitError = newRxError('RC_STREAM', {
                errors: toArray(err).map(er => errorToPlainJson(er))
            });
            errorSubject.next(emitError);
        });
    }
    await new Promise<void>(res => {
        changeStream.on('init', () => {
            res();
        });
    });

    return changeStream;
}

export async function fetchEventsUntilEnd(
    changeStream: ChangeStream
) {
    const ret: ChangeStreamDocument[] = [];
    changeStream.on('change', (c) => {
        console.log('got change:');
        console.dir(c);
        ret.push(c);
    });
    return ret;
}
