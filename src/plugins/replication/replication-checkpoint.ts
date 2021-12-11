import type {
    RxCollection,
    RxLocalDocumentData,
    RxDocumentData,
    ReplicationCheckpointDocument
} from '../../types';
import {
    findLocalDocument,
    writeSingleLocal
} from '../../rx-storage-helper';
import { flatClone } from '../../util';
import { newRxError } from '../../rx-error';
import { wasRevisionfromPullReplication } from './revision-flag';

//
// things for the push-checkpoint
//

const pushSequenceId = (replicationIdentifier: string) => 'replication-checkpoint-push-' + replicationIdentifier;
const pullLastDocumentId = (replicationIdentifier: string) => 'replication-checkpoint-pull-' + replicationIdentifier;


/**
 * Get the last push checkpoint
 */
export async function getLastPushSequence(
    collection: RxCollection,
    replicationIdentifier: string
): Promise<number> {
    const doc = await findLocalDocument<ReplicationCheckpointDocument>(
        collection.localDocumentsStore,
        pushSequenceId(replicationIdentifier)
    );
    if (!doc) {
        return 0;
    } else {
        return doc.value;
    }
}

export async function setLastPushSequence(
    collection: RxCollection,
    replicationIdentifier: string,
    sequence: number
): Promise<ReplicationCheckpointDocument> {
    const _id = pushSequenceId(replicationIdentifier);

    const doc = await findLocalDocument<ReplicationCheckpointDocument>(
        collection.localDocumentsStore,
        _id
    );
    if (!doc) {
        const res = await writeSingleLocal<ReplicationCheckpointDocument>(
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
        const res = await writeSingleLocal<ReplicationCheckpointDocument>(
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
    replicationIdentifier: string,
    batchSize = 10
): Promise<{
    changedDocs: Map<string, {
        id: string;
        doc: RxDocumentData<RxDocType>;
        sequence: number;
    }>;
    lastSequence: number;
}> {
    let lastPushSequence = await getLastPushSequence(
        collection,
        replicationIdentifier
    );

    let retry = true;
    let lastSequence: number = lastPushSequence;
    const changedDocs: Map<string, {
        id: string;
        doc: RxDocumentData<RxDocType>;
        sequence: number;
    }> = new Map();

    /**
     * it can happen that all docs in the batch
     * do not have to be replicated.
     * Then we have to continue grapping the feed
     * until we reach the end of it
     */
    while (retry) {

        const changesResults = await collection.storageInstance.getChangedDocuments({
            sinceSequence: lastPushSequence,
            limit: batchSize,
            direction: 'after'
        });
        lastSequence = changesResults.lastSequence;

        // optimisation shortcut, do not proceed if there are no changed documents
        if (changesResults.changedDocuments.length === 0) {
            retry = false;
            continue;
        }

        const docs = await collection.storageInstance.findDocumentsById(
            changesResults.changedDocuments.map(row => row.id),
            true
        );

        changesResults.changedDocuments.forEach((row) => {
            const id = row.id;
            if (changedDocs.has(id)) {
                return;
            }
            const changedDoc = docs[id];
            if (!changedDoc) {
                throw newRxError('SNH', { args: { docs } });
            }

            /**
             * filter out changes with revisions resulting from the pull-stream
             * so that they will not be upstreamed again
             */
            if (
                wasRevisionfromPullReplication(
                    replicationIdentifier,
                    changedDoc._rev
                )
            ) {
                return false;
            }

            changedDocs.set(id, {
                id,
                doc: changedDoc,
                sequence: row.sequence
            });
        });


        if (changedDocs.size < batchSize && changesResults.changedDocuments.length === batchSize) {
            // no pushable docs found but also not reached the end -> re-run
            lastPushSequence = lastSequence;
            retry = true;
        } else {
            retry = false;
        }
    }

    return {
        changedDocs,
        lastSequence
    };
}



//
// things for pull-checkpoint
//

export async function getLastPullDocument<RxDocType>(
    collection: RxCollection<RxDocType>,
    replicationIdentifier: string,
): Promise<RxDocumentData<RxDocType> | null> {
    const localDoc = await findLocalDocument<any>(
        collection.localDocumentsStore,
        pullLastDocumentId(replicationIdentifier)
    );
    if (!localDoc) {
        return null;
    } else {
        return localDoc.doc;
    }
}

export async function setLastPullDocument(
    collection: RxCollection,
    replicationIdentifier: string,
    doc: any
): Promise<{ _id: string }> {
    const _id = pullLastDocumentId(replicationIdentifier);

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
