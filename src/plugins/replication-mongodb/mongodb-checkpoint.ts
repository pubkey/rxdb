import { WithDeleted } from '../../types/rx-storage';
import { clone, ensureNotFalsy, lastOfArray } from '../utils/index.ts';
import { mongodbDocToRxDB } from './mongodb-helper.ts';
import type {
    MongoDBChangeStreamResumeToken,
    MongoDBCheckpointIterationState,
    MongoDbCheckpointType,
} from './mongodb-types';
import {
    Collection as MongoCollection,
    ObjectId,
    WithId
} from 'mongodb';


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
    primaryPath: string,
    mongoCollection: MongoCollection,
    /**
     * MongoDB has no way to start the stream from 'timestamp zero',
     * we always need a resumeToken
     */
    resumeToken: MongoDBChangeStreamResumeToken,
    limit: number
): Promise<{ docs: WithDeleted<MongoDocType>[], nextToken: MongoDBChangeStreamResumeToken }> {
    const resultByDocId = new Map<string, Promise<WithDeleted<MongoDocType>>>();
    const changeStream = mongoCollection.watch(
        [],
        {
            resumeAfter: resumeToken,
            fullDocument: 'required',
            fullDocumentBeforeChange: 'required',
        }
    );


    /**
     * We cannot use changeStream.resumeToken for the
     * updated token because depending on the batchSize of mongoCollection.watch()
     * it might have changes but not emitting a new token.
     */
    let nextToken = resumeToken;

    return new Promise(async (res, rej) => {
        changeStream.on('error', (err: any) => {
            rej(err);
        });

        while (resultByDocId.size < limit) {
            const change = await changeStream.tryNext();
            if (change) {
                console.log('GOT CHANGE:');
                console.dir({ change })
                nextToken = change._id as any;
                const docId = (change as any).documentKey._id;

                if (change.operationType === 'delete') {
                    const beforeDocMongo = ensureNotFalsy(
                        change.fullDocumentBeforeChange,
                        'change must have pre-deletion state'
                    );
                    const beforeDoc = mongodbDocToRxDB(primaryPath, beforeDocMongo as any);
                    beforeDoc._deleted = true;
                    resultByDocId.set(docId, Promise.resolve(beforeDoc as any));
                } else if (
                    change.operationType === 'insert' ||
                    change.operationType === 'update' ||
                    change.operationType === 'replace'
                ) {
                    resultByDocId.set(docId, mongoCollection.findOne({ _id: docId }).then(doc => {
                        if (doc) {
                            return mongodbDocToRxDB(primaryPath, doc);
                        } else {
                            const docFromChange = ensureNotFalsy(
                                change.fullDocument as any,
                                'change must have change.fullDocument'
                            );
                            const ret = mongodbDocToRxDB(primaryPath, docFromChange);
                            ret._deleted = true;
                            return ret;
                        }
                    }));
                }
            } else {
                break;
            }
        }

        changeStream.close();

        // TODO remove this, used for debugging
        if (resultByDocId.size > 0 && nextToken._data === resumeToken._data) {
            console.log('io equal');
            console.dir({
                nextToken,
                resumeToken,
                result: Array.from(resultByDocId.keys())
            });
            rej(new Error('input output token equal'));
            return;
        }
        const docs = await Promise.all(Array.from(resultByDocId.values()));
        res({ docs, nextToken: nextToken as any });
    });
}

export async function getDocsSinceDocumentCheckpoint<MongoDocType>(
    primaryPath: string,
    mongoCollection: MongoCollection,
    limit: number,
    checkpointId?: string
): Promise<WithDeleted<MongoDocType>[]> {
    const query = checkpointId
        ? { [primaryPath]: { $gt: checkpointId } }
        : {};

    const docs = await mongoCollection
        .find(query as any)
        .sort({ [primaryPath]: 1 })
        .limit(limit)
        .toArray();

    return docs.map(d => mongodbDocToRxDB(primaryPath, d as any));
}


export async function iterateCheckpoint<MongoDocType>(
    primaryPath: string,
    mongoCollection: MongoCollection,
    limit: number,
    checkpoint?: MongoDbCheckpointType,
): Promise<MongoDBCheckpointIterationState<MongoDocType>> {
    if (!checkpoint) {
        const token = await getCurrentResumeToken(mongoCollection);
        checkpoint = {
            iterate: 'docs-by-id',
            changestreamResumeToken: token
        }
    } else {
        checkpoint = clone(checkpoint);
    }

    let docs: WithDeleted<MongoDocType>[] = [];
    if (checkpoint.iterate === 'docs-by-id') {
        console.log('iterate docsbyid');
        docs = await getDocsSinceDocumentCheckpoint<MongoDocType>(primaryPath, mongoCollection, limit, checkpoint.docId);
        const last = lastOfArray(docs);
        if (last) {
            checkpoint.docId = (last as any)[primaryPath];
        }
    } else {
        console.log('iterate changestream:');
        console.dir(checkpoint.changestreamResumeToken);
        const result = await getDocsSinceChangestreamCheckpoint<MongoDocType>(primaryPath, mongoCollection, checkpoint.changestreamResumeToken, limit);
        console.log('iterate changestream result:');
        console.dir(result);
        docs = result.docs;
        checkpoint.changestreamResumeToken = result.nextToken;
    }

    /**
     * If we have to toggle from docs-by-id to changestream iteration
     * mode, the docs array might not be full while we still have some docs left.
     */
    if (checkpoint.iterate === 'docs-by-id' && docs.length < limit) {
        const ids = new Set<string>();
        docs.forEach(d => ids.add((d as any)[primaryPath]));
        const fillUp = await getDocsSinceChangestreamCheckpoint<MongoDocType>(
            primaryPath,
            mongoCollection,
            checkpoint.changestreamResumeToken,
            limit
        );

        checkpoint.iterate = 'changestream';
        checkpoint.changestreamResumeToken = fillUp.nextToken;

        fillUp.docs.forEach(doc => {
            const id = (doc as any)[primaryPath];
            if (ids.has(id)) {
                docs = docs.filter(d => (d as any)[primaryPath] !== id);
            }
            docs.push(doc);
        });
    }

    return {
        docs,
        checkpoint
    };
}
