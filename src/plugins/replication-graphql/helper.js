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