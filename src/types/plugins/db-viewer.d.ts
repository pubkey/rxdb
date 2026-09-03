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

export type DbViewerSort = {
    field: string;
    direction: 'asc' | 'desc';
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
    /**
     * Called after the user closed the viewer from its own close button.
     * The viewer is already destroyed by then, this is where you take down
     * whatever chrome you put around it.
     */
    onClose?: () => void;
    /**
     * Where the UI of the database viewer is loaded from.
     * Defaults to the page that is published with the RxDB docs.
     *
     * Point this at your own copy of `db-viewer.html` when your app must work
     * offline, or when a `frame-src` content security policy does not allow
     * `https://rxdb.info`. The file ships inside the `rxdb` package.
     */
    viewerUrl?: string;
};

export type DbViewerHandle = {
    /**
     * The element the database viewer renders into.
     */
    readonly element: HTMLElement;
    /**
     * The iframe the UI runs in. It is a cross origin document,
     * so its content cannot be reached from the app.
     */
    readonly iframe: HTMLIFrameElement;
    readonly database: RxDatabase;
    navigate(navigation: DbViewerNavigation): void;
    setConnection(connection: DbViewerConnection): void;
    refresh(): void;
    destroy(): void;
};
