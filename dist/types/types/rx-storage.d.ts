import type { ChangeEvent } from 'event-reduce-js';
import type { RxChangeEvent } from './rx-change-event.d.ts';
import type { RxDocumentMeta } from './rx-document.d.ts';
import type { RxStorageWriteError } from './rx-error.d.ts';
import type { RxJsonSchema } from './rx-schema.d.ts';
import type { Override } from './util.d.ts';

/**
 * The document data how it comes out of the storage instance.
 * Contains all meta data like revision, attachments and deleted-flag.
 */
export type RxDocumentData<T> = T & {

    /**
     * As other NoSQL databases,
     * RxDB also assumes that no data is finally deleted.
     * Instead the documents are stored with _deleted: true
     * which means they will not be returned at queries.
     */
    _deleted: boolean;

    /**
     * The attachments meta data is stored besides to document.
     */
    _attachments: {
        [attachmentId: string]: RxAttachmentData;
    };

    /**
     * Contains a revision which is concatenated with a [height: number]-[identifier: string]
     * like: '1-3hl4kj3l4kgj34g34glk'.
     * The revision is used to detect write conflicts and have a document history.
     * Revisions behave similar to couchdb revisions:
     * @link https://docs.couchdb.org/en/stable/replication/conflicts.html#revision-tree

    * When writing a document, you must send the correct revision in the previous-field
     * to make sure that you do not cause a write conflict.
     * The revision of the 'new' document-field must be created, for example via util.createRevision().
     * Any revision that matches the [height]-[hash] format can be used.
     */
    _rev: string;
    _meta: RxDocumentMeta;
};

export type RxDocumentDataById<RxDocType> = {
    [documentId: string]: RxDocumentData<RxDocType>;
};

/**
 * The document data how it is send to the
 * storage instance to save it.
 */
// We & T here instead of in RxDocumentData to preserver indexability by keyof T which the Override breaks
export type RxDocumentWriteData<T> = T & Override<RxDocumentData<{}>, {
    _attachments: {
        /**
         * To create a new attachment, set the write data
         * To delete an attachment, leave it out on the _attachments property.
         * To change an attachment, set the new write data.
         * To not touch an attachment, just send the stub again
         * which came out of the storage instance.
         */
        [attachmentId: string]: RxAttachmentData | RxAttachmentWriteData;
    };
}>;

export type WithDeleted<DocType> = DocType & {
    _deleted: boolean;
};
export type WithDeletedAndAttachments<DocType> = DocType & {
    _deleted: boolean;

    /**
     * Here the _attachments might exist
     * or might not, depending one the use case.
     */
    _attachments?: {
        [attachmentId: string]: RxAttachmentData | RxAttachmentWriteData;
    };
};

/**
 * Send to the bulkWrite() method of a storage instance.
 */
export type BulkWriteRow<RxDocType> = {
    /**
     * The current document state in the storage engine,
     * assumed by the application.
     * Undefined if the document is a new insert.
     * Notice that we send the full document data as 'previous', not just the revision.
     * The reason is that to get the previous revision you anyway have to get the full
     * previous document and so it is easier to just send it all to the storage instance.
     * This will later allow us to use something different then the _rev key for conflict detection
     * when we implement other storage instances.
     */
    previous?: RxDocumentData<RxDocType>;
    /**
     * The new document data to be stored in the storage instance.
     */
    document: RxDocumentWriteData<RxDocType>;
};
export type BulkWriteRowById<RxDocType> = {
    [documentId: string]: BulkWriteRow<RxDocType>;
};

/**
 * After the RxStorage has processed all rows,
 * we have this to work with afterwards.
 */
export type BulkWriteRowProcessed<RxDocType> = BulkWriteRow<RxDocType> & {
    document: RxDocumentData<RxDocType>;
};


export type RxAttachmentData = {
    /**
     * Size of the attachments data
     */
    length: number;
    /**
     * Content type like 'plain/text'
     */
    type: string;
    /**
     * The hash of the attachments content.
     * It is calculated by RxDB, and send to the storage.
     * The only guarantee is that the digest will change when the attachments data changes.
     * @link https://github.com/pouchdb/pouchdb/issues/3156#issuecomment-66831010
     * @link https://github.com/pubkey/rxdb/pull/4107
     */
    digest: string;
};

/**
 * Data which is needed for new attachments
 * that are send from RxDB to the RxStorage implementation.
 */
export type RxAttachmentWriteData = RxAttachmentData & {
    /**
     * The data of the attachment. As string in base64 format.
     * In the past we used Blob internally but it created many
     * problems because of then we need the full data (for encryption/compression)
     * so we anyway have to get the string value out of the Blob.
     *
     * Also using Blob has no performance benefit because in some RxStorage implementations,
     * it just keeps the transaction open for longer because the Blob
     * has be be read.
     */
    data: string;
};


