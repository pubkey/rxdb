import { useEffect, useState } from 'react';
import { DB_VIEWER_CSS, DB_VIEWER_COLORS, DB_VIEWER_NARROW_BREAKPOINT } from './theme.ts';
import { formatNumber } from './format.ts';
import { useStoreVersion } from './use-store.ts';
import type { DbViewerClient } from './client.ts';
import type { ViewerStore } from './store.ts';
import type { DbViewerNavigation, DbViewerTool } from '../../src/types/index.d.ts';
import type { DbViewerSnapshot } from '../../src/plugins/db-viewer/protocol.ts';
import { CollectionPanel } from './components/collection-panel.tsx';
import { LivePanel } from './components/live-panel.tsx';
import { SchemaPanel } from './components/schema-panel.tsx';
import { ChangesPanel } from './components/changes-panel.tsx';
import { QueryLabPanel } from './components/query-lab-panel.tsx';
import { StoragePanel } from './components/storage-panel.tsx';
import { ReplicationPanel } from './components/replication-panel.tsx';
import { SettingsPanel } from './components/settings-panel.tsx';
import { NarrowPanel } from './components/narrow-panel.tsx';
import { ConnectionScreen } from './components/connection-screens.tsx';
import { CommandPalette, HelpModal } from './components/modals.tsx';

const TOOLS: { id: DbViewerTool; label: string; }[] = [
    { id: 'live', label: 'Live' },
    { id: 'schema', label: 'Schema' },
    { id: 'changes', label: 'Changes' },
    { id: 'querylab', label: 'Query lab' },
    { id: 'storage', label: 'Storage' }
];

export type PanelProps = {
    store: ViewerStore;
    /**
     * The last snapshot the host sent. A panel is only ever rendered after
     * one arrived, so it is passed down instead of being read back off the
     * store where its type would still be nullable.
     */
    snapshot: DbViewerSnapshot;
    client: DbViewerClient;
    notify: (message: string) => void;
};

function isActive(navigation: DbViewerNavigation, candidate: DbViewerNavigation): boolean {
    if (navigation.kind !== candidate.kind) {
        return false;
    }
    if (navigation.kind === 'collection' && candidate.kind === 'collection') {
        return navigation.name === candidate.name;
    }
    if (navigation.kind === 'replication' && candidate.kind === 'replication') {
        return navigation.name === candidate.name;
    }
    if (navigation.kind === 'tool' && candidate.kind === 'tool') {
        return navigation.tool === candidate.tool;
    }
    return true;
}

/**
 * ● running, ○ idle, ▲ error, ■ stopped.
 * The glyph carries the state so colour is never the only signal.
 */
export function replicationGlyph(store: ViewerStore, collectionName: string) {
    const collection = store.getCollection(collectionName);
    const replications = collection ? collection.replications : [];
    if (replications.length === 0) {
        return { glyph: '○', color: DB_VIEWER_COLORS.fgDim, state: 'not configured' };
    }
    if (replications.some(replication => replication.error)) {
        return { glyph: '▲', color: DB_VIEWER_COLORS.danger, state: 'error' };
    }
    if (replications.some(replication => replication.canceled)) {
        return { glyph: '■', color: DB_VIEWER_COLORS.fgMuted, state: 'stopped' };
    }
    if (replications.some(replication => replication.active)) {
        return { glyph: '●', color: DB_VIEWER_COLORS.success, state: 'running' };
    }
    return { glyph: '○', color: DB_VIEWER_COLORS.fgDim, state: 'idle' };
}

