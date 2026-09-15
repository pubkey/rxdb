import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type {
    RxDBViewerDump,
    ViewerInfo
} from '../../src/plugins/dbviewer/dbviewer-types.ts';
import { ViewerApp } from './App.tsx';
import { readStoredSettings } from './context.ts';
import {
    DBVIEWER_LOGO_SVG,
    ensureViewerStyles
} from './dom.ts';
import { createPageHub } from './hub.ts';
import {
    createDumpSource,
    createRemoteSource
} from './source.ts';
import type { ViewerSource } from './source.ts';

const INIT_TIMEOUT_MS = 4000;

function resolvePageSize(hostPageSize: number): number {
    if (hostPageSize > 0) {
        return hostPageSize;
    }
    const stored = readStoredSettings();
    return stored.pageSize || 100;
}

function Connecting() {
    return (
        <div className="rxdbv-root" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div className="rxdbv-dim" style={{ fontSize: 12 }}>connecting to the host application…</div>
        </div>
    );
}

/**
 * Shown when the page is opened directly on rxdb.info instead
 * of embedded by mountRxDBViewer(). A dump file can still be
 * opened and browsed read-only.
 */
function StandaloneLanding(props: { onDump: (dump: RxDBViewerDump, filename: string) => void; }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    return (
        <div className="rxdbv-root" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ maxWidth: 560, padding: '32px 28px', border: '1px solid rgba(255,255,255,0.12)', background: 'var(--rxdbv-bg-panel)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="rxdbv-logo" dangerouslySetInnerHTML={{ __html: DBVIEWER_LOGO_SVG }} />
                    <span className="rxdbv-wordmark" style={{ fontSize: 16 }}>RxDB</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Database Viewer</span>
                </div>
                <div className="rxdbv-muted" style={{ fontSize: 12, lineHeight: 1.6, marginTop: 14 }}>
                    This page is the UI of the RxDB database viewer. It is normally embedded
                    by your app with the dbviewer plugin, which connects it to a live database:
                </div>
                <div className="rxdbv-mono" style={{ fontSize: 11, lineHeight: 1.7, marginTop: 10, padding: '10px 12px', background: 'var(--rxdbv-bg)', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'pre' }}>
                    {'import { mountRxDBViewer } from \'rxdb/plugins/dbviewer\';\n\nconst viewer = mountRxDBViewer({\n    database: myDatabase,\n    parent: document.getElementById(\'viewer\')\n});'}
                </div>
                <div className="rxdbv-muted" style={{ fontSize: 12, lineHeight: 1.6, marginTop: 14 }}>
                    Without a host application you can open a static dump created
                    with <code>await db.exportJSON()</code> and browse it read-only.
                </div>
                <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button className="rxdbv-btn-primary" onClick={() => fileRef.current && fileRef.current.click()}>
                        Open dump file…
                    </button>
                    <a
                        style={{ fontSize: 11 }}
                        onClick={() => window.open('https://rxdb.info/dbviewer.html', '_blank')}
                    >Viewer documentation</a>
                </div>
                {error ? (
                    <div style={{ marginTop: 10, fontSize: 11, color: 'var(--rxdbv-danger)' }}>{error}</div>
                ) : null}
                <input
                    ref={fileRef}
                    type="file"
                    accept="application/json,.json"
                    style={{ display: 'none' }}
                    onChange={event => {
                        const file = event.target.files && event.target.files[0];
                        if (!file) {
                            return;
                        }
                        file.text().then(text => {
                            try {
                                props.onDump(JSON.parse(text), file.name);
                            } catch (err) {
                                setError(file.name + ' is not a valid JSON dump');
                            }
                        });
                    }}
                />
            </div>
        </div>
    );
}

function boot() {
    ensureViewerStyles(document);
    const rootElement = document.getElementById('rxdbv-page-root');
    if (!rootElement) {
        return;
    }
    const reactRoot = createRoot(rootElement);

    const renderStandalone = () => {
        reactRoot.render(
            <StandaloneLanding
                onDump={(dump, filename) => {
                    const source = createDumpSource(dump, filename);
                    reactRoot.render(
                        <ViewerApp
                            source={source}
                            liveSource={null}
                            hub={null}
                            pageSize={resolvePageSize(0)}
                            showCloseButton={false}
                            onClose={() => undefined}
                        />
                    );
                }}
            />
        );
    };

    const embedded = window.parent && window.parent !== window;
    if (!embedded) {
        renderStandalone();
        return;
    }

    const hostWindow = window.parent;
    let initialized = false;

    const renderLive = (source: ViewerSource, hub: ReturnType<typeof createPageHub> | null, info: ViewerInfo, hostOrigin: string) => {
        reactRoot.render(
            <ViewerApp
                source={source}
                liveSource={source.kind === 'live' ? source : null}
                hub={hub}
                pageSize={resolvePageSize(info.pageSize)}
                showCloseButton={info.showCloseButton}
                onClose={() => hostWindow.postMessage({ type: 'rxdbv-close' }, hostOrigin)}
            />
        );
    };

    const onMessage = (event: MessageEvent) => {
        if (event.source !== hostWindow) {
            return;
        }
        const data = event.data;
        if (!data || data.type !== 'rxdbv-init' || initialized) {
            return;
        }
        initialized = true;
        const info = data.info as ViewerInfo;
        const hostOrigin = event.origin && event.origin !== 'null' ? event.origin : '*';
        if (info.dump) {
            const source = createDumpSource(info.dump, info.dumpFilename, info.rxdbVersion);
            renderLive(source, null, info, hostOrigin);
            return;
        }
        createRemoteSource(info, hostWindow, hostOrigin).then(source => {
            const hub = createPageHub(source);
            renderLive(source, hub, info, hostOrigin);
        }).catch(() => {
            renderStandalone();
        });
    };
    window.addEventListener('message', onMessage);

    reactRoot.render(<Connecting />);
    hostWindow.postMessage({ type: 'rxdbv-ready' }, '*');
    setTimeout(() => {
        if (!initialized) {
            renderStandalone();
        }
    }, INIT_TIMEOUT_MS);
}

boot();
