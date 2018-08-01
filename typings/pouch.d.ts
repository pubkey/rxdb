/**
 * this file contains typings that are pouchdb-specific
 * most of it is copied from @types/pouchdb
 * because it is outdated and strange
 */

export interface PouchReplicationOptions {
    live?: boolean,
    retry?: boolean,
    filter?: Function,
    doc_ids?: string[],
    query_params?: any,
    view?: any,
    since?: number,
    heartbeat?: number,
    timeout?: number,
    batch_size?: number,
    batches_limit?: number,
    back_off_function?: Function,
    checkpoint?: false | 'source' | 'target'
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

declare type Debug = {
    enable(what: string): void;
    disable(): void;
};

export declare class PouchDB {
    constructor(name: string, options: { adapter: string });
    info(): Promise<any>;

    allDocs(options?: any): Promise<any>;
    bulkDocs(
        docs: Array<any>,
        options?: any
    ): Promise<any>;
    compact(options?: any): Promise<any>;
    destroy(options?: any): Promise<void>;
    get(
        docId: string,
        options?: any
    ): Promise<any>;
    put(
        doc: any,
        options?: any,
    ): Promise<any>;
    remove(
        doc: any | string,
        options?: any,
    ): Promise<any>;
    changes(options?: PouchReplicationOptions): any;
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
        options: { rev?: string },
    ): Promise<any>;
    removeAttachment(
        docId: string,
        attachmentId: string,
        rev: string
    ): Promise<void>;
    bulkGet(options?: any): Promise<any>;
    revsDiff(diff: any): Promise<any>;

    static plugin(p: any): void;
    static debug: Debug;
}