function useNarrow(): boolean {
    const [narrow, setNarrow] = useState(
        () => window.innerWidth < DB_VIEWER_NARROW_BREAKPOINT
    );
    useEffect(() => {
        const onResize = () => setNarrow(window.innerWidth < DB_VIEWER_NARROW_BREAKPOINT);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    return narrow;
}

export function App({ store, client }: { store: ViewerStore; client: DbViewerClient; }) {
    useStoreVersion(store);
    const narrow = useNarrow();
    const [toast, setToast] = useState<string | null>(null);
    const [overlay, setOverlay] = useState<'palette' | 'help' | null>(null);

    const notify = (message: string) => {
        setToast(message);
        window.setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setOverlay(current => (current === 'palette' ? null : 'palette'));
            }
            if (event.key === 'Escape') {
                setOverlay(null);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const snapshot = store.snapshot;

    if (store.error) {
        return (
            <Shell>
                <div className="rxdbv-center">
                    <div className="rxdbv-center-inner">
                        <div className="rxdbv-center-title">The database viewer could not connect</div>
                        <div className="rxdbv-center-body">{store.error}</div>
                    </div>
                </div>
            </Shell>
        );
    }
    if (!snapshot) {
        return (
            <Shell>
                <div className="rxdbv-center">
                    <div className="rxdbv-center-inner">
                        <div className="rxdbv-center-title">Connecting to the database…</div>
                        <div className="rxdbv-center-body">
                            Waiting for the app that embedded this viewer to answer.
                        </div>
                    </div>
                </div>
            </Shell>
        );
    }

    if (store.connection.state !== 'local' && store.connection.state !== 'connected') {
        return (
            <Shell>
                <ConnectionScreen store={store} snapshot={snapshot} client={client} notify={notify} />
            </Shell>
        );
    }

    const panelProps: PanelProps = { store, snapshot, client, notify };

    return (
        <Shell>
            <TopBar
                store={store}
                snapshot={snapshot}
                client={client}
                onCommandPalette={() => setOverlay('palette')}
                onHelp={() => setOverlay('help')}
            />
            <ConnectionBanner store={store} snapshot={snapshot} client={client} />
            {narrow
                ? <NarrowPanel {...panelProps} />
                : (
                    <div className="rxdbv-body">
                        <Rail store={store} onNavigate={navigation => store.navigate(navigation)} />
                        <Panel {...panelProps} />
                    </div>
                )}
            {overlay === 'palette' && (
                <CommandPalette store={store} client={client} onClose={() => setOverlay(null)} />
            )}
            {overlay === 'help' && <HelpModal snapshot={snapshot} onClose={() => setOverlay(null)} />}
            {toast && <div className="rxdbv-toast">{toast}</div>}
        </Shell>
    );
}

function Shell({ children }: { children: React.ReactNode; }) {
    return (
        <div className="rxdbv">
            <style>{DB_VIEWER_CSS}</style>
            {children}
        </div>
    );
}

function Panel(props: PanelProps) {
    const navigation = props.store.navigation;
    if (navigation.kind === 'settings') {
        return <SettingsPanel {...props} />;
    }
    if (navigation.kind === 'replication') {
        return <ReplicationPanel {...props} />;
    }
    if (navigation.kind === 'collection') {
        return <CollectionPanel {...props} collectionName={navigation.name} />;
    }
    switch (navigation.tool) {
        case 'live':
            return <LivePanel {...props} />;
        case 'schema':
            return <SchemaPanel {...props} />;
        case 'changes':
            return <ChangesPanel {...props} />;
        case 'querylab':
            return <QueryLabPanel {...props} />;
        case 'storage':
            return <StoragePanel {...props} />;
        default:
            return null;
    }
}

function TopBar({ store, snapshot, client, onCommandPalette, onHelp }: {
    store: ViewerStore;
    snapshot: DbViewerSnapshot;
    client: DbViewerClient;
    onCommandPalette: () => void;
    onHelp: () => void;
}) {
    const showWordmark = snapshot.surface !== 'tanstack';
    const identity = [
        snapshot.databaseName,
        snapshot.storageName,
        'v' + snapshot.rxdbVersion
    ].join(' / ');

    return (
        <div className="rxdbv-topbar">
            {showWordmark && (
                <div className="rxdbv-row" style={{ gap: '8px' }}>
                    <div className="rxdbv-logo" />
                    <span className="rxdbv-wordmark">RxDB</span>
                </div>
            )}
            {showWordmark && <span className="rxdbv-topbar-divider">|</span>}
            <span className="rxdbv-identity">{identity}</span>
            <div className="rxdbv-grow" />
            <div className="rxdbv-cmdk" title="Command palette" onClick={onCommandPalette}>
                {'⌘K'}<span>commands</span>
            </div>
            <button className="rxdbv-btn" onClick={() => void refresh(store, client)}>Refresh</button>
            <button
                className="rxdbv-btn"
                title="About the RxDB database viewer"
                onClick={onHelp}
            >?</button>
            <button
                className="rxdbv-btn"
                title="Close the database viewer"
                onClick={() => void client.call('close', {})}
            >✕</button>
        </div>
    );
}

export async function refresh(store: ViewerStore, client: DbViewerClient): Promise<void> {
    try {
        store.applySnapshot(await client.call('snapshot', {}));
    } catch (error) {
        store.error = (error as Error).message;
        store.emit();
    }
}

function ConnectionBanner({ store, snapshot, client }: {
    store: ViewerStore;
    snapshot: DbViewerSnapshot;
    client: DbViewerClient;
}) {
    if (snapshot.dump) {
        const exported = new Date(snapshot.dump.exportedAt);
        return (
            <div className="rxdbv-banner rxdbv-banner-dump">
                <span className="rxdbv-dot" style={{ background: DB_VIEWER_COLORS.warning }} />
                <span>
                    {'Reading dump '}
                    <span className="rxdbv-mono" style={{ fontWeight: 700 }}>{snapshot.dump.fileName}</span>
                    {' · read-only · data as of ' + exported.getHours() + ':' +
                        String(exported.getMinutes()).padStart(2, '0')}
                </span>
            </div>
        );
    }
    const connection = store.connection;
    if (connection.state !== 'connected') {
        return null;
    }
    return (
        <div className="rxdbv-banner rxdbv-banner-connected">
            <span
                className="rxdbv-dot"
                style={{ background: DB_VIEWER_COLORS.success, width: '8px', height: '8px' }}
            />
            <span>
                {'Connected to '}
                <span className="rxdbv-mono" style={{ fontWeight: 700 }}>{snapshot.databaseName}</span>
                {' on ' + connection.device + ' · ' + connection.transport + ' · '}
                <span style={{ color: DB_VIEWER_COLORS.success, fontWeight: 700 }}>
                    {connection.writeable ? 'read/write' : 'read-only'}
                </span>
            </span>
            {connection.roundTripMs !== undefined && (
                <span className="rxdbv-dim">
                    {'round-trip ' + Math.round(connection.roundTripMs) + ' ms'}
                </span>
            )}
            <div className="rxdbv-grow" />
            {connection.canDisconnect && (
                <button
                    className="rxdbv-btn rxdbv-btn-small"
                    onClick={() => void client.call('disconnect', {})}
                >Disconnect</button>
            )}
        </div>
    );
}

function Rail({ store, onNavigate }: {
    store: ViewerStore;
    onNavigate: (navigation: DbViewerNavigation) => void;
}) {
    const collectionNames = store.collectionNames;
    const replicated = collectionNames.filter(name => {
        const collection = store.getCollection(name);
        return collection ? collection.replications.length > 0 : false;
    });

    const item = (navigation: DbViewerNavigation, key: string, children: React.ReactNode) => (
        <div
            key={key}
            className={'rxdbv-rail-item' + (isActive(store.navigation, navigation) ? ' rxdbv-active' : '')}
            onClick={() => onNavigate(navigation)}
        >{children}</div>
    );

    return (
        <div className="rxdbv-rail">
            <div className="rxdbv-rail-head">COLLECTIONS</div>
            {collectionNames.length === 0 && (
                <div className="rxdbv-rail-item rxdbv-dim" style={{ cursor: 'default' }}>none yet</div>
            )}
            {collectionNames.map(name => item({ kind: 'collection', name }, 'c-' + name, (
                <>
                    <span className="rxdbv-rail-label">{name}</span>
                    <span className="rxdbv-rail-count">
                        {formatNumber(store.counts[name] ?? 0)}
                    </span>
                </>
            )))}

            {replicated.length > 0 && <div className="rxdbv-rail-head">REPLICATION</div>}
            {replicated.map(name => {
                const glyph = replicationGlyph(store, name);
                return item({ kind: 'replication', name }, 'r-' + name, (
                    <>
                        <span className="rxdbv-rail-label">{name}</span>
                        <span style={{ color: glyph.color, fontSize: '10px' }} title={glyph.state}>
                            {glyph.glyph}
                        </span>
                    </>
                ));
            })}

            <div className="rxdbv-rail-head">TOOLS</div>
            {TOOLS.map(tool => item({ kind: 'tool', tool: tool.id }, 't-' + tool.id, (
                <span className="rxdbv-rail-label">{tool.label}</span>
            )))}

            <div className="rxdbv-grow" />
            <div className="rxdbv-rail-settings" onClick={() => onNavigate({ kind: 'settings' })}>
                Settings
            </div>
        </div>
    );
}