/**
 * The returned data from RxStorageInstance.bulkWrite()
 * For better performance, we do NOT use an indexed object,
 * but only plain arrays. Because most of the time
 * RxDB anyway only need the array data and we can save performance
 * by not indexing the results.
 *
 * We do not longer return the written documents. We only return the errors.
 * This is because we construct the written docs array from the input+errors anyway
 * and transferring large amounts of data has bad performance when the storage
 * is running in a different realm like a WebWorker or remote.
 */
export type RxStorageBulkWriteResponse<RxDocType> = {
    /**
     * contains all errored writes.
     */
    error: RxStorageWriteError<RxDocType>[];
};

/**
 * We return a complex object instead of a single array
 * so we are able to add additional fields in the future.
 */
export type RxStorageQueryResult<RxDocType> = {
    // the found documents, sort order is important.
    documents: RxDocumentData<RxDocType>[];
};

export type RxStorageCountResult = {
    count: number;
    /**
     * Returns the mode which was used by the storage
     * to count the documents.
     * If this returns 'slow', RxDB will throw by default
     * if 'allowSlowCount' is not set.
     */
    mode: 'fast' | 'slow';
};

export type RxStorageInstanceCreationParams<RxDocType, InstanceCreationOptions> = {

    /**
     * A string to uniquely identify the instance of the JavaScript object
     * of the RxDatabase where this RxStorageInstance belongs to.
     * In most cases you would use RxDatabase.token here.
     *
     * This is used so that we can add caching or reuse stuff that belongs to the same RxDatabase.
     * For example the BroadcastChannel that is used for event propagation between multiple browser tabs
     * is cached by this token.
     *
     * In theory we could just use the databaseName for that. But to make it easier in unit tests
     * to simulate cross-tab usage, we cannot assume that the databaseName is unique in a single
     * JavaScript process. Therefore we use the instance token instead.
     */
    databaseInstanceToken: string;


    databaseName: string;
    collectionName: string;
    schema: RxJsonSchema<RxDocumentData<RxDocType>>;
    options: InstanceCreationOptions;
    /**
     * If multiInstance is true, there can be more
     * then one instance of the database, for example
     * when multiple browser tabs exist or more then one Node.js
     * process relies on the same storage.
     */
    multiInstance: boolean;
    password?: string | any;

    /**
     * Some storages can do additional checks
     * that are performance expensive
     * and should only be done in dev-mode.
     */
    devMode: boolean;
};

export type ChangeStreamOptions = {

    /**
     * Sequence number of the first event to start with.
     * If you want to get all ongoing events,
     * first get the latest sequence number and input it here.
     *
     * Optional on changeStream,
     * will start from the newest sequence.
     */
    startSequence?: number;
    /**
     * limits the amount of results
     */
    limit?: number;
};

/**
 * In the past we handles each RxChangeEvent by its own.
 * But it has been shown that this take way more performance then needed,
 * especially when the events get transferred over a data layer
 * like with WebWorkers or the BroadcastChannel.
 * So we now process events as bulks internally.
 */
export type EventBulk<EventType, CheckpointType> = {
    /**
     * Unique id of the bulk,
     * used to detect duplicate bulks
     * that have already been processed.
     */
    id: string;
    events: EventType[];

    /**
     * Required for replication.
     * Passing this checkpoint into getChangedDocumentsSince()
     * must return all items that have been modified AFTER this write event.
     */
    checkpoint: CheckpointType;

    /**
     * The context that was given at the call to bulkWrite()
     * that caused this EventBulk.
     */
    context: string;
};

export type ChangeStreamEvent<DocType> = ChangeEvent<RxDocumentData<DocType>> & {
    /**
     * An integer that is increasing
     * and unique per event.
     * Can be used to sort events or get information
     * about how many events there are.
     */
    sequence: number;
    /**
     * The value of the primary key
     * of the changed document
     */
    id: string;
};

export type RxStorageChangeEvent<RxDocType> = Omit<RxChangeEvent<RxDocType>, 'isLocal' | 'collectionName'>;

/**
 * An example for how a RxStorage checkpoint can look like.
 * NOTICE: Not all implementations use this type.
 */
export type RxStorageDefaultCheckpoint = {
    id: string;
    lwt: number;
};




export type CategorizeBulkWriteRowsOutput<RxDocType> = {
    bulkInsertDocs: BulkWriteRowProcessed<RxDocType>[];
    bulkUpdateDocs: BulkWriteRowProcessed<RxDocType>[];

    errors: RxStorageWriteError<RxDocType>[];
    eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, any>;
    attachmentsAdd: {
        documentId: string;
        attachmentId: string;
        attachmentData: RxAttachmentWriteData;
        digest: string;
    }[];
    attachmentsRemove: {
        documentId: string;
        attachmentId: string;
        digest: string;
    }[];
    attachmentsUpdate: {
        documentId: string;
        attachmentId: string;
        attachmentData: RxAttachmentWriteData;
        digest: string;
    }[];
    /**
     * Contains the non-error document row that
     * has the newest _meta.lwt time.
     * Empty if no successful write exists.
     */
    newestRow?: BulkWriteRowProcessed<RxDocType>;
};
