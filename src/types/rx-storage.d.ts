import type { ChangeEvent } from 'event-reduce-js';
import { BlobBuffer } from './pouch';
import { MangoQuery } from './rx-query';
import { RxJsonSchema } from './rx-schema';

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
    // deleted is optional. If not set, we assume _deleted: false
    // TODO make it required to ensure we have to correct value and type everywhere.
    _deleted?: boolean;

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

     * When you create a new document, do not send a revision,
     * When you update an existing document, do not send a revision.
     * When you insert via overwrite: true, send the new revision you want to save the document with.
     */
    _rev: string;
}

/**
 * The document data how it is send to the
 * storage instance to save it.
 */
export type RxDocumentWriteData<T> = T & {

    // deleted is optional. If not set, we assume _deleted: false
    // TODO make it required to ensure we have to correct value and type everywhere.
    _deleted?: boolean;

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

    /**
     * Only set when overwrite: true
     * The new revision is stored with the document
     * so that other write processes can know that they provoked a conflict
     * because the current revision is not the same as before.
     * The [height] of the new revision must be heigher then the [height] of the old revision.
     * When overwrite: false, the revision is taken from
     * the previous document of the BulkWriteRow
     */
    _rev?: string;
};

export type WithDeleted<DocType> = DocType & {
    _deleted: boolean;
}

/**
 * Send to the bulkWrite() method of a storage instance.
 */
export type BulkWriteRow<DocumentData> = {
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
    previous?: RxDocumentData<DocumentData>,
    /**
     * The new document data to be stored in the storage instance.
     */
    document: RxDocumentWriteData<DocumentData>
};

export type BulkWriteLocalRow<DocumentData> = {
    previous?: RxLocalDocumentData<DocumentData>,
    document: RxLocalDocumentData<DocumentData>
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
     * The data of the attachment.
     */
    data: BlobBuffer;
}


export type RxLocalDocumentData<
    Data = {
        // local documents are schemaless and contain any data
        [key: string]: any
    }
    > = {
        // Local documents always have _id as primary
        _id: string;

        // local documents cannot have attachments,
        // so this must always be an empty object.
        _attachments: {};

        _deleted?: boolean;
        _rev?: string;
    } & Data;

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
    writeRow: BulkWriteRow<RxDocType>;
}

export type RxStorageBulkWriteLocalError<D> = {
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
    writeRow: BulkWriteLocalRow<D>;
}

export type RxStorageBulkWriteResponse<DocData> = {
    /**
     * A map that is indexed by the documentId
     * contains all succeded writes.
     */
    success: {
        [documentId: string]: RxDocumentData<DocData>;
    };

    /**
     * A map that is indexed by the documentId
     * contains all errored writes.
     */
    error: {
        [documentId: string]: RxStorageBulkWriteError<DocData>;
    }
}

export type RxLocalStorageBulkWriteResponse<DocData> = {
    /**
     * A map that is indexed by the documentId
     * contains all succeded writes.
     */
    success: {
        [documentId: string]: RxLocalDocumentData<DocData>;
    };

    /**
     * A map that is indexed by the documentId
     * contains all errored writes.
     */
    error: {
        [documentId: string]: RxStorageBulkWriteLocalError<DocData>;
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

export type RxStorageInstanceCreationParams<DocumentData, InstanceCreationOptions> = {
    databaseName: string;
    collectionName: string;
    schema: RxJsonSchema<DocumentData>;
    options: InstanceCreationOptions;
    /**
     * If multiInstance is true, there can be more
     * then one instance of the database, for example
     * when multiple browser tabs exist or more then one Node.js
     * process relies on the same storage.
     */
    multiInstance: boolean;
}

export type RxKeyObjectStorageInstanceCreationParams<InstanceCreationOptions> = {
    databaseName: string;
    collectionName: string;
    options: InstanceCreationOptions;
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

export type ChangeStreamOnceOptions = ChangeStreamOptions & {
    /**
     * sinceSequence is not optional
     * on one time changes.
     */
    sinceSequence: number;

    /**
     * On one-time change stream results,
     * we can define the sort order
     * to either get events before sinceSequence
     * or events after sinceSequence.
     */
    direction: 'before' | 'after';

    limit?: number;
};

/**
 * In the past we handles each RxChangeEvent by its own.
 * But it has been shown that this take way more performance then needed,
 * especially when the events get transfered over a data layer
 * like with WebWorkers or the BroadcastChannel.
 * So we now process events as bulks internally.
 */
export type EventBulk<EventType> = {
    /**
     * Unique id of the bulk,
     * used to detect duplicate bulks
     * that have already been processed.
     */
    id: string;
    events: EventType[];
}

export type ChangeStreamEvent<DocumentData> = ChangeEvent<RxDocumentData<DocumentData>> & {
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

export type RxStorageChangedDocumentMeta = {
    id: string;
    sequence: number;
}


export type RxStorageChangeEvent<DocType> = {
    /**
     * Unique identifier for the event.
     * When another event with the same id appears, it will be skipped.
     */
    eventId: string;
    documentId: string;
    change: ChangeEvent<DocType>;

    /**
     * Unix time in milliseconds of when the operation was triggered
     * and when it was finished.
     * This is optional because we do not have this time
     * for events that come from inside of the storage instance.
     */
    startTime?: number;
    endTime?: number;
}
