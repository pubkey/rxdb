import { clone, lastOfArray } from '../utils/index.ts';
import type {
    MongoDBChangeStreamResumeToken,
    MongoDBCheckpointIterationState,
    MongoDbCheckpointType
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
    mongoCollection: MongoCollection,
    /**
     * MongoDB has no way to start the stream from 'timestamp zero',
     * we always need a resumeToken
     */
    resumeToken: MongoDBChangeStreamResumeToken,
    limit: number
): Promise<{ docs: WithId<MongoDocType>[], nextToken: MongoDBChangeStreamResumeToken }> {
    const resultByDocId = new Map<string, Promise<WithId<MongoDocType>>>();
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
                break;
            }
        }

        changeStream.close();

        const nextToken = changeStream.resumeToken;
        const docs = await Promise.all(Array.from(resultByDocId.values()));
        res({ docs, nextToken: nextToken as any });
    });
}

export async function getDocsSinceDocumentCheckpoint<MongoDocType>(
    mongoCollection: MongoCollection,
    limit: number,
    checkpointId?: string
): Promise<WithId<MongoDocType>[]> {
    const query = checkpointId
        ? { _id: { $gt: new ObjectId(checkpointId) } }
        : {};

    const docs = await mongoCollection
        .find(query as any)
        .sort({ _id: 1 })
        .limit(limit)
        .toArray();

    return docs as any;
}


export async function iterateCheckpoint<MongoDocType>(
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

    let docs: WithId<MongoDocType>[] = [];
    if (checkpoint.iterate === 'docs-by-id') {
        docs = await getDocsSinceDocumentCheckpoint<MongoDocType>(mongoCollection, limit, checkpoint.docId);
        const last = lastOfArray(docs);
        if (last) {
            checkpoint.docId = last._id.toString();
        }
    } else {
        const result = await getDocsSinceChangestreamCheckpoint<MongoDocType>(mongoCollection, checkpoint.changestreamResumeToken, limit);
        docs = result.docs;
        checkpoint.changestreamResumeToken = result.nextToken;
    }

    /**
     * If we have to toggle from docs-by-id to changestream iteration
     * mode, the docs array might not be full while we still have some docs left.
     */
    if (checkpoint.iterate === 'docs-by-id' && docs.length < limit) {
        const ids = new Set<string>();
        docs.forEach(d => ids.add(d._id.toString()));
        const fillUp = await getDocsSinceChangestreamCheckpoint<MongoDocType>(
            mongoCollection,
            checkpoint.changestreamResumeToken,
            limit
        );

        checkpoint.iterate = 'changestream';
        checkpoint.changestreamResumeToken = fillUp.nextToken;

        fillUp.docs.forEach(doc => {
            const id = doc._id.toString();
            if (ids.has(id)) {
                docs = docs.filter(d => d._id.toString() !== id);
            }
            docs.push(doc);
        });
    }

    return {
        docs,
        checkpoint
    };
}
