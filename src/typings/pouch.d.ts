/**
 * this file contains typings that are pouchdb-specific
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
    auto_compaction?: boolean,
    revs_limit?: number,
    ajax?: any,
    auth?: any,
    skip_setup?: boolean,
    storage?: any,
    size?: number
}

export declare class PouchDB {
    constructor(name: string, options: { adapter: string });
    info(): any;
}
