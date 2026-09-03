import type {
    DbViewerChangeRecord,
    DbViewerConnectionStage,
    DbViewerDumpInfo,
    DbViewerLiveEvent,
    DbViewerNavigation,
    DbViewerReplicationRecord,
    DbViewerSurface
} from '../../types/index.d.ts';

/**
 * The UI of the database viewer is not shipped inside RxDB. It is a static
 * page that is loaded into an iframe, and everything below describes the
 * only thing that crosses that boundary.
 *
 * Bumping this number makes an older page refuse to talk to a newer host
 * instead of silently misreading its messages. The page is requested with
 * `?version=<RXDB_VERSION>`, so a mismatch can also be resolved server side.
 */
export const DB_VIEWER_PROTOCOL_VERSION = 1;

/**
 * Set on every message so that the viewer and the host can ignore the other
 * `postMessage` traffic of the app they are embedded in.
 */
export const DB_VIEWER_CHANNEL = 'rxdb-db-viewer';

/**
 * Everything that crosses the iframe boundary goes through the structured
 * clone algorithm, so no value in this file may contain a function.
 * The callbacks of the public API are reached with the `disconnect` and
 * `openDumpFile` methods instead.
 */
export type DbViewerConnectionWire =
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
        canDisconnect: boolean;
    }
    | {
        state: 'failed';
        stages: DbViewerConnectionStage[];
        failedStage: number;
        diagnosis: string;
    };

export type DbViewerReplicationInfo = {
    identifier: string;
    hasPull: boolean;
    hasPush: boolean;
    active: boolean;
    canceled: boolean;
    checkpoint: string;
    error: { message: string; time: number; attempts: number; } | null;
};

export type DbViewerCollectionInfo = {
    name: string;
    primaryPath: string;
    /**
     * The filled JsonSchema. RxDB sorts its properties alphabetically,
     * so the declaration order of the developer is already gone here.
     */
    jsonSchema: any;
    indexes: string[][];
    documentCount: number;
    replications: DbViewerReplicationInfo[];
};

/**
 * Everything the viewer needs to draw its first frame.
 */
export type DbViewerSnapshot = {
    protocolVersion: number;
    databaseName: string;
    storageName: string;
    rxdbVersion: string;
    surface: DbViewerSurface;
    pageSize: number;
    readOnly: boolean;
    /**
     * `null` when a live database is inspected.
     */
    dump: DbViewerDumpInfo | null;
    connection: DbViewerConnectionWire;
    navigation: DbViewerNavigation;
    collections: DbViewerCollectionInfo[];
    canOpenDumpFile: boolean;
    hasCleanupPlugin: boolean;
    /**
     * `null` when the leader-election plugin is not added,
     * because `isLeader()` throws in that case.
     */
    isLeader: boolean | null;
};

export type DbViewerDocumentsQuery = {
    collectionName: string;
    selector: any;
    sort: { field: string; direction: 'asc' | 'desc'; };
    skip: number;
    limit: number;
};

export type DbViewerDocumentsResult = {
    documents: any[];
    /**
     * How many documents match the selector in total,
     * which is more than `documents.length` on every page but the last.
     */
    total: number;
};

export type DbViewerExplainFinding = {
    level: 'info' | 'warning';
    title: string;
    detail: string;
};

export type DbViewerExplainResult = {
    index: string[] | null;
    startKeys: string[];
    endKeys: string[];
    inclusiveStart: boolean;
    inclusiveEnd: boolean;
    sortSatisfiedByIndex: boolean;
    selectorSatisfiedByIndex: boolean;
    examined: number;
    returned: number;
    findings: DbViewerExplainFinding[];
    /**
     * A compound index that would cover the selector, when the schema does
     * not declare one yet. `null` when nothing useful can be suggested.
     */
    suggestedIndex: string[] | null;
    /**
     * Set when the schema already declares `suggestedIndex` but the query
     * could not use it, which explains why more than nothing is examined.
     */
    declaredButUnused: boolean;
};

export type DbViewerSchemaFieldReport = {
    path: string;
    declaredType: string;
    seenTypes: string[];
    presentCount: number;
    required: boolean;
    indexed: boolean;
};

export type DbViewerSchemaReport = {
    sampledCount: number;
    fields: DbViewerSchemaFieldReport[];
    violations: { documentId: string; path: string; detail: string; }[];
};

export type DbViewerStorageReport = {
    documentCount: number;
    tombstoneCount: number | null;
    attachmentBytes: number;
    estimatedBytes: number;
};

export type DbViewerLiveQueryInfo = {
    stringRepresentation: string;
    subscribers: number;
    resultCount: number;
    emitCount: number;
    lastEmitAt: number;
};

/**
 * Every call the viewer can make on the database that runs in the host page.
 * Written as one map so that the client and the bridge cannot drift apart.
 */
