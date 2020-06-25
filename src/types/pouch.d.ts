import { MangoQuery } from './rx-query';

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

export declare class PouchDBInstance {
    constructor(
        name: string,
        options: { adapter: string }
    );
    readonly name: string;

    static debug: Debug;

    static plugin(p: any): void;
    static isInstanceOf(instance: any): boolean;
    static countAllUndeleted(pouchdb: PouchDBInstance): Promise<number>;
    info(): Promise<any>;

    allDocs(options?: PouchAllDocsOptions): Promise<{
        offset: number;
        rows: {
            id: string;
            doc: any;
            key: string;
            value: {
                rev: string;
            }
        }[];
        total_rows: number;
    }>;

    bulkDocs(
        docs: { docs: any[] } | any[],
        options?: any
    ): Promise<{
        ok: boolean;
        id: string;
        rev: string;
    }[]>;

    find(mangoQuery: PouchdbQuery): Promise<{
        docs: any[]
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
    ): Promise<{
        ok: boolean;
        id: string;
        rev: string;
    }>;
    remove(
        doc: any | string,
        options?: any,
    ): Promise<any>;
    changes(options?: PouchReplicationOptions): any;
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
    ): Promise<any>;
    removeAttachment(
        docId: string,
        attachmentId: string,
        rev: string
    ): Promise<void>;
    bulkGet(options?: any): Promise<any>;
    revsDiff(diff: any): Promise<any>;
    explain(query: any): Promise<any>;

    getIndexes(): Promise<{
        indexes: any[];
    }>;

    createIndex(opts: {
        index: any;
    }): Promise<void>;
}
