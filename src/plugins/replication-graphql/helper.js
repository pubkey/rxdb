import {
    hash
} from '../../util';

export const PLUGIN_IDENT = 'rxdb-replication-graphql';

// does nothing
export const DEFAULT_MODIFIER = d => d;

/**
 * pouchdb will throw if a document is not found
 * this instead return null
 */
export function getDocFromPouchOrNull(collection, id) {
    return collection.pouch.get(id)
        .then(docData => {
            return docData;
        })
        .catch(() => null);
}

export function createRevisionForPulledDocument(
    endpointHash,
    doc
) {
    const dataHash = hash(doc);
    const ret =
        dataHash.substring(0, 8) + '-' +
        endpointHash.substring(0, 8) + '-' +
        PLUGIN_IDENT;

    return ret;
}

export function wasRevisionfromPullReplication(
    endpointHash,
    revision
) {
    const ending = '-' + endpointHash.substring(0, 8) + '-' + PLUGIN_IDENT;
    const ret = revision.endsWith(ending);
    return ret;
}