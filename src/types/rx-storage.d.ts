/**
 * Contains plain document data
 * but with meta information that must be stored together
 * with the document.
 */
export type RxStorageDocument<RxDocType> = RxDocType & {
    /**
     * Contains a revision which is concated with a [height: number]-[identifier: string]
     * like: '1-3hl4kj3l4kgj34g34glk'
     */
    _revision: string;

    /**
     * meta data about all attachments (=binary files)
     * that are stored with the document
     */
    _attachments?: any[]; // TODO define attachments data also it might be better to have this required
}

export type RxLocalDocumentData = {
    // Local documents always have _id as primary
    _id: string
} & { [key: string]: any };

export type RxStorageBulkWriteDocument<RxDocType> = RxStorageBulkWriteDocumentLocal | {
    isLocal: false;
    /**
     * The document data which must be written
     */
    document: RxStorageDocument<RxDocType>;
}

export type RxStorageBulkWriteDocumentLocal = {
    /**
     * If isLocal is set to true, this write goes to a local document
     * which is saved besides the 'normal' documents,
     * but is not returned in any non-local queries.
     */
    isLocal: true;
    // local documents are schemaless and contain any data
    document: RxLocalDocumentData
}

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
    document: RxDocType;
}

export type RxStorageBulkWriteResponse<RxDocType> = {
    /**
     * A map that is indexed by the documentId
     * contains all succeded writes.
     */
    success: Map<string, {
        // primary key of the document
        documentId: string;
        document: RxDocType;
    }>;

    /**
     * A map that is indexed by the documentId
     * contains all errored writes.
     */
    error: Map<string, RxStorageBulkWriteError<RxDocType>>;

}