export type DbViewerMethods = {
    snapshot: { params: Record<string, never>; result: DbViewerSnapshot; };
    documents: { params: DbViewerDocumentsQuery; result: DbViewerDocumentsResult; };
    counts: { params: Record<string, never>; result: { [collectionName: string]: number; }; };
    /**
     * Writes the whole document, which is exactly what the WILL RUN block
     * of the drawer previews before the user presses Apply.
     */
    upsert: { params: { collectionName: string; document: any; }; result: { documentId: string; }; };
    /**
     * Writes single fields with `incrementalPatch`, so that editing one cell
     * in the grid cannot clobber a field another writer changed meanwhile.
     */
    patch: {
        params: { collectionName: string; documentId: string; patch: any; };
        result: { documentId: string; };
    };
    remove: { params: { collectionName: string; documentIds: string[]; }; result: { removed: number; }; };
    countMatching: { params: { collectionName: string; selector: any; }; result: { total: number; }; };
    explain: {
        params: { collectionName: string; selector: any; sort: { field: string; direction: 'asc' | 'desc'; }; };
        result: DbViewerExplainResult;
    };
    schemaReport: { params: { collectionName: string; sampleSize: number; }; result: DbViewerSchemaReport; };
    storageReport: { params: { collectionName: string; }; result: DbViewerStorageReport; };
    cleanup: { params: { collectionName: string; }; result: { ran: boolean; }; };
    liveQueries: { params: { collectionName: string; }; result: DbViewerLiveQueryInfo[]; };
    exportJson: { params: Record<string, never>; result: { json: any; }; };
    disconnect: { params: Record<string, never>; result: { ok: boolean; }; };
    openDumpFile: { params: Record<string, never>; result: { ok: boolean; }; };
    /**
     * The close button lives in the iframe, but only the host can take the
     * viewer off the page again.
     */
    close: { params: Record<string, never>; result: { ok: boolean; }; };
};

export type DbViewerMethodName = keyof DbViewerMethods;

/**
 * Streams the host pushes without being asked. `live` carries only names and
 * kinds, never document content, so the Live map stays safe to share.
 */
export type DbViewerPushes = {
    change: DbViewerChangeRecord;
    replication: DbViewerReplicationRecord;
    live: DbViewerLiveEvent;
    counts: { [collectionName: string]: number; };
    connection: DbViewerConnectionWire;
    navigate: DbViewerNavigation;
    refresh: null;
};

export type DbViewerPushChannel = keyof DbViewerPushes;

export type DbViewerRequestMessage<K extends DbViewerMethodName = DbViewerMethodName> = {
    channel: typeof DB_VIEWER_CHANNEL;
    version: number;
    kind: 'request';
    id: number;
    method: K;
    params: DbViewerMethods[K]['params'];
};

export type DbViewerResponseMessage<K extends DbViewerMethodName = DbViewerMethodName> = {
    channel: typeof DB_VIEWER_CHANNEL;
    version: number;
    kind: 'response';
    id: number;
} & (
        | { ok: true; result: DbViewerMethods[K]['result']; }
        | { ok: false; error: string; }
    );

export type DbViewerPushMessage<C extends DbViewerPushChannel = DbViewerPushChannel> = {
    channel: typeof DB_VIEWER_CHANNEL;
    version: number;
    kind: 'push';
    stream: C;
    payload: DbViewerPushes[C];
};

/**
 * Sent by the viewer once, as soon as its script runs, because the host
 * cannot know when a cross origin iframe finished loading.
 *
 * It carries no data, because it is the one message that has to be posted
 * with `*` as the target origin: the viewer does not know the origin of the
 * app that embedded it until the host answers.
 */
export type DbViewerHelloMessage = {
    channel: typeof DB_VIEWER_CHANNEL;
    version: number;
    kind: 'hello';
};

/**
 * The answer to `hello`. Receiving it is how the viewer learns the origin of
 * the host, which it pins for every message it sends afterwards.
 */
export type DbViewerWelcomeMessage = {
    channel: typeof DB_VIEWER_CHANNEL;
    version: number;
    kind: 'welcome';
};

export type DbViewerHostMessage =
    | DbViewerResponseMessage
    | DbViewerPushMessage
    | DbViewerWelcomeMessage;
export type DbViewerViewerMessage = DbViewerRequestMessage | DbViewerHelloMessage;

/**
 * Guards every message before it is read. The viewer runs on rxdb.info while
 * the host runs on the origin of the app, so both sides must assume that
 * anything can post to them.
 */
export function isDbViewerMessage(data: any): data is { channel: typeof DB_VIEWER_CHANNEL; version: number; kind: string; } {
    return (
        typeof data === 'object' &&
        data !== null &&
        data.channel === DB_VIEWER_CHANNEL &&
        data.version === DB_VIEWER_PROTOCOL_VERSION &&
        typeof data.kind === 'string'
    );
}
