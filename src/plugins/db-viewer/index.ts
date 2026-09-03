import type { RxDatabase, RxPlugin } from '../../types/index.d.ts';
import type {
    DbViewerConnection,
    DbViewerHandle,
    DbViewerNavigation,
    DbViewerOptions
} from '../../types/index.d.ts';
import { newRxError } from '../../rx-error.ts';
import { RXDB_VERSION } from '../utils/utils-rxdb-version.ts';
import { DbViewerBridge } from './bridge.ts';

export type * from '../../types/plugins/db-viewer.d.ts';
export * from './protocol.ts';
export { DbViewerBridge, toWireConnection, estimateBytes } from './bridge.ts';

/**
 * The UI of the database viewer is a static page that is published with the
 * RxDB docs, not part of this bundle. Keeping it out of the bundle is the
 * whole point of loading it into an iframe: an app that mounts the viewer
 * ships the bridge below and nothing else.
 */
export const DB_VIEWER_URL = 'https://rxdb.info/html/db-viewer.html';

const DB_VIEWER_BY_DATABASE = new WeakMap<RxDatabase, DbViewerHandle>();

/**
 * Opens the database viewer for a running RxDatabase.
 * Calling it twice for the same database returns the viewer that is already open.
 */
export function mountRxDBDbViewer(
    database: RxDatabase,
    options: DbViewerOptions = {}
): DbViewerHandle {
    if (typeof document === 'undefined') {
        throw newRxError('DBV1', { database: database.name });
    }
    const existing = DB_VIEWER_BY_DATABASE.get(database);
    if (existing) {
        return existing;
    }

    const viewerUrl = options.viewerUrl ?? DB_VIEWER_URL;
    const source = viewerUrl + (viewerUrl.includes('?') ? '&' : '?') + 'version=' + RXDB_VERSION;
    const viewerOrigin = readOrigin(source);

    const overlay = options.target ?? createFullScreenElement();
    const iframe = document.createElement('iframe');
    iframe.src = source;
    iframe.title = 'RxDB database viewer';
    iframe.referrerPolicy = 'origin';
    iframe.style.border = 'none';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.display = 'block';
    iframe.style.colorScheme = 'dark';
    overlay.appendChild(iframe);

    let destroyed = false;
    const destroy = () => {
        if (destroyed) {
            return;
        }
        destroyed = true;
        DB_VIEWER_BY_DATABASE.delete(database);
        bridge.destroy();
        iframe.remove();
        if (!options.target) {
            overlay.remove();
        }
    };

    const bridge = new DbViewerBridge(database, iframe, viewerOrigin, {
        surface: options.surface ?? (options.target ? 'embedded' : 'tab'),
        pageSize: options.pageSize ?? 100,
        storageName: options.storageName ?? readStorageName(database),
        dump: options.dump ?? null,
        connection: options.connection ?? { state: 'local' },
        navigation: firstNavigation(database),
        onOpenDumpFile: options.onOpenDumpFile,
        /**
         * The close button lives inside the iframe, so closing always takes
         * the viewer down here and only then tells the app, which may have
         * put its own chrome around it.
         */
        onClose: () => {
            destroy();
            if (options.onClose) {
                options.onClose();
            }
        }
    });
    bridge.start();

    const handle: DbViewerHandle = {
        element: overlay,
        database,
        iframe,
        navigate: (navigation: DbViewerNavigation) => bridge.navigate(navigation),
        setConnection: (connection: DbViewerConnection) => bridge.setConnection(connection),
        refresh: () => bridge.refresh(),
        destroy
    };
    DB_VIEWER_BY_DATABASE.set(database, handle);
    return handle;
}

function firstNavigation(database: RxDatabase): DbViewerNavigation {
    const first = Object.keys(database.collections).sort()[0];
    return first ? { kind: 'collection', name: first } : { kind: 'tool', tool: 'live' };
}

function readStorageName(database: RxDatabase): string {
    try {
        return database.storage.name;
    } catch (error) {
        return 'unknown';
    }
}

/**
 * `new URL()` is available in every runtime that also has a DOM,
 * but a relative `viewerUrl` still has to be resolved against the page.
 */
function readOrigin(source: string): string {
    return new URL(source, window.location.href).origin;
}

function createFullScreenElement(): HTMLElement {
    const element = document.createElement('div');
    element.setAttribute('data-rxdb-db-viewer', 'true');
    element.style.position = 'fixed';
    element.style.inset = '0';
    element.style.zIndex = '2147483000';
    element.style.background = '#0D0F18';
    document.body.appendChild(element);
    return element;
}

export const RxDBDbViewerPlugin: RxPlugin = {
    name: 'db-viewer',
    rxdb: true,
    prototypes: {
        RxDatabase: (proto: any) => {
            proto.mountDbViewer = function (this: RxDatabase, options: DbViewerOptions = {}): DbViewerHandle {
                return mountRxDBDbViewer(this, options);
            };
        }
    }
};
