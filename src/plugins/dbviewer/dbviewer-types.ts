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
};

export type RxDBViewerHandle = {
    element: HTMLElement;
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
};

export type ViewerReplicationFeedEntry = {
    time: number;
    direction: 'pull' | 'push';
    collectionName: string;
    documentId: string;
    rev?: string;
    byteSize: number;
};
