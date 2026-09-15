import { Subject } from 'rxjs';
import { newRxError } from '../../rx-error.ts';
import { RXDB_VERSION } from '../utils/index.ts';
import { createLiveDataSource } from './dbviewer-data.ts';
import { createViewerEventHub } from './dbviewer-events.ts';
import { attachViewerBridge } from './dbviewer-remote.ts';
import type {
    RxDBViewerHandle,
    RxDBViewerOptions,
    ViewerInfo
} from './dbviewer-types.ts';

/**
 * The viewer UI is a single self-contained html file that is
 * published on the rxdb docs page. Mounting embeds it as an
 * iframe and serves the database to it over postMessage, so the
 * whole UI stays out of the rxdb build.
 */
export const DBVIEWER_DEFAULT_URL = 'https://rxdb.info/dbviewer/index.html';

/**
 * Mounts the RxDB database viewer into the given parent element.
 * Works over a live RxDatabase or over a static dump
 * created with db.exportJSON().
 */
export function mountRxDBViewer(options: RxDBViewerOptions = {}): RxDBViewerHandle {
    if (typeof document === 'undefined') {
        throw newRxError('DVW1');
    }
    if (!options.database && !options.dump) {
        throw newRxError('DVW2');
    }

    const parent = options.parent || document.body;
    const viewerUrl = options.viewerUrl || DBVIEWER_DEFAULT_URL;
    const close$ = new Subject<void>();

    const iframe = document.createElement('iframe');
    iframe.src = viewerUrl;
    iframe.title = 'RxDB database viewer';
    iframe.allow = 'clipboard-write';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.style.background = '#0D0F18';
    parent.appendChild(iframe);

    /**
     * postMessage needs a target origin. For http(s) urls it is
     * derived from the viewer url, for local file or blob urls
     * '*' is the only working value.
     */
    let targetOrigin = '*';
    try {
        const parsed = new URL(viewerUrl, window.location.href);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            targetOrigin = parsed.origin;
        }
    } catch (err) {
        targetOrigin = '*';
    }

    const database = options.database;
    const source = database ? createLiveDataSource(database) : null;
    const hub = database ? createViewerEventHub(database) : null;
    const info: ViewerInfo = {
        databaseName: database ? database.name : (options.dump ? options.dump.name : 'dump'),
        storageName: database ? database.storage.name : 'dump',
        rxdbVersion: RXDB_VERSION,
        readOnly: !database,
        pageSize: options.pageSize || 0,
        showCloseButton: !!options.showCloseButton,
        dump: database ? undefined : options.dump,
        dumpFilename: options.dumpFilename
    };

    let bridge: { destroy: () => void; } | null = null;
    let destroyed = false;

    const onMessage = (event: MessageEvent) => {
        if (destroyed || event.source !== iframe.contentWindow) {
            return;
        }
        const data = event.data;
        if (!data || typeof data.type !== 'string') {
            return;
        }
        if (data.type === 'rxdbv-ready' && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                type: 'rxdbv-init',
                info
            }, targetOrigin);
            if (database && source && hub && !bridge) {
                bridge = attachViewerBridge({
                    database,
                    source,
                    hub,
                    info,
                    targetWindow: iframe.contentWindow,
                    targetOrigin
                });
            }
        } else if (data.type === 'rxdbv-close') {
            close$.next();
        }
    };
    window.addEventListener('message', onMessage);

    return {
        element: iframe,
        close$: close$.asObservable(),
        remove() {
            destroyed = true;
            close$.complete();
            window.removeEventListener('message', onMessage);
            if (bridge) {
                bridge.destroy();
                bridge = null;
            }
            if (hub) {
                hub.destroy();
            }
            if (iframe.parentElement) {
                iframe.parentElement.removeChild(iframe);
            }
        }
    };
}
