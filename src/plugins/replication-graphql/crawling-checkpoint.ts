import {
    wasRevisionfromPullReplication,
    GRAPHQL_REPLICATION_PLUGIN_IDENT
} from './helper';
import type {
    RxCollection,
    ChangeStreamEvent,
    RxLocalDocumentData
} from '../../types';
import {
    findLocalDocument,
    writeSingleLocal
} from '../../rx-storage-helper';
import { flatClone } from '../../util';
import { newRxError } from '../../rx-error';

/**
 * when the replication starts,
 * we need a way to find out where it ended the last time.
 *
 * For push-replication, we use the storageInstance-sequence:
 * We get the documents newer then the last sequence-id
 * and push them to the server.
 *
 * For pull-replication, we use the last document we got from the server:
 * We send the last document to the queryBuilder()
 * and recieve newer documents sorted in a batch
 */



//
// things for the push-checkpoint
//

const pushSequenceId = (endpointHash: string) => GRAPHQL_REPLICATION_PLUGIN_IDENT + '-push-checkpoint-' + endpointHash;

/**
 * @return last sequence checkpoint
 */
export async function getLastPushSequence(
    collection: RxCollection,
    endpointHash: string
): Promise<number> {
    const doc = await findLocalDocument<CheckpointDoc>(
        collection.localDocumentsStore,
        pushSequenceId(endpointHash)
    );
    if (!doc) {
        return 0;
    } else {
        return doc.value;
    }
}

declare type CheckpointDoc = { _id: string; value: number; };

export async function setLastPushSequence(
    collection: RxCollection,
    endpointHash: string,
    sequence: number
): Promise<CheckpointDoc> {
    const _id = pushSequenceId(endpointHash);

    const doc = await findLocalDocument<CheckpointDoc>(
        collection.localDocumentsStore,
        _id
    );
    if (!doc) {
        const res = await writeSingleLocal<CheckpointDoc>(
            collection.localDocumentsStore,
            {
                document: {
                    _id,
                    value: sequence,
                    _attachments: {}
                }
            }
        );
        return res as any;
    } else {
        const newDoc = flatClone(doc);
        newDoc.value = sequence;
        const res = await writeSingleLocal<CheckpointDoc>(
            collection.localDocumentsStore,
            {
                previous: doc,
                document: {
                    _id,
                    value: sequence,
                    _attachments: {}
                }
            }
        );
        return res as any;
    }
}


export async function getChangesSinceLastPushSequence<RxDocType>(
    collection: RxCollection<RxDocType, any>,
    endpointHash: string,
    batchSize = 10
): Promise<{
    changes: ChangeStreamEvent<RxDocType>[];
    lastSequence: number;
}> {
    let lastPushSequence = await getLastPushSequence(
        collection,
        endpointHash
    );

    let retry = true;
    let lastSequence: number = lastPushSequence;
    let changes: ChangeStreamEvent<RxDocType>[] = [];

    /**
     * it can happen that all docs in the batch
     * do not have to be replicated.
     * Then we have to continue grapping the feed
     * until we reach the end of it
     */
    while (retry) {

        const changesResult = await collection.storageInstance.getChanges({
            startSequence: lastPushSequence,
            limit: batchSize,
            order: 'asc'
        });
        changes = changesResult.changes;
        lastSequence = changesResult.lastSequence;

        const filteredResults = changes.filter((change) => {
            const changeDoc = change.doc ? change.doc : change.previous;
            if (!changeDoc || changeDoc === 'UNKNOWN') {
                throw newRxError('SNH', { args: { changeDoc } });
            }

            /**
             * filter out changes with revisions resulting from the pull-stream
             * so that they will not be upstreamed again
             */
            if (wasRevisionfromPullReplication(
                endpointHash,
                changeDoc._rev
            )) return false;

            return true;
        });

        const useResults = filteredResults;


        if (useResults.length === 0 && changes.length === batchSize) {
            // no pushable docs found but also not reached the end -> re-run
            lastPushSequence = lastSequence;
            retry = true;
        } else {
            changes = useResults;
            retry = false;
        }
    }

    return {
        changes,
        lastSequence
    };
}


//
// things for pull-checkpoint
//


const pullLastDocumentId = (endpointHash: string) => GRAPHQL_REPLICATION_PLUGIN_IDENT + '-pull-checkpoint-' + endpointHash;

export async function getLastPullDocument(
    collection: RxCollection,
    endpointHash: string
) {
    const localDoc = await findLocalDocument<any>(
        collection.localDocumentsStore,
        pullLastDocumentId(endpointHash)
    );
    if (!localDoc) {
        return null;
    } else {
        return localDoc.doc;
    }
}

export async function setLastPullDocument(
    collection: RxCollection,
    endpointHash: string,
    doc: any
): Promise<{ _id: string }> {
    const _id = pullLastDocumentId(endpointHash);

    const localDoc: RxLocalDocumentData = await findLocalDocument<any>(
        collection.localDocumentsStore,
        _id
    );

    if (!localDoc) {
        return writeSingleLocal(
            collection.localDocumentsStore,
            {
                document: {
                    _id,
                    doc,
                    _attachments: {}
                }
            }
        );
    } else {
        const newDoc = flatClone(localDoc);
        newDoc.doc = doc;
        return writeSingleLocal(
            collection.localDocumentsStore,
            {
                previous: localDoc,
                document: newDoc
            }
        );
    }
}
