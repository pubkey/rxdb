import {
    LOCAL_PREFIX
} from '../../util';

import {
    PLUGIN_IDENT,
    getDocFromPouchOrNull,
    wasRevisionfromPullReplication
} from './helper';
import {
    RxCollection
} from '../../types';

/**
 * when the replication starts,
 * we need a way to find out where it ended the last time.
 *
 * For push-replication, we use the pouchdb-sequence:
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


const pushSequenceId = (endpointHash: string) => LOCAL_PREFIX + PLUGIN_IDENT + '-push-checkpoint-' + endpointHash;

/**
 * @return last sequence checkpoint
 */
export async function getLastPushSequence(
    collection: RxCollection,
    endpointHash: string
): Promise<number> {
    const doc = await getDocFromPouchOrNull(
        collection,
        pushSequenceId(endpointHash)
    );
    if (!doc) return 0;
    else return doc.value;
}

export async function setLastPushSequence(
    collection: RxCollection,
    endpointHash: string,
    seq: any
) {
    const _id = pushSequenceId(endpointHash);
    let doc = await getDocFromPouchOrNull(
        collection,
        _id
    );
    if (!doc) {
        doc = {
            _id,
            value: seq
        };
    } else {
        doc.value = seq;
    }

    const res = await collection.pouch.put(doc);
    return res;
}


export async function getChangesSinceLastPushSequence(
    collection: RxCollection,
    endpointHash: string,
    batchSize = 10,
): Promise<{ results: { id: string, seq: number, changes: { rev: string }[] }[], last_seq: number }> {
    let lastPushSequence = await getLastPushSequence(
        collection,
        endpointHash
    );

    let retry = true;
    let changes;

    /**
     * it can happen that all docs in the batch
     * do not have to be replicated.
     * Then we have to continue grapping the feed
     * until we reach the end of it
     */
    while (retry) {
        changes = await collection.pouch.changes({
            since: lastPushSequence,
            limit: batchSize,
            include_docs: true
        });
        const useResults = changes.results.filter((change: any) => {
            /**
             * filter out changes with revisions resulting from the pull-stream
             * so that they will not be upstreamed again
             */
            if (wasRevisionfromPullReplication(
                endpointHash,
                change.doc._rev
            )) return false;

            /**
             * filter out internal docs
             * that are used for views or indexes in pouchdb
             */
            if (change.id.startsWith('_design/')) return false;

            return true;
        });

        if (useResults.length === 0 && changes.results.length === batchSize) {
            // no pushable docs found but also not reached the end -> re-run
            lastPushSequence = changes.last_seq;
            retry = true;
        } else {
            changes.results = useResults;
            retry = false;
        }
    }


    changes.results.forEach((change: any) => {
        change.doc = collection._handleFromPouch(change.doc);
    });



    return changes;
}




//
// things for pull-checkpoint
//


const pullLastDocumentId = (endpointHash: string) => LOCAL_PREFIX + PLUGIN_IDENT + '-pull-checkpoint-' + endpointHash;

export async function getLastPullDocument(
    collection: RxCollection,
    endpointHash: string
) {
    const localDoc = await getDocFromPouchOrNull(collection, pullLastDocumentId(endpointHash));
    if (!localDoc) return null;
    else {
        return localDoc.doc;
    }
}

export async function setLastPullDocument(
    collection: RxCollection,
    endpointHash: string,
    doc: any
) {
    const _id = pullLastDocumentId(endpointHash);
    let localDoc = await getDocFromPouchOrNull(
        collection,
        _id
    );
    if (!localDoc) {
        localDoc = {
            _id,
            doc
        };
    } else {
        localDoc.doc = doc;
    }

    return collection.pouch.put(localDoc);
}
