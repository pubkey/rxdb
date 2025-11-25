import { Observable } from 'rxjs';
import { rxStorageInstanceToReplicationHandler } from '../../replication-protocol/index.ts';
import type {
    DeepReadonly,
    ReplicationPullHandler,
    ReplicationPushHandler,
    RxCollection,
    RxReplicationPullStreamItem,
    RxReplicationWriteToMasterRow
} from '../../types';
import { deepEqual } from '../utils/index.ts';

/**
 * Creates a pull handler that always returns
 * all documents.
*/
export function getPullHandler<RxDocType, CheckpointType>(
    remoteCollection: RxCollection<RxDocType, {}, {}, {}>
): ReplicationPullHandler<RxDocType, CheckpointType> {
    const helper = rxStorageInstanceToReplicationHandler<RxDocType, CheckpointType>(
        remoteCollection.storageInstance,
        remoteCollection.database.conflictHandler as any,
        remoteCollection.database.token
    );
    const handler: ReplicationPullHandler<RxDocType, CheckpointType> = async (
        latestPullCheckpoint: CheckpointType | undefined,
        batchSize: number
    ) => {
        const result = await helper.masterChangesSince(latestPullCheckpoint, batchSize);
        return result;
    };
    return handler;
}
export function getPullStream<RxDocType>(
    remoteCollection: RxCollection<RxDocType, {}, {}, {}>
): Observable<RxReplicationPullStreamItem<RxDocType, any>> {
    const helper = rxStorageInstanceToReplicationHandler(
        remoteCollection.storageInstance,
        remoteCollection.conflictHandler,
        remoteCollection.database.token
    );
    return helper.masterChangeStream$;
}
export function getPushHandler<RxDocType>(
    remoteCollection: RxCollection<RxDocType, {}, {}, {}>
): ReplicationPushHandler<RxDocType> {
    const helper = rxStorageInstanceToReplicationHandler(
        remoteCollection.storageInstance,
        remoteCollection.conflictHandler,
        remoteCollection.database.token
    );
    const handler: ReplicationPushHandler<RxDocType> = async (
        rows: RxReplicationWriteToMasterRow<RxDocType>[]
    ) => {
        const result = await helper.masterWrite(rows);
        return result;
    };
    return handler;
}


export async function ensureEqualState<RxDocType>(
    collectionA: RxCollection<RxDocType>,
    collectionB: RxCollection<RxDocType>,
    context?: string
) {
    const [
        docsA,
        docsB
    ] = await Promise.all([
        collectionA.find().exec().then(docs => docs.map(d => d.toJSON(true))),
        collectionB.find().exec().then(docs => docs.map(d => d.toJSON(true)))
    ]);

    docsA.forEach((docA, idx) => {
        const docB = docsB[idx];
        const cleanDocToCompare = (doc: DeepReadonly<RxDocType>) => {
            return Object.assign({}, doc, {
                _meta: undefined,
                _rev: undefined
            });
        };


        if (!deepEqual(
            cleanDocToCompare(docA),
            cleanDocToCompare(docB)
        )) {
            console.log('## ERROR: State not equal (context: "' + context + '")');
            console.log(JSON.stringify(docA, null, 4));
            console.log(JSON.stringify(docB, null, 4));
            throw new Error('STATE not equal (context: "' + context + '")');
        }
    });
}
