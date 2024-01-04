import type {
    MangoQuery,
    MangoQuerySelector,
    MangoQuerySortPart
} from './rx-query.d.ts';
import type { BulkWriteRow } from './rx-storage.d.ts';

/**
 * This file contains types that are CouchDB specific
 */

export interface CouchReplicationOptions {
    live?: boolean;
    retry?: boolean;
    filter?: Function;
    doc_ids?: string[];
    query_params?: any;
    view?: any;
    since?: number | 'now';
    heartbeat?: number;
    timeout?: number;
    batch_size?: number;
    batches_limit?: number;
    back_off_function?: Function;
    checkpoint?: false | 'source' | 'target';
    include_docs?: boolean;
    limit?: number;
}

export interface CouchChangesOptionsBase {
    include_docs?: boolean;
    conflicts?: boolean;
    attachments?: boolean;
    binary?: boolean;
    descending?: boolean;
    since?: any;
    limit?: number;
    timeout?: any;
    heartbeat?: number | boolean;
    filter?: any;
    doc_ids?: string | string[];
    query_param?: any;
    view?: any;
    return_docs?: boolean;
    batch_size?: number;
    style?: string;
}

export interface CouchChangesOptionsLive extends CouchChangesOptionsBase {
    live: true;
}

export interface CouchChangesOptionsNonLive extends CouchChangesOptionsBase {
    live: false;
}
interface CouchChangesOnChangeEvent {
    on: (eventName: string, handler: Function) => void;
    off: (eventName: string, handler: Function) => void;
    cancel(): void;
}

export type CouchWriteError = {
    /**
      * status code from couchdb
      * 409 for 'conflict'
    */
    status: number;
    error: true;
    /**
     * primary key value of the errored document
     */
    id: string;
};

/**
 * possible couch-settings
 * @link https://couchdb.com/api.html#create_database
 */
export interface CouchSettings {
    auto_compaction?: boolean;
    revs_limit?: number;
    ajax?: any;
    fetch?: any;
    auth?: any;
    skip_setup?: boolean;
    storage?: any;
    size?: number;
    location?: string;
    iosDatabaseLocation?: string;
}

/**
 * options for couch.allDocs()
 * @link https://couchdb.com/api.html#batch_fetch
 */
export type CouchAllDocsOptions = {
    include_docs?: boolean;
    conflicts?: boolean;
    attachments?: boolean;
    binary?: boolean;
    startkey?: string;
    endkey?: string;
    inclusive_end?: boolean;
    limit?: number;
    skip?: number;
    descending?: boolean;
    key?: string;
    keys?: string[];
    update_seq?: string;

    // undocument but needed
    revs?: boolean;
    deleted?: 'ok';
};

export type CouchSyncHandlerEvents = 'change' | 'paused' | 'active' | 'error' | 'complete';
export type CouchSyncHandler = {
    on(ev: CouchSyncHandlerEvents, fn: (el: any) => void): void;
    off(ev: CouchSyncHandlerEvents, fn: any): void;
    cancel(): void;
};

export type CouchChangeRow = {
    id: string;
    seq: number;
    deleted?: true;
    changes: {
        rev: 'string';
    }[];
    /**
     * only if include_docs === true
     */
    doc?: CouchChangeDoc;
};

export type CouchAttachmentMeta = {
    digest: string;
    content_type: string;
    length: number;
    stub: boolean;

    /**
     * 'revpos indicates the generation number (numeric prefix in the revID) at which the attachment was last altered'
     *  @link https://github.com/couchbase/couchbase-lite-ios/issues/1200#issuecomment-206444554
     */
    revpos: number;
};

export type CouchAttachmentWithData = CouchAttachmentMeta & {
    /**
     * Base64 string with the data
     * or directly a buffer
     */
    data: Blob;
    type: string;
    /**
     * If set, must be false
     * because we have the full data and not only a stub.
     */
    stub?: false;
};

export type CouchChangeDoc = {
    _id: string;
    _rev: string;
    /**
     * True if the document is deleted.
     */
    _deleted?: boolean;
    _attachments: {
        [attachmentId: string]: CouchAttachmentMeta;
    };
};

export type WithAttachments<Data> = Data & {
    /**
     * Intentional optional,
     * if the document has no attachments,
     * we do NOT have an empty object.
     */
    _attachments?: {
        [attachmentId: string]: CouchAttachmentMeta;
    };
};
export type WithAttachmentsData<Data> = Data & {
    /**
     * Intentional optional,
     * if the document has no attachments,
     * we do NOT have an empty object.
     */
    _attachments?: {
        [attachmentId: string]: CouchAttachmentWithData;
    };
};


export type WithCouchMeta<Data> = Data & {
    _rev: string;
    _attachments?: {
        [attachmentId: string]: CouchAttachmentMeta;
    };
    _deleted?: boolean;
};

export type CouchdbChangesResult = {
    results: CouchChangeRow[];
    last_seq: number;
};

declare type Debug = {
    enable(what: string): void;
    disable(): void;
};

export type CouchDbSorting = (string | string[] | { [k: string]: 'asc' | 'desc' | 1 | -1; })[];

// this is not equal to the standard MangoQuery
// because of different sorting
export type CouchdbQuery = MangoQuery & {
    sort?: CouchDbSorting;
};

export type CouchBulkDocResultRow = {
    ok: boolean;
    id: string;
    rev: string;

    error?: 'conflict';
    reason?: string;
};

export type CouchCheckpoint = {
    sequence: number;
};

export type CouchBulkDocOptions = {
    new_edits?: boolean;

    // custom options for RxDB
    isDeeper?: boolean;
    custom?: {
        primaryPath: string;
        writeRowById: Map<string, BulkWriteRow<any>>;
        insertDocsById: Map<string, any>;
        previousDocsInDb: Map<string, any>;
        context: string;
    };
};

export type CouchMangoQuery<DocType> = MangoQuery<DocType> & {
    index: undefined;
    use_index?: string;
};

export type ExplainedCouchQuery<DocType> = {
    dbname: string;
    index: {
        ddoc: string | null;
        name: string; // 'idx-rxdb-index-age,_id'
        type: 'json';
        def: {
            fields: MangoQuerySortPart<DocType>[];
        };
    };
    selector: MangoQuerySelector<DocType>;
    range: {
        start_key: any[];
        end_key: any[];
    };
    opts: {
        use_index: string[];
        bookmark: string;
        sort: MangoQuerySortPart<DocType>[];
        conflicts: boolean;
        r: any[];
    };
    skip: number;
};

export type CouchAllDocsResponse = {
    offset: number;
    rows: {
        id: string;
        doc: any;
        key: string;
        value: {
            rev: string;
            deleted?: boolean;
        };
        error?: 'not_found' | string;
    }[];
    total_rows: number;
};
