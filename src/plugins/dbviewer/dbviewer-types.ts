import type {
    Observable
} from 'rxjs';
import type {
    RxDatabase
} from '../../index.d.ts';

/**
 * A database dump as produced by db.exportJSON()
 * of the json-dump plugin.
 */
export type RxDBViewerDumpCollection = {
    name: string;
    schemaHash?: string;
    docs: any[];
};
export type RxDBViewerDump = {
    name: string;
    instanceToken?: string;
    collections: RxDBViewerDumpCollection[];
};

export type RxDBViewerOptions = {
    /**
     * The live database to inspect.
     * Either database or dump must be given.
     */
    database?: RxDatabase;
    /**
     * A static export created with db.exportJSON().
     * Opens the viewer in read-only dump mode.
     */
    dump?: RxDBViewerDump;
    /**
     * Filename shown in the dump banner.
     */
    dumpFilename?: string;
    /**
     * Element the viewer is mounted into.
     * [default=document.body]
     */
    parent?: HTMLElement;
    /**
     * Rows per page in grids and results.
     * [default=100]
     */
    pageSize?: number;
    /**
     * Renders a close icon in the top bar. Clicking it emits
     * on the close$ observable of the handle, the viewer itself
     * stays mounted until remove() is called. Use this when the
     * viewer is embedded in a host panel that decides what
     * closing means.
     * [default=false]
     */
    showCloseButton?: boolean;
    /**
     * Url of the viewer page that is loaded into the iframe.
     * The page is a single self-contained html file, so the
     * viewer UI is not part of the rxdb build.
     * [default='https://rxdb.info/dbviewer/index.html']
     */
    viewerUrl?: string;
};

export type RxDBViewerHandle = {
    element: HTMLElement;
    /**
     * Emits when the close icon of the top bar is clicked.
     * Completes when the viewer is removed.
     */
    close$: Observable<void>;
    remove: () => void;
};

export type ViewerFieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null' | 'missing';

export type ViewerFieldTypeShare = {
    type: ViewerFieldType;
    share: number;
};

export type ViewerFieldAnalysis = {
    name: string;
    /**
     * 0-100, percentage of sampled documents
     * that contain the field.
     */
    presence: number;
    types: ViewerFieldTypeShare[];
    detail: string;
};

export type ViewerSchemaViolation = {
    id: string;
    message: string;
};

export type ViewerSchemaAnalysis = {
    sampled: number;
    fields: ViewerFieldAnalysis[];
    violations: ViewerSchemaViolation[];
};

export type ViewerDiffLine = {
    kind: 'same' | 'added' | 'removed';
    text: string;
};

export type ViewerWillRunLine = {
    text: string;
    changed: boolean;
};

export type ViewerSelectorParseResult = {
    selector?: any;
    error?: {
        message: string;
        position: number;
    };
};

export type ViewerChangeEntry = {
    time: number;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    collectionName: string;
    documentId: string;
    revFrom?: string;
    revTo?: string;
    documentData?: any;
    previousDocumentData?: any;
    /**
     * True when the write was produced by the replication
     * pulling from a remote, not by the app itself.
     */
    fromReplication?: boolean;
};

export type ViewerReplicationFeedEntry = {
    time: number;
    direction: 'pull' | 'push';
    collectionName: string;
    documentId: string;
    rev?: string;
    byteSize: number;
};

/**
 * Info handed from the host to the viewer page
 * in the rxdbv-init message.
 */
export type ViewerInfo = {
    databaseName: string;
    storageName: string;
    rxdbVersion: string;
    readOnly: boolean;
    /**
     * 0 when the host did not set a page size, the page
     * then falls back to its stored setting or 100.
     */
    pageSize: number;
    showCloseButton: boolean;
    dump?: RxDBViewerDump;
    dumpFilename?: string;
};

export type ViewerExplainResult = {
    index: string[] | null;
    bounds: string[];
    selectorSatisfiedByIndex: boolean;
    sortSatisfiedByIndex: boolean;
    unindexedFields: string[];
    hasRegex: boolean;
    examined: number | null;
};

export type ViewerStorageStatsRow = {
    name: string;
    documents: number | null;
    tombstones: number | null;
    attachmentBytes: number;
    attachmentCount: number;
};

export type ViewerStorageStats = {
    rows: ViewerStorageStatsRow[];
    cleanupSupported: boolean;
};

export type ViewerReplicationSnapshot = {
    collectionName: string;
    identifier: string;
    active: boolean;
    stopped: boolean;
    lastError: string | null;
    lastErrorTime: number | null;
};

export type ViewerLiveQuerySnapshot = {
    queryString: string;
    resultCount: number | null;
    execCount: number;
    lastEmitTime: number | null;
};

export type ViewerLiveQueryCollectionStats = {
    count: number;
    execCount: number;
};

export type ViewerStatsSnapshot = {
    replications: ViewerReplicationSnapshot[];
    isLeader: boolean | null;
    reads: number;
    liveQueries: { [collectionName: string]: ViewerLiveQueryCollectionStats; };
};

/**
 * Events recorded on the host side before the viewer page
 * was ready, fetched once so the page starts with
 * the same buffers as the host.
 */
export type ViewerBacklog = {
    changes: ViewerChangeEntry[];
    replicationFeed: ViewerReplicationFeedEntry[];
};

export type ViewerAttachmentInfo = {
    id: string;
    type: string;
    length: number;
};

/**
 * The postMessage protocol between the host window
 * (rxdb plugin) and the viewer page inside the iframe.
 */
export type ViewerBridgeRequestMessage = {
    type: 'rxdbv-request';
    requestId: number;
    method: string;
    params: any[];
};
export type ViewerBridgeResponseMessage = {
    type: 'rxdbv-response';
    requestId: number;
    result?: any;
    error?: {
        message: string;
        code?: string;
        parameters?: any;
    };
};
export type ViewerBridgeEventMessage = {
    type: 'rxdbv-event';
    name: 'change' | 'replication-feed';
    payload: any;
};
export type ViewerReadyMessage = {
    type: 'rxdbv-ready';
};
export type ViewerCloseMessage = {
    type: 'rxdbv-close';
};
export type ViewerInitMessage = {
    type: 'rxdbv-init';
    info: ViewerInfo;
};
