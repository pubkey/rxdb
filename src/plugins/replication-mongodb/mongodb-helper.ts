import { Subject } from 'rxjs';
import { RxError, RxTypeError, newRxError } from '../../rx-error.ts';
import { ensureNotFalsy, errorToPlainJson, promiseWait, requestIdlePromiseNoQueue, toArray } from '../utils/index.ts';
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

export async function getCurrentResumeToken(
    mongoCollection: MongoCollection
): Promise<MongoDBChangeStreamResumeToken> {
    const changeStream = mongoCollection.watch();

    // Trigger the initial batch so postBatchResumeToken is available
    await changeStream.tryNext().catch(() => { });

    const token = changeStream.resumeToken;
    changeStream.close();
    return token as any;
}

export async function getDocsSinceChangestreamCheckpoint<MongoDocType>(
    mongoCollection: MongoCollection,
    /**
     * MongoDB has no way to start the stream from 'timestamp zero',
     * we always need a resumeToken
     */
    resumeToken: MongoDBChangeStreamResumeToken,
    limit: number
): Promise<MongoDocType[]> {
    const resultByDocId = new Map<string, Promise<MongoDocType>>();
    const changeStream = mongoCollection.watch([], { resumeAfter: resumeToken });

    return new Promise(async (res, rej) => {
        changeStream.on('error', (err: any) => {
            rej(err);
        });

        while (resultByDocId.size < limit) {
            const change = await changeStream.tryNext();
            if (change) {
                const docId = (change as any).documentKey._id;
                if (!resultByDocId.has(docId)) {
                    resultByDocId.set(docId, mongoCollection.findOne({ _id: docId }) as any);
                }
            } else {
                // No more events buffered—exit the loop
                break;
            }
        }

        changeStream.close();
        res(await Promise.all(Array.from(resultByDocId.values())));
    });
}

export async function getDocsSinceDocumentCheckpoint(
    mongoCollection: MongoCollection,
    limit: number,
    checkpointId?: string
) {
    const query = checkpointId
        ? { _id: { $gt: new ObjectId(checkpointId) } }
        : {};

    const docs = await mongoCollection
        .find(query as any)
        .sort({ _id: 1 })
        .limit(limit)
        .toArray();

    const newCheckpointId =
        docs.length > 0
            ? docs[docs.length - 1]._id.toString()
            : undefined;

    return { docs, checkpointId: newCheckpointId };
}
