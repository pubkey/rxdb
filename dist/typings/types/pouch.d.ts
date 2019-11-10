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
export declare type PouchSyncHandlerEvents = 'change' | 'paused' | 'active' | 'error' | 'complete';
export declare type PouchSyncHandler = {
    on(ev: PouchSyncHandlerEvents, fn: (el: any) => void): void;
    off(ev: PouchSyncHandlerEvents, fn: any): void;
    cancel(): void;
};
declare type Debug = {
    enable(what: string): void;
    disable(): void;
};
export declare type PouchdbQuery = {
    selector: any;
    sort?: any[];
    limit?: number;
    skip?: number;
};
export declare class PouchDBInstance {
    constructor(name: string, options: {
        adapter: string;
    });
    static debug: Debug;
    static plugin(p: any): void;
    static isInstanceOf(instance: any): boolean;
    static countAllUndeleted(pouchdb: PouchDBInstance): Promise<number>;
    info(): Promise<any>;
    allDocs(options?: any): Promise<any>;
    bulkDocs(docs: {
        docs: any[];
    } | any[], options?: any): Promise<{
        ok: boolean;
        id: string;
        rev: string;
    }[]>;
    find(mangoQuery: any): Promise<{
        docs: any[];
    }>;
    compact(options?: any): Promise<any>;
    destroy(options?: any): Promise<void>;
    get(docId: string, options?: any): Promise<null | ({
        _id: string;
    } & any)>;
    put(doc: any, options?: any): Promise<any>;
    remove(doc: any | string, options?: any): Promise<any>;
    changes(options?: PouchReplicationOptions): any;
    sync(remoteDb: string | any, options?: PouchReplicationOptions): PouchSyncHandler;
    replicate(options?: PouchReplicationOptions): PouchSyncHandler;
    close(): Promise<void>;
    putAttachment(docId: string, attachmentId: string, rev: string, attachment: any, type: string): Promise<any>;
    getAttachment(docId: string, attachmentId: string, options: {
        rev?: string;
    }): Promise<any>;
    removeAttachment(docId: string, attachmentId: string, rev: string): Promise<void>;
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
export {};
