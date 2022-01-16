import {
    wasRevisionfromPullReplication,
    GRAPHQL_REPLICATION_PLUGIN_IDENT
} from './helper';
import type {
    RxCollection,
    RxLocalDocumentData,
    RxDocumentData
} from '../../types';
import {
    findLocalDocument,
    writeSingleLocal
} from '../../rx-storage-helper';
import { flatClone } from '../../util';
import { newRxError } from '../../rx-error';
import { runPluginHooks } from '../../hooks';

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
    const doc = await collection.database.lockedRun(
        () => findLocalDocument<CheckpointDoc>(
            collection.localDocumentsStore,
            pushSequenceId(endpointHash)
        )
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

    const doc = await collection.database.lockedRun(
        () => findLocalDocument<CheckpointDoc>(
            collection.localDocumentsStore,
            _id
        )
    );

    if (!doc) {
        const res = await collection.database.lockedRun(
            () => writeSingleLocal<CheckpointDoc>(
                collection.localDocumentsStore,
                {
                    document: {
                        _id,
                        value: sequence,
                        _attachments: {}
                    }
                }
            )
        );
        return res as any;
    } else {
        const newDoc = flatClone(doc);
        newDoc.value = sequence;
        const res = await collection.database.lockedRun(
            () => writeSingleLocal<CheckpointDoc>(
                collection.localDocumentsStore,
                {
                    previous: doc,
                    document: {
                        _id,
                        value: sequence,
                        _attachments: {}
                    }
                }
            )
        );
        return res as any;
    }
}


export async function getChangesSinceLastPushSequence<RxDocType>(
    collection: RxCollection<RxDocType, any>,
    endpointHash: string,
    batchSize = 10
): Promise<{
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
        endpointHash
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
        const changesResults = await collection.database.lockedRun(
            () => collection.storageInstance.getChangedDocuments({
                sinceSequence: lastPushSequence,
                limit: batchSize,
                direction: 'after'
            })
        );
        lastSequence = changesResults.lastSequence;

        // optimisation shortcut, do not proceed if there are no changed documents
        if (changesResults.changedDocuments.length === 0) {
            retry = false;
            continue;
        }

        const plainDocs = await collection.database.lockedRun(
            () => collection.storageInstance.findDocumentsById(
                changesResults.changedDocuments.map(row => row.id),
                true
            )
        );

        const docs: Map<string, RxDocumentData<RxDocType>> = new Map();

        Object.entries(plainDocs).forEach(([docId, docData]) => {
            const hookParams = {
                collection,
                doc: docData
            };
            runPluginHooks('postReadFromInstance', hookParams);
            docs.set(docId, hookParams.doc);
        });

        changesResults.changedDocuments.forEach((row) => {
            const id = row.id;
            if (changedDocs.has(id)) {
                return;
            }
            const changedDoc = docs.get(id);
            if (!changedDoc) {
                throw newRxError('SNH', { args: { docs } });
            }

            /**
             * filter out changes with revisions resulting from the pull-stream
             * so that they will not be upstreamed again
             */
            if (wasRevisionfromPullReplication(
                endpointHash,
                changedDoc._rev
            )) {
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
        lastSequence,
        hasChangesSinceLastSequence: lastPushSequence !== lastSequence,
    };
}


//
// things for pull-checkpoint
//


const pullLastDocumentId = (endpointHash: string) => GRAPHQL_REPLICATION_PLUGIN_IDENT + '-pull-checkpoint-' + endpointHash;

export async function getLastPullDocument<RxDocType>(
    collection: RxCollection<RxDocType>,
    endpointHash: string
): Promise<RxDocType | null> {
    const localDoc = await collection.database.lockedRun(
        () => findLocalDocument<any>(
            collection.localDocumentsStore,
            pullLastDocumentId(endpointHash)
        )
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

    const localDoc: RxLocalDocumentData = await collection.database.lockedRun(
        () => findLocalDocument<any>(
            collection.localDocumentsStore,
            _id
        )
    );

    if (!localDoc) {
        return collection.database.lockedRun(
            () => writeSingleLocal(
                collection.localDocumentsStore,
                {
                    document: {
                        _id,
                        doc,
                        _attachments: {}
                    }
                }
            )
        );
    } else {
        const newDoc = flatClone(localDoc);
        newDoc.doc = doc;
        return collection.database.lockedRun(
            () => writeSingleLocal(
                collection.localDocumentsStore,
                {
                    previous: localDoc,
                    document: newDoc
                }
            )
        );
    }
}
