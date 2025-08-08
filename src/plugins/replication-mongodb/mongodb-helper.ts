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


export function mongodbDocToRxDB(primaryPath: string, doc: WithId<any>) {
    if (primaryPath === '_id' && typeof doc._id !== 'string') {
        throw newRxError('MG1', {
            document: doc
        });
    } else if (primaryPath === '_id') {
        return doc;
    } else {
        doc = flatClone(doc);
        delete doc._id;
        return doc;
    }
}
