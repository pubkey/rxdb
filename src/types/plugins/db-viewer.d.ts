import type { RxDatabase } from '../rx-database.d.ts';

export type DbViewerTool = 'live' | 'schema' | 'changes' | 'querylab' | 'storage';

export type DbViewerNavigation =
    | { kind: 'collection'; name: string; }
    | { kind: 'replication'; name: string; }
    | { kind: 'tool'; tool: DbViewerTool; }
    | { kind: 'settings'; };

/**
 * The database viewer renders the same UI on all of its surfaces.
 * The surface only changes the chrome of the top bar and,
 * for `dump`, which actions are available.
 */
export type DbViewerSurface = 'tab' | 'embedded' | 'tanstack' | 'dump';

export type DbViewerConnectionStage = {
    label: string;
    detail?: string;
};

export type DbViewerConnection =
    | { state: 'local'; }
    | {
        state: 'connecting';
        stages: DbViewerConnectionStage[];
        currentStage: number;
        pairingCode?: string;
        elapsedSeconds?: number;
    }
    | {
        state: 'connected';
        device: string;
        transport: string;
        writeable: boolean;
        roundTripMs?: number;
        onDisconnect?: () => void;
    }
    | {
        state: 'failed';
        stages: DbViewerConnectionStage[];
        failedStage: number;
        diagnosis: string;
    };

export type DbViewerDumpInfo = {
    fileName: string;
    exportedAt: number;
};

export type DbViewerQueryEntry = {
    selector: string;
    name?: string;
    favourite: boolean;
    usedAt: number;
};

export type DbViewerSort = {
    field: string;
    direction: 'asc' | 'desc';
};

export type DbViewerCollectionView = {
    queryInput: string;
    selector: any;
    queryError: { message: string; position: number; } | null;
    view: 'table' | 'json';
    page: number;
    sort: DbViewerSort;
    selection: Set<string>;
    observe: boolean;
    openDocumentId: string | null;
    stagedEdits: { [fieldPath: string]: any; };
    expandedFields: Set<string>;
    editingCell: { documentId: string; field: string; } | null;
    historyOpen: boolean;
};

export type DbViewerChangeRecord = {
    time: number;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    collectionName: string;
    documentId: string;
    previousRevision?: string;
    revision: string;
    documentData: any;
    previousDocumentData: any;
    source: 'local' | 'db-viewer';
};

export type DbViewerReplicationRecord = {
    time: number;
    direction: 'pull' | 'push';
    collectionName: string;
    documentId: string;
    revision: string;
    bytes: number;
};

export type DbViewerLiveEvent =
    | { kind: 'insert' | 'update' | 'delete'; collectionName: string; fromDbViewer: boolean; }
    | { kind: 'query' | 'emit'; collectionName: string; }
    | { kind: 'pull' | 'push'; collectionName: string; };

export type DbViewerOptions = {
    /**
     * Where the database viewer is mounted. Defaults to `tab`.
     */
    surface?: DbViewerSurface;
    /**
     * Element the database viewer is rendered into.
     * Defaults to a full screen element appended to `document.body`.
     */
    target?: HTMLElement;
    /**
     * Shown in the top bar next to the database name.
     */
    storageName?: string;
    connection?: DbViewerConnection;
    /**
     * Set when the database viewer reads a static export instead of a live database.
     * Writing actions are disabled in that mode.
     */
    dump?: DbViewerDumpInfo;
    /**
     * Rows per page in every grid and result list.
     */
    pageSize?: number;
    onOpenDumpFile?: () => void;
};

export type DbViewerHandle = {
    /**
     * The element the database viewer renders into.
     */
    readonly element: HTMLElement;
    readonly database: RxDatabase;
    navigate(navigation: DbViewerNavigation): void;
    setConnection(connection: DbViewerConnection): void;
    refresh(): void;
    destroy(): void;
};
