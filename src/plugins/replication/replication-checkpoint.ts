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
import { flatClone, getDefaultRxDocumentMeta } from '../../util';
import { newRxError } from '../../rx-error';
import { wasLastWriteFromPullReplication } from './revision-flag';
import { runPluginHooks } from '../../hooks';

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
        pushSequenceId(replicationIdentifier),
        false
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
        _id,
        false
    );
    if (!doc) {
        const res = await writeSingleLocal<ReplicationCheckpointDocument>(
            collection.localDocumentsStore,
            {
                document: {
                    _id,
                    value: sequence,
                    _deleted: false,
                    _meta: getDefaultRxDocumentMeta(),
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
                    _meta: getDefaultRxDocumentMeta(),
                    _deleted: false,
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
    replicationIdentifierHash: string,
    /**
     * A function that returns true
     * when the underlaying RxReplication is stopped.
     * So that we do not run requests against a close RxStorageInstance.
     */
    isStopped: () => boolean,
    batchSize = 10
): Promise<{
    // for better performance we also store the ids of the changed docs.
    changedDocIds: Set<string>,
    changedDocs: Map<string, {
        id: string;
        doc: RxDocumentData<RxDocType>;
        sequence: number;
    }>;
    lastSequence: number;
    hasChangesSinceLastSequence: boolean;
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
    const changedDocIds: Set<string> = new Set();

    /**
     * it can happen that all docs in the batch
     * do not have to be replicated.
     * Then we have to continue grapping the feed
     * until we reach the end of it
     */
    while (retry && !isStopped()) {
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

        const docIds = changesResults.changedDocuments.map(row => row.id);

        if (isStopped()) {
            break;
        }


        const docs = await collection.storageInstance.findDocumentsById(
            docIds,
            true
        );

        changesResults.changedDocuments.forEach((row) => {
            const id = row.id;
            if (changedDocs.has(id)) {
                return;
            }
            let changedDoc = docs[id];
            if (!changedDoc) {
                throw newRxError('SNH', { args: { docs, docIds } });
            }

            /**
             * filter out changes with revisions resulting from the pull-stream
             * so that they will not be upstreamed again
             */
            if (
                wasLastWriteFromPullReplication(
                    replicationIdentifierHash,
                    changedDoc
                )
            ) {
                return false;
            }

            // TODO why do we have to run the hooks here? arent they run by the storage instance wrapper?
            const hookParams = {
                collection,
                doc: changedDoc
            };
            runPluginHooks('postReadFromInstance', hookParams);

            changedDoc = hookParams.doc;

            changedDocIds.add(id);
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
        changedDocIds,
        changedDocs,
        lastSequence,
        hasChangesSinceLastSequence: lastPushSequence !== lastSequence,
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
        pullLastDocumentId(replicationIdentifier),
        false
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
        _id,
        false
    );

    if (!localDoc) {
        return writeSingleLocal(
            collection.localDocumentsStore,
            {
                document: {
                    _id,
                    doc,
                    _meta: getDefaultRxDocumentMeta(),
                    _deleted: false,
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
