

/**
 * Contains a revision which is concated with a [height: number]-[identifier: string]
 * like: '1-3hl4kj3l4kgj34g34glk'.
 * The revision is used to detect write conflicts and have a document history.
 * Revisions behave similar to couchdb revisions:
 * @link https://docs.couchdb.org/en/stable/replication/conflicts.html#revision-tree
 * When you create a new document, do not send a revision,
 * When you update an existing document, send the previous revision.
 * When you insert via overwrite: true, send the new revision you want to save the document with.
 */
export type WithWriteRevision<T> = T & {
    /**
     * When overwrite: false
     * The previous revision only exists if the document already existed.
     * If the previous revision is not the same as the documents revision stored in the database,
     * we have a write conflict that must be resolved.
     * When we insert a new document, use '1-new' as revision.
     *
     * When overwrite: true
     * The new revision is stored with the document
     * so that other write processes can know that they provoked a conflict
     * because the current revision is not the same as before.
     * The [height] of the new revision must be heigher then the [height] of the old revision.
     */
    _rev?: string;
}

// non-optional version of WithWriteRevision
export type WithRevision<T> = T & { _rev: string; }

/**
 * As other NoSQL databases,
 * RxDB also assumes that no data is finally deleted.
 * Instead the documents are stored with _deleted: true
 * which means they will not be returned at queries.
 */
export type WithDeleted<T> = T & {
    // deleted is optional. If not set, we assume _deleted: false
    _deleted?: boolean
}

export type RxLocalDocumentData = {
    // Local documents always have _id as primary
    _id: string
} & {
    // local documents are schemaless and contain any data
    [key: string]: any
};

/**
 * Error that can happer per document when
 * RxStorage.bulkWrite() is called
 */
export type RxStorageBulkWriteError<RxDocType> = {

    status: number |
    409 // conflict
    // TODO add other status codes from pouchdb
    ;

    /**
     * set this property to make it easy
     * to detect if the object is a RxStorageBulkWriteError
     */
    isError: true;

    // primary key of the document
    documentId: string;

    // the original document data that should have been written.
    document: WithWriteRevision<RxDocType>;
}

export type RxStorageBulkWriteResponse<DocData> = {
    /**
     * A map that is indexed by the documentId
     * contains all succeded writes.
     */
    success: Map<string, WithRevision<DocData>>;

    /**
     * A map that is indexed by the documentId
     * contains all errored writes.
     */
    error: Map<string, RxStorageBulkWriteError<DocData>>;
}

/**
 * We return a complex object instead of a single array
 * so we are able to add additional fields in the future.
 */
export type RxStorageQueryResult<RxDocType> = {
    // the found documents, sort order is important.
    documents: WithRevision<RxDocType>[];
}
