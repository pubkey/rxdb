import React, { useEffect, useRef, useState } from 'react';
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
    createRemoteSource,
    createWindowPageTransport
} from './source.ts';
import type {
    ViewerPageTransport,
    ViewerSource
} from './source.ts';
import {
    connectViewerWebRTC,
    DEFAULT_SIGNALING_SERVER_URL
} from './webrtc.ts';
import type { ViewerWebRTCStatus } from './webrtc.ts';

const INIT_TIMEOUT_MS = 4000;
const WEBRTC_FORM_STORAGE_KEY = 'rxdb-dbviewer-webrtc';

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

const STATUS_TEXT: { [status in ViewerWebRTCStatus]: string } = {
    'signaling-connecting': 'connecting to the signaling server…',
    'signaling-connected': 'connected to the signaling server…',
    'waiting-for-device': 'waiting for the device to show up in the room…',
    'peer-connecting': 'device found, connecting over WebRTC…',
    'connected': 'connected'
};

function readStoredWebRTCForm(): { signalingServerUrl?: string; roomId?: string; } {
    try {
        const raw = localStorage.getItem(WEBRTC_FORM_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (err) {
        return {};
    }
}

function storeWebRTCForm(form: { signalingServerUrl: string; roomId: string; }) {
    try {
        localStorage.setItem(WEBRTC_FORM_STORAGE_KEY, JSON.stringify(form));
    } catch (err) {
        // localStorage can be unavailable, the form is then not remembered
    }
}

/**
 * connectRxDBViewer() encodes the pairing data into the url
 * hash, for example #room=abc123&signaling=wss%3A%2F%2F...
 */
function readHashConnectParams(): { roomId?: string; signalingServerUrl?: string; } {
    try {
        const hash = window.location.hash.replace(/^#/, '');
        if (!hash) {
            return {};
        }
        const params = new URLSearchParams(hash);
        const roomId = params.get('room') || undefined;
        const signalingServerUrl = params.get('signaling') || undefined;
        return { roomId, signalingServerUrl };
    } catch (err) {
        return {};
    }
}

const fieldLabelStyle: React.CSSProperties = {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: 'var(--rxdbv-fg-dim)',
    display: 'block',
    marginBottom: 4
};
const fieldInputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: 'var(--rxdbv-bg)',
    color: 'var(--rxdbv-fg)',
    border: '2px solid var(--rxdbv-control-border)',
    padding: '6px 10px',
    fontFamily: 'var(--rxdbv-mono)',
    fontSize: 11,
    outline: 'none'
};

/**
 * Shown when the page is opened directly on rxdb.info instead
 * of embedded by mountRxDBViewer(). From here a database on
 * another device can be opened over WebRTC, or a static dump
 * file can be browsed read-only.
 */
function StandaloneLanding(props: {
    initialError?: string;
    initialRoomId?: string;
    initialSignalingServerUrl?: string;
    /**
     * True when the pairing data came from the url hash,
     * the connection then starts without a click.
     */
    autoConnect?: boolean;
    onDump: (dump: RxDBViewerDump, filename: string) => void;
    onWebRTC: (
        signalingServerUrl: string,
        roomId: string,
        setStatus: (status: string) => void,
        setError: (error: string) => void
    ) => void;
}) {
    const stored = readStoredWebRTCForm();
    const fileRef = useRef<HTMLInputElement>(null);
    const autoTriggered = useRef(false);
    const [error, setError] = useState<string | null>(props.initialError || null);
    const [status, setStatus] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [signalingServerUrl, setSignalingServerUrl] = useState(
        props.initialSignalingServerUrl || stored.signalingServerUrl || DEFAULT_SIGNALING_SERVER_URL
    );
    const [roomId, setRoomId] = useState(props.initialRoomId || stored.roomId || '');

    const connect = () => {
        const trimmedRoom = roomId.trim();
        if (trimmedRoom.length < 6) {
            setError('the room id must have at least 6 characters');
            return;
        }
        setError(null);
        setConnecting(true);
        storeWebRTCForm({ signalingServerUrl: signalingServerUrl.trim(), roomId: trimmedRoom });
        props.onWebRTC(
            signalingServerUrl.trim(),
            trimmedRoom,
            statusText => setStatus(statusText),
            errorText => {
                setConnecting(false);
                setStatus(null);
                setError(errorText);
            }
        );
    };

    useEffect(() => {
        if (props.autoConnect && props.initialRoomId && !autoTriggered.current) {
            autoTriggered.current = true;
            connect();
        }
    }, []);

    return (
        <div className="rxdbv-root" style={{ alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
            <div style={{ maxWidth: 560, width: '100%', padding: '32px 28px', border: '1px solid rgba(255,255,255,0.12)', background: 'var(--rxdbv-bg-panel)', margin: '20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="rxdbv-logo" dangerouslySetInnerHTML={{ __html: DBVIEWER_LOGO_SVG }} />
                    <span className="rxdbv-wordmark" style={{ fontSize: 16 }}>RxDB</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Database Viewer</span>
                </div>

                <div className="rxdbv-rail-header" style={{ padding: '18px 0 6px' }}>CONNECT TO A DEVICE</div>
                <div className="rxdbv-muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
                    Inspect a database that runs on another device over WebRTC.
                    In the app, expose the database with the dbviewer plugin:
                </div>
                <div className="rxdbv-mono" style={{ fontSize: 11, lineHeight: 1.7, marginTop: 8, padding: '10px 12px', background: 'var(--rxdbv-bg)', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'pre', overflow: 'auto' }}>
                    {'import { connectRxDBViewer } from \'rxdb/plugins/dbviewer\';\n\nconst viewer = await connectRxDBViewer({\n    database: myDatabase\n});\nconsole.log(viewer.url); // open this url'}
                </div>
                <div style={{ marginTop: 12 }}>
                    <label style={fieldLabelStyle}>Signaling server</label>
                    <input
                        style={fieldInputStyle}
                        value={signalingServerUrl}
                        disabled={connecting}
                        onChange={event => setSignalingServerUrl(event.target.value)}
                    />
                </div>
                <div style={{ marginTop: 10 }}>
                    <label style={fieldLabelStyle}>Room id</label>
                    <input
                        style={fieldInputStyle}
                        value={roomId}
                        placeholder="the roomId of connectRxDBViewer()"
                        disabled={connecting}
                        onChange={event => setRoomId(event.target.value)}
                        onKeyDown={event => {
                            if (event.key === 'Enter' && !connecting) {
                                connect();
                            }
                        }}
                    />
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button className="rxdbv-btn-primary" disabled={connecting} onClick={connect}>
                        {connecting ? 'Connecting…' : 'Connect'}
                    </button>
                    {connecting && status ? (
                        <span className="rxdbv-dim" style={{ fontSize: 11 }}>{status}</span>
                    ) : null}
                </div>
                <div className="rxdbv-dim" style={{ fontSize: 10.5, lineHeight: 1.6, marginTop: 8 }}>
                    Everyone who knows the room id gets full read and write access
                    to the database, so use a long random id and your own signaling
                    server in production.
                </div>

                <div className="rxdbv-rail-header" style={{ padding: '20px 0 6px' }}>OPEN A DUMP FILE</div>
                <div className="rxdbv-muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
                    Open a static dump created with <code>await db.exportJSON()</code> and
                    browse it read-only.
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button className="rxdbv-btn" disabled={connecting} onClick={() => fileRef.current && fileRef.current.click()}>
                        Open dump file…
                    </button>
                    <a
                        style={{ fontSize: 11 }}
                        onClick={() => window.open('https://rxdb.info/dbviewer.html', '_blank')}
                    >Viewer documentation</a>
                </div>
                {error ? (
                    <div style={{ marginTop: 12, fontSize: 11, color: 'var(--rxdbv-danger)' }}>✕ {error}</div>
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

    const renderLive = (
        source: ViewerSource,
        hub: ReturnType<typeof createPageHub> | null,
        info: ViewerInfo,
        onClose: () => void
    ) => {
        reactRoot.render(
            <ViewerApp
                source={source}
                liveSource={source.kind === 'live' ? source : null}
                hub={hub}
                pageSize={resolvePageSize(info.pageSize)}
                showCloseButton={info.showCloseButton}
                onClose={onClose}
            />
        );
    };

    const renderStandalone = (initialError?: string) => {
        const hashParams = readHashConnectParams();
        reactRoot.render(
            <StandaloneLanding
                initialError={initialError}
                initialRoomId={hashParams.roomId}
                initialSignalingServerUrl={hashParams.signalingServerUrl}
                autoConnect={!initialError && !!hashParams.roomId}
                onDump={(dump, filename) => {
                    const source = createDumpSource(dump, filename);
                    renderLive(source, null, {
                        databaseName: source.databaseName,
                        storageName: source.storageName,
                        rxdbVersion: source.rxdbVersion,
                        readOnly: true,
                        pageSize: 0,
                        showCloseButton: false
                    }, () => undefined);
                }}
                onWebRTC={(signalingServerUrl, roomId, setStatus, setError) => {
                    connectWebRTC(signalingServerUrl, roomId, setStatus, setError);
                }}
            />
        );
    };

    const connectWebRTC = (
        signalingServerUrl: string,
        roomId: string,
        setStatus: (status: string) => void,
        setError: (error: string) => void
    ) => {
        connectViewerWebRTC({
            signalingServerUrl,
            roomId,
            onStatus: status => setStatus(STATUS_TEXT[status] || status),
            onDisconnect: () => {
                renderStandalone('the connection to the device was lost');
            }
        }).then(transport => {
            setStatus('loading database info…');
            return initOverTransport(transport);
        }).then(result => {
            if (!result) {
                setError('the device did not answer the handshake');
                return;
            }
            renderLive(result.source, result.hub, result.info, () => undefined);
        }).catch(error => {
            setError(String(error && error.message ? error.message : error));
        });
    };

    /**
     * Same handshake as in the iframe: send rxdbv-ready, wait
     * for rxdbv-init, then start the RPC source over the transport.
     */
    const initOverTransport = (transport: ViewerPageTransport) => {
        return new Promise<{ source: ViewerSource; hub: ReturnType<typeof createPageHub>; info: ViewerInfo; } | null>((resolve, reject) => {
            let done = false;
            const timeout = setTimeout(() => {
                if (!done) {
                    done = true;
                    unsubscribe();
                    resolve(null);
                }
            }, INIT_TIMEOUT_MS * 2);
            const unsubscribe = transport.onMessage((data: any) => {
                if (done || !data || data.type !== 'rxdbv-init') {
                    return;
                }
                done = true;
                clearTimeout(timeout);
                unsubscribe();
                const info = data.info as ViewerInfo;
                createRemoteSource(info, transport).then(source => {
                    const hub = createPageHub(source);
                    resolve({ source, hub, info });
                }).catch(reject);
            });
            transport.send({ type: 'rxdbv-ready' });
        });
    };

    const embedded = window.parent && window.parent !== window;
    if (!embedded) {
        renderStandalone();
        return;
    }

    const hostWindow = window.parent;
    let initialized = false;

    const onMessage = (event: MessageEvent) => {
        if (event.source !== hostWindow) {
            return;
        }
        const data = event.data;
        if (!data || data.type !== 'rxdbv-init' || initialized) {
            return;
        }
        initialized = true;
        window.removeEventListener('message', onMessage);
        const info = data.info as ViewerInfo;
        const hostOrigin = event.origin && event.origin !== 'null' ? event.origin : '*';
        const onClose = () => hostWindow.postMessage({ type: 'rxdbv-close' }, hostOrigin);
        if (info.dump) {
            const source = createDumpSource(info.dump, info.dumpFilename, info.rxdbVersion);
            renderLive(source, null, info, onClose);
            return;
        }
        const transport = createWindowPageTransport(hostWindow, hostOrigin);
        createRemoteSource(info, transport).then(source => {
            const hub = createPageHub(source);
            renderLive(source, hub, info, onClose);
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
