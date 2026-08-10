import type { RxDatabase } from '../rx-database.d.ts';

export type DevtoolTool = 'live' | 'schema' | 'changes' | 'querylab' | 'storage';

export type DevtoolNavigation =
    | { kind: 'collection'; name: string; }
    | { kind: 'replication'; name: string; }
    | { kind: 'tool'; tool: DevtoolTool; }
    | { kind: 'settings'; };

/**
 * The devtool renders the same UI on all of its surfaces.
 * The surface only changes the chrome of the top bar and,
 * for `dump`, which actions are available.
 */
export type DevtoolSurface = 'tab' | 'embedded' | 'tanstack' | 'dump';

export type DevtoolConnectionStage = {
    label: string;
    detail?: string;
};

export type DevtoolConnection =
    | { state: 'local'; }
    | {
        state: 'connecting';
        stages: DevtoolConnectionStage[];
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
        stages: DevtoolConnectionStage[];
        failedStage: number;
        diagnosis: string;
    };

export type DevtoolDumpInfo = {
    fileName: string;
    exportedAt: number;
};

export type DevtoolQueryEntry = {
    selector: string;
    name?: string;
    favourite: boolean;
    usedAt: number;
};

export type DevtoolSort = {
    field: string;
    direction: 'asc' | 'desc';
};

export type DevtoolCollectionView = {
    queryInput: string;
    selector: any;
    queryError: { message: string; position: number; } | null;
    view: 'table' | 'json';
    page: number;
    sort: DevtoolSort;
    selection: Set<string>;
    observe: boolean;
    openDocumentId: string | null;
    stagedEdits: { [fieldPath: string]: any; };
    expandedFields: Set<string>;
    editingCell: { documentId: string; field: string; } | null;
    historyOpen: boolean;
};

export type DevtoolChangeRecord = {
    time: number;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    collectionName: string;
    documentId: string;
    previousRevision?: string;
    revision: string;
    documentData: any;
    previousDocumentData: any;
    source: 'local' | 'devtool';
};

export type DevtoolReplicationRecord = {
    time: number;
    direction: 'pull' | 'push';
    collectionName: string;
    documentId: string;
    revision: string;
    bytes: number;
};

export type DevtoolLiveEvent =
    | { kind: 'insert' | 'update' | 'delete'; collectionName: string; fromDevtool: boolean; }
    | { kind: 'query' | 'emit'; collectionName: string; }
    | { kind: 'pull' | 'push'; collectionName: string; };

export type DevtoolOptions = {
    /**
     * Where the devtool is mounted. Defaults to `tab`.
     */
    surface?: DevtoolSurface;
    /**
     * Element the devtool is rendered into.
     * Defaults to a full screen element appended to `document.body`.
     */
    target?: HTMLElement;
    /**
     * Shown in the top bar next to the database name.
     */
    storageName?: string;
    connection?: DevtoolConnection;
    /**
     * Set when the devtool reads a static export instead of a live database.
     * Writing actions are disabled in that mode.
     */
    dump?: DevtoolDumpInfo;
    /**
     * Rows per page in every grid and result list.
     */
    pageSize?: number;
    onOpenDumpFile?: () => void;
};

export type DevtoolHandle = {
    /**
     * The element the devtool renders into.
     */
    readonly element: HTMLElement;
    readonly database: RxDatabase;
    navigate(navigation: DevtoolNavigation): void;
    setConnection(connection: DevtoolConnection): void;
    refresh(): void;
    destroy(): void;
};
