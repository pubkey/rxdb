import { MangoQuery, MangoQuerySelector, MangoQuerySortPart } from './rx-query';
import { BulkWriteRow } from './rx-storage';

/**
 * this file contains types that are pouchdb-specific
 * most of it is copied from @types/pouchdb
 * because it is outdated and strange
 */

export interface PouchReplicationOptions {
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

/**
 * @link https://pouchdb.com/api.html#changes
 */
export interface PouchChangesOptionsBase {
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

export interface PouchChangesOptionsLive extends PouchChangesOptionsBase {
    live: true;
}

export interface PouchChangesOptionsNonLive extends PouchChangesOptionsBase {
    live: false;
}
interface PouchChangesOnChangeEvent {
    on: (eventName: string, handler: Function) => void;
    off: (eventName: string, handler: Function) => void;
    cancel(): void;
}

export type PouchWriteError = {
    /**
      * status code from pouchdb
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
 * possible pouch-settings
 * @link https://pouchdb.com/api.html#create_database
 */
export interface PouchSettings {
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
 * options for pouch.allDocs()
 * @link https://pouchdb.com/api.html#batch_fetch
 */
export type PouchAllDocsOptions = {
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

export type PouchSyncHandlerEvents = 'change' | 'paused' | 'active' | 'error' | 'complete';
export type PouchSyncHandler = {
    on(ev: PouchSyncHandlerEvents, fn: (el: any) => void): void;
    off(ev: PouchSyncHandlerEvents, fn: any): void;
    cancel(): void;
};

export type PouchChangeRow = {
    id: string;
    seq: number;
    deleted?: true;
    changes: {
        rev: 'string'
    }[],
    /**
     * only if include_docs === true
     */
    doc?: PouchChangeDoc
}

export type PouchAttachmentMeta = {
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

export type BlobBuffer = Buffer | Blob;

export type PouchAttachmentWithData = PouchAttachmentMeta & {
    /**
     * Base64 string with the data
     * or directly a buffer
     */
    data: BlobBuffer;
    type: string;
    /**
     * If set, must be false
     * because we have the full data and not only a stub.
     */
    stub?: false;
}

export type PouchChangeDoc = {
    _id: string;
    _rev: string;
    /**
     * True if the document is deleted.
     */
    _deleted?: boolean;
    _attachments: {
        [attachmentId: string]: PouchAttachmentMeta
    };
}

export type WithAttachments<Data> = Data & {
    /**
     * Intentional optional,
     * if the document has no attachments,
     * we do NOT have an empty object.
     */
    _attachments?: {
        [attachmentId: string]: PouchAttachmentMeta
    };
}
export type WithAttachmentsData<Data> = Data & {
    /**
     * Intentional optional,
     * if the document has no attachments,
     * we do NOT have an empty object.
     */
    _attachments?: {
        [attachmentId: string]: PouchAttachmentWithData
    };
}


export type WithPouchMeta<Data> = Data & {
    _rev: string;
    _attachments?: {
        [attachmentId: string]: PouchAttachmentMeta
    };
    _deleted?: boolean;
}

export type PouchdbChangesResult = {
    results: PouchChangeRow[];
    last_seq: number;
}

declare type Debug = {
    enable(what: string): void;
    disable(): void;
};

export type PouchDbSorting = (string | string[] | { [k: string]: 'asc' | 'desc' | 1 | -1 })[];

// this is not equal to the standard MangoQuery
// because of different sorting
export type PouchdbQuery = MangoQuery & {
    sort?: PouchDbSorting
};

export type PouchBulkDocResultRow = {
    ok: boolean;
    id: string;
    rev: string;

    error?: 'conflict';
    reason?: string;
}

export type PouchCheckpoint = {
    sequence: number;
}

export type PouchBulkDocOptions = {
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
}

export type PouchMangoQuery<DocType> = MangoQuery<DocType> & {
    index: undefined;
    use_index?: string;
};

export type ExplainedPouchQuery<DocType> = {
    dbname: string;
    index: {
        ddoc: string | null;
        name: string; // 'idx-rxdb-index-age,_id'
        type: 'json';
        def: {
            fields: MangoQuerySortPart<DocType>[];
        }
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
}

export type PouchAllDocsResponse = {
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

export declare class PouchDBInstance {
    constructor(
        name: string,
        options: { adapter: string }
    );
    readonly name: string;
    readonly adapter: string;

    readonly __opts: {
        db: any | string; // contains the adapter function
        deterministic_revs: boolean;
        name: string;
        adapter: string;
    };

    static debug: Debug;

    static plugin(p: any): void;
    static isInstanceOf(instance: any): boolean;
    info(): Promise<any>;

    allDocs(options?: PouchAllDocsOptions): Promise<PouchAllDocsResponse>;

    bulkDocs(
        docs: { docs: any[] } | any[],
        options?: PouchBulkDocOptions,
    ): Promise<(PouchBulkDocResultRow | PouchWriteError)[]>;


    find<DocumentData>(mangoQuery: PouchdbQuery): Promise<{
        docs: WithPouchMeta<DocumentData>[]
    }>;
    compact(options?: any): Promise<any>;
    destroy(options?: any): Promise<void>;
    get(
        docId: string,
        options?: any
    ): Promise<null | ({
        _id: string
    } & any)>;
    put(
        doc: any,
        options?: any,
    ): Promise<PouchBulkDocResultRow>;
    remove(
        doc: any | string,
        options?: any,
    ): Promise<any>;

    changes(options: PouchChangesOptionsNonLive): Promise<PouchdbChangesResult>;
    changes(options: PouchChangesOptionsLive): PouchChangesOnChangeEvent;
    changes(): Promise<PouchdbChangesResult>;

    sync(remoteDb: string | any, options?: PouchReplicationOptions): PouchSyncHandler;
    replicate(options?: PouchReplicationOptions): PouchSyncHandler;

    close(): Promise<void>;
    putAttachment(
        docId: string,
        attachmentId: string,
        rev: string,
        attachment: any,
        type: string
    ): Promise<any>;
    getAttachment(
        docId: string,
        attachmentId: string,
        options?: { rev?: string },
    ): Promise<BlobBuffer>;
    removeAttachment(
        docId: string,
        attachmentId: string,
        rev: string
    ): Promise<void>;

    /**
     * @link https://pouchdb.com/api.html#bulk_get
     */
    bulkGet(options: {
        docs: {
            // ID of the document to fetch
            id: string;
            // Revision of the document to fetch. If this is not specified, all available revisions are fetched
            rev?: string;

            //  I could not find out what this should be
            atts_since?: any;
        }[],
        // Each returned revision body will include its revision history as a _revisions property. Default is false
        revs?: boolean;
        // what does this?
        latest?: boolean;
        // Include attachment data in the response. Default is false, resulting in only stubs being returned.
        attachments?: boolean;
        // Return attachment data as Blobs/Buffers, instead of as base64-encoded strings. Default is false
        binary?: boolean;
    }): Promise<{
        results: {
            id: string;
            docs: {
                ok?: {
                    _id: string;
                    _rev: string;
                    _revisions: {
                        ids: string[];
                        start: number;
                    }
                }
                error?: {
                    error: string;
                    id: string;
                    reason: string;
                    rev: string;
                }
            }[]
        }[]
    }>;

    revsDiff(diff: any): Promise<any>;
    explain<DocType = any>(query: PouchMangoQuery<DocType>): Promise<ExplainedPouchQuery<DocType>>;

    getIndexes(): Promise<{
        indexes: {
            ddoc: any | null;
            name: string;
            type: string;
            def: {
                fields: {
                    [key: string]: 'asc' | 'desc'
                }[];
            }
        }[];
        total_rows: number;
    }>;

    createIndex(opts: {
        name: string;
        ddoc: string;
        index: any;
    }): Promise<void>;

    /**
     * @link https://pouchdb.com/errors.html#event_emitter_limit
     */
    setMaxListeners(maxListenersAmount: number): void;
    getMaxListeners(): number;
}
