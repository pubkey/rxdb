import {
    LOCAL_PREFIX
} from '../../util';

import {
    PLUGIN_IDENT,
    getDocFromPouchOrNull,
    wasRevisionfromPullReplication
} from './helper';

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


const pushSequenceId = endpointHash => LOCAL_PREFIX + PLUGIN_IDENT + '-push-checkpoint-' + endpointHash;

/**
 * @return {number} last sequence checkpoint
 */
export async function getLastPushSequence(
    collection,
    endpointHash
) {
    const doc = await getDocFromPouchOrNull(
        collection,
        pushSequenceId(endpointHash)
    );
    if (!doc) return 0;
    else return doc.value;
}

export async function setLastPushSequence(
    collection,
    endpointHash,
    seq
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


/**
 * 
 * @param {*} collection 
 * @param {*} endpointHash 
 * @param {*} batchSize 
 * @return {Promise<{results: {id: string, seq: number, changes: {rev: string}[]}[], last_seq: number}>}
 */
export async function getChangesSinceLastPushSequence(
    collection,
    endpointHash,
    batchSize = 10,
) {
    const lastPushSequence = await getLastPushSequence(
        collection,
        endpointHash
    );

    const changes = await collection.pouch.changes({
        since: lastPushSequence,
        limit: batchSize,
        include_docs: true
    });

    /**
     * filter out changes with revisions resulting from the pull-stream
     * so that they will not be upstreamed again
     */
    changes.results = changes.results.filter(change => {
        return !wasRevisionfromPullReplication(
            endpointHash,
            change.doc._rev
        );
    });


    changes.results.forEach(change => {
        change.doc = collection._handleFromPouch(change.doc);
    });


    return changes;
}




//
// things for pull-checkpoint
//


const pullLastDocumentId = endpointHash => LOCAL_PREFIX + PLUGIN_IDENT + '-pull-checkpoint-' + endpointHash;

export async function getLastPullDocument(collection, endpointHash) {
    const localDoc = await getDocFromPouchOrNull(collection, pullLastDocumentId(endpointHash));
    if (!localDoc) return null;
    else {
        return localDoc.doc;
    }
}

export async function setLastPullDocument(collection, endpointHash, doc) {
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
