import type { ChangeEvent } from 'event-reduce-js';
import { RxDocumentMeta } from './rx-document';
import { MangoQuery } from './rx-query';
import { RxJsonSchema } from './rx-schema';
import { StringKeys } from './util';

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
    }

    /**
     * Contains a revision which is concated with a [height: number]-[identifier: string]
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

    /**
     * RxDB specific meta data of the document.
     * TODO in RxDB version 12 we introduced the _meta field.
     * But for easier migration, _deleted, _rev etc. are still at the root level
     * of the document.
     * In the next major release 13 we should move these values into the _meta field.
     */
    _meta: RxDocumentMeta;
}

export type RxDocumentDataById<RxDocType> = {
    [documentId: string]: RxDocumentData<RxDocType>;
}

/**
 * The document data how it is send to the
 * storage instance to save it.
 */
export type RxDocumentWriteData<T> = RxDocumentData<T> & {
    _attachments: {
        /**
         * To create a new attachment, set the write data
         * To delete an attachment, leave it out on the _attachments property.
         * To change an attachment, set the new write data.
         * To not touch an attachment, just send the stub again
         * which came out of the storage instance.
         */
        [attachmentId: string]: RxAttachmentData | RxAttachmentWriteData;
    }
};

export type WithDeleted<DocType> = DocType & {
    _deleted: boolean;
}

/**
 * Send to the bulkWrite() method of a storage instance.
 */
export type BulkWriteRow<RxDocType> = {
    /**
     * The current document state in the storage engine,
     * assumed by the application.
     * Undefined if the document is a new insert.
     * While with pouchdb we have to practically only provide the previous revision
     * we here have to send the full previous document data.
     * The reason is that to get the previous revision you anyway have to get the full
     * previous document and so it is easier to just send it all to the storage instance.
     * This will later allow us to use something different then the _rev key for conflict detection
     * when we implement other storage instances.
     */
    previous?: RxDocumentData<RxDocType>,
    /**
     * The new document data to be stored in the storage instance.
     */
    document: RxDocumentWriteData<RxDocType>
};
export type BulkWriteRowById<RxDocType> = {
    [documentId: string]: BulkWriteRow<RxDocType>;
}


/**
 * Meta data of the attachment.
 * Created by RxDB, not by the RxStorage.
 */
export type RxAttachmentDataMeta = {
    /**
     * The digest which is the output of the hash function
     * from storage.statics.hash(attachment.data)
     */
    digest: string;
    /**
     * Size of the attachments data
     */
    length: number;
};

/**
 * Meta data of the attachment
 * how it is send to, or comes out of the RxStorage implementation.
 */
export type RxAttachmentData = RxAttachmentDataMeta & {
    /**
     * Content type like 'plain/text'
     */
    type: string;
}

/**
 * Data which is needed for new attachments
 * that are send from RxDB to the RxStorage implementation.
 */
export type RxAttachmentWriteData = RxAttachmentData & {
    /**
     * The data of the attachment. As string in base64 format.
     * In the past we used BlobBuffer internally but it created many
     * problems because of then we need the full data (for encryption/compression)
     * so we anyway have to get the string value out of the BlobBuffer.
     * 
     * Also using BlobBuffer has no performance benefit because in some RxStorage implementations,
     * like PouchDB, it just keeps the transaction open for longer because the BlobBuffer
     * has be be read.
     */
    data: string;
}


/**
 * Error that can happer per document when
 * RxStorage.bulkWrite() is called
 */
export type RxStorageBulkWriteError<RxDocType> = {

    status: number |
    409 // conflict
    /**
     * Before you add any other status code,
     * check pouchdb/packages/node_modules/pouch-errors/src/index.js
     * and try to use the same code as PouchDB does.
     */
    ;

    /**
     * set this property to make it easy
     * to detect if the object is a RxStorageBulkWriteError
     */
    isError: true;

    // primary key of the document
    documentId: string;

    // the original document data that should have been written.
    writeRow: BulkWriteRow<RxDocType>;

    /**
     * The error state must contain the
     * document state in the database.
     * This ensures that we can continue resolving a conflict
     * without having to pull the document out of the db first.
     * Is not set if the error happens on an insert.
     */
    documentInDb?: RxDocumentData<RxDocType>;
}

export type RxStorageBulkWriteResponse<DocData> = {
    /**
     * A map that is indexed by the documentId
     * contains all succeded writes.
     */
    success: RxDocumentDataById<DocData>;

    /**
     * A map that is indexed by the documentId
     * contains all errored writes.
     */
    error: {
        [documentId: string]: RxStorageBulkWriteError<DocData>;
    };
}

export type PreparedQuery<DocType> = MangoQuery<DocType> | any;

/**
 * We return a complex object instead of a single array
 * so we are able to add additional fields in the future.
 */
export type RxStorageQueryResult<RxDocType> = {
    // the found documents, sort order is important.
    documents: RxDocumentData<RxDocType>[];
}

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
}

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
}

/**
 * In the past we handles each RxChangeEvent by its own.
 * But it has been shown that this take way more performance then needed,
 * especially when the events get transfered over a data layer
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
     * must return all items that have been modied AFTER this write event.
     */
    checkpoint: CheckpointType;

    /**
     * The context that was given at the call to bulkWrite()
     * that caused this EventBulk.
     */
    context: string;
}

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

export type RxStorageChangeEvent<DocType> = {
    /**
     * Unique identifier for the event.
     * When another event with the same id appears, it will be skipped.
     */
    eventId: string;
    documentId: string;
    change: ChangeEvent<RxDocumentData<DocType>>;

    /**
     * Unix time in milliseconds of when the operation was triggered
     * and when it was finished.
     * This is optional because we do not have this time
     * for events that come from inside of the storage instance.
     * 
     * TODO do we even need this values?
     */
    startTime?: number;
    endTime?: number;
}



/**
 * An example for how a RxStorage checkpoint can look like.
 * NOTICE: Not all implementations use this type.
 */
export type RxStorageDefaultCheckpoint = {
    id: string;
    lwt: number;
} | null;



export type CategorizeBulkWriteRowsOutput<RxDocType> = {
    bulkInsertDocs: BulkWriteRow<RxDocType>[];
    bulkUpdateDocs: BulkWriteRow<RxDocType>[];
    /**
     * Ids of all documents that are changed
     * and so their change must be written into the
     * sequences table so that they can be fetched via
     * RxStorageInstance().getChangedDocumentsSince().
     */
    changedDocumentIds: RxDocumentData<RxDocType>[StringKeys<RxDocType>][];

    /**
     * TODO directly return a docId->error object
     * like in the return value of bulkWrite().
     * This will improve performance because we do not have to iterate
     * over the error array again.
     */
    errors: RxStorageBulkWriteError<RxDocType>[];
    eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, any>;
    attachmentsAdd: {
        documentId: string;
        attachmentId: string;
        attachmentData: RxAttachmentWriteData;
    }[];
    attachmentsRemove: {
        documentId: string;
        attachmentId: string;
    }[];
    attachmentsUpdate: {
        documentId: string;
        attachmentId: string;
        attachmentData: RxAttachmentWriteData;
    }[];
};
