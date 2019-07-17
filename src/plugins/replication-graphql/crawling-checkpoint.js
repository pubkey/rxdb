import {
    LOCAL_PREFIX
} from '../../util';

import {
    PLUGIN_IDENT,
    getDocFromPouchOrNull
} from './helper';


/**
 * used to save checkpoint while itterating the pouchdb-documents
 * so when the db starts again, we do not have to get all documents again
 */

const pushSequenceId = endpointHash => LOCAL_PREFIX + PLUGIN_IDENT + '-push-sequence-' + endpointHash;

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
    }
    return collection.pouch.put(doc);
}







const pullLastDocumentId = endpointHash => LOCAL_PREFIX + PLUGIN_IDENT + '-latest-document-' + endpointHash;

export async function getLastPullDocument(collection, endpointHash) {
    const localDoc = await getDocFromPouchOrNull(collection, pullLastDocumentId(endpointHash));
    if (!localDoc) return null;
    else {
        console.log('got !!');
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
