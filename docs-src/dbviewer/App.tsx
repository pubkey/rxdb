import React, {
    useEffect,
    useReducer,
    useRef,
    useState
} from 'react';
import { formatClockTime, formatInteger } from '../../src/plugins/dbviewer/dbviewer-helpers.ts';
import type { RxDBViewerDump } from '../../src/plugins/dbviewer/dbviewer-types.ts';
import type {
    PageContext,
    ViewerNav,
    ViewerNavView
} from './context.ts';
import { DBVIEWER_LOGO_SVG } from './dom.ts';
import { VIEWER_DOCS_BASE_URL } from './error.ts';
import type { PageHub } from './hub.ts';
import { renderContentScreen } from './router.ts';
import { createDumpSource } from './source.ts';
import type { ViewerSource } from './source.ts';

export const NARROW_BREAKPOINT = 640;

export type ViewerAppProps = {
    source: ViewerSource;
    liveSource: ViewerSource | null;
    hub: PageHub | null;
    pageSize: number;
    showCloseButton: boolean;
    onClose: () => void;
};

/**
 * The React shell of the viewer page: top bar, dump banner,
 * navigation rail and routing. The data screens themselves are
 * imperative renderers (see router.ts) mounted into the content
 * host, because they animate and re-render at event rate.
 */
export function ViewerApp(props: ViewerAppProps) {
    const [, bumpShell] = useReducer((x: number) => x + 1, 0);
    const [contentTick, bumpContent] = useReducer((x: number) => x + 1, 0);
    const [isNarrow, setIsNarrow] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const cleanupsRef = useRef<(() => void)[]>([]);
    const ctxRef = useRef<PageContext | null>(null);

    if (!ctxRef.current) {
        const created: PageContext = {
            source: props.source,
            liveSource: props.liveSource,
            events: props.hub,
            pageSize: props.pageSize,
            root: document.body,
            contentHost: document.body,
            nav: { view: 'collection' },
            lastCollectionName: null,
            collectionState: new Map(),
            schemaViewMode: new Map(),
            countsCache: new Map(),
            viewerWriteTimes: [],
            isNarrow: false,
            phoneNav: { screen: 'collections' },
            destroyed: false,
            navigate(nav: ViewerNav) {
                created.nav = nav;
                if (nav.collectionName) {
                    created.lastCollectionName = nav.collectionName;
                }
                bumpShell();
                bumpContent();
            },
            renderContent() {
                bumpContent();
            },
            renderRail() {
                bumpShell();
            },
            setCleanup(fn: () => void) {
                cleanupsRef.current.push(fn);
            },
            currentCollectionName() {
                const collections = created.source.listCollections();
                if (collections.length === 0) {
                    return null;
                }
                if (created.nav.collectionName && collections.some(c => c.name === created.nav.collectionName)) {
                    return created.nav.collectionName;
                }
                if (created.lastCollectionName && collections.some(c => c.name === created.lastCollectionName)) {
                    return created.lastCollectionName;
                }
                return collections[0].name;
            },
            openDump(dump: RxDBViewerDump, filename?: string) {
                created.source = createDumpSource(dump, filename, created.source.rxdbVersion);
                created.collectionState.clear();
                created.countsCache.clear();
                created.nav = { view: 'collection' };
                created.phoneNav = { screen: 'collections' };
                refreshCounts(created);
                bumpShell();
                bumpContent();
            },
            closeDump() {
                if (!created.liveSource) {
                    return;
                }
                created.source = created.liveSource;
                created.collectionState.clear();
                created.countsCache.clear();
                created.nav = { view: 'collection' };
                created.phoneNav = { screen: 'collections' };
                refreshCounts(created);
                bumpShell();
                bumpContent();
            },
            requestClose() {
                props.onClose();
            }
        };
        const firstCollection = created.source.listCollections()[0];
        if (firstCollection) {
            created.nav = { view: 'collection', collectionName: firstCollection.name };
            created.lastCollectionName = firstCollection.name;
        }
        ctxRef.current = created;
    }
    const ctx = ctxRef.current;

    const refreshCounts = (context: PageContext) => {
        const collections = context.source.listCollections();
        Promise.all(
            collections.map(async info => {
                const count = await context.source.count(info.name);
                return [info.name, count] as [string, number | null];
            })
        ).then(entries => {
            if (context.destroyed) {
                return;
            }
            entries.forEach(([name, count]) => context.countsCache.set(name, count));
            bumpShell();
        }).catch(() => { });
    };

    /**
     * Below 640px the map and grids do not fit,
     * the stacked read-only phone layout is used instead.
     */
    useEffect(() => {
        const root = rootRef.current;
        if (!root) {
            return;
        }
        const applyWidth = () => {
            const narrow = root.clientWidth > 0 && root.clientWidth < NARROW_BREAKPOINT;
            setIsNarrow(previous => {
                if (previous !== narrow) {
                    return narrow;
                }
                return previous;
            });
        };
        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => applyWidth());
            resizeObserver.observe(root);
        }
        applyWidth();
        return () => {
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        };
    }, []);

    // rail counts and replication glyphs follow the event hub
    useEffect(() => {
        refreshCounts(ctx);
        const hub = props.hub;
        if (!hub) {
            return;
        }
        let lastSeenWrites = -1;
        const countsTimer = setInterval(() => {
            if (hub.sessionWrites !== lastSeenWrites) {
                lastSeenWrites = hub.sessionWrites;
                refreshCounts(ctx);
            }
        }, 2000);
        let railPending = false;
        const subscription = hub.changed$.subscribe(() => {
            if (railPending) {
                return;
            }
            railPending = true;
            setTimeout(() => {
                railPending = false;
                if (!ctx.destroyed) {
                    bumpShell();
                }
            }, 500);
        });
        return () => {
            clearInterval(countsTimer);
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => () => {
        ctx.destroyed = true;
    }, []);

    // the imperative content renderer
    useEffect(() => {
        const host = contentRef.current;
        const root = rootRef.current;
        if (!host || !root) {
            return;
        }
        ctx.root = root;
        ctx.contentHost = host;
        ctx.isNarrow = isNarrow;
        host.textContent = '';
        renderContentScreen(ctx);
        return () => {
            cleanupsRef.current.forEach(fn => {
                try {
                    fn();
                } catch (err) {
                    // a failing cleanup must not break the next render
                }
            });
            cleanupsRef.current = [];
            host.textContent = '';
        };
    }, [contentTick, isNarrow]);

    const source = ctx.source;
    const identity = source.databaseName + ' / ' + source.storageName + ' / v' + (source.rxdbVersion || '?');

    return (
        <div className="rxdbv-root" ref={rootRef} style={{ position: 'relative' }}>
            {!isNarrow ? (
                <div className="rxdbv-topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="rxdbv-logo" dangerouslySetInnerHTML={{ __html: DBVIEWER_LOGO_SVG }} />
                    </div>
                    <span className="rxdbv-wordmark">RxDB</span>
                    <span className="rxdbv-topbar-divider">|</span>
                    <span className="rxdbv-topbar-identity">{identity}</span>
                    <div className="rxdbv-flex1" />
                    <button
                        className="rxdbv-btn"
                        onClick={() => {
                            ctx.countsCache.clear();
                            source.refreshCollections().then(() => {
                                refreshCounts(ctx);
                                bumpShell();
                                bumpContent();
                            }).catch(() => {
                                refreshCounts(ctx);
                                bumpContent();
                            });
                        }}
                    >Refresh</button>
                    <button
                        className="rxdbv-btn"
                        title="Open the RxDB documentation"
                        onClick={() => window.open(VIEWER_DOCS_BASE_URL + 'overview.html', '_blank')}
                    >?</button>
                    {props.showCloseButton ? (
                        <button
                            className="rxdbv-btn"
                            title="Close the viewer"
                            onClick={() => ctx.requestClose()}
                        >×</button>
                    ) : null}
                </div>
            ) : null}
            {source.kind === 'dump' ? <DumpBanner ctx={ctx} /> : null}
            <div className="rxdbv-body">
                {!isNarrow ? <Rail ctx={ctx} /> : null}
                <div className="rxdbv-content" ref={contentRef} />
            </div>
        </div>
    );
}

function DumpBanner(props: { ctx: PageContext; }) {
    const ctx = props.ctx;
    const source = ctx.source;
    const filename = source.dumpFilename || (source.databaseName + '.json');
    const asOf = source.dumpTime ? formatClockTime(source.dumpTime).slice(0, 5) : '';
    return (
        <div className="rxdbv-banner-dump">
            <span className="rxdbv-mono">{'Reading dump ' + filename}</span>
            <span className="rxdbv-dim">{'· read-only · data as of ' + asOf}</span>
            <div className="rxdbv-flex1" />
            {ctx.liveSource ? (
                <button className="rxdbv-btn rxdbv-btn-small" onClick={() => ctx.closeDump()}>Close dump</button>
            ) : null}
        </div>
    );
}

function Rail(props: { ctx: PageContext; }) {
    const ctx = props.ctx;
    const collections = ctx.source.listCollections();
    const nav = ctx.nav;
    const events = ctx.events;

    const replicationsByCollection = new Map<string, { glyph: string; color: string; state: string; }>();
    if (events && ctx.source.kind === 'live') {
        events.replications.forEach(info => {
            let glyph = '○';
            let color = 'var(--rxdbv-fg-dim)';
            let state = 'idle';
            if (info.lastError && info.lastErrorTime && Date.now() - info.lastErrorTime < 60 * 1000) {
                glyph = '▲';
                color = 'var(--rxdbv-danger)';
                state = 'error';
            } else if (info.stopped) {
                glyph = '■';
                color = 'var(--rxdbv-fg-muted)';
                state = 'stopped';
            } else if (info.active) {
                glyph = '●';
                color = 'var(--rxdbv-success)';
                state = 'running';
            }
            replicationsByCollection.set(info.collectionName, { glyph, color, state });
        });
    }

    const tools: { view: ViewerNavView; label: string; }[] = [
        { view: 'live', label: 'Live' },
        { view: 'schema', label: 'Schema' },
        { view: 'changes', label: 'Changes' },
        { view: 'querylab', label: 'Query lab' },
        { view: 'storage', label: 'Storage' }
    ];
    const dumpDisabled: ViewerNavView[] = ['live', 'changes'];

    return (
        <div className="rxdbv-rail">
            <div className="rxdbv-rail-header">COLLECTIONS</div>
            {collections.map(info => {
                const active = nav.view === 'collection' && ctx.currentCollectionName() === info.name;
                const count = ctx.countsCache.get(info.name);
                return (
                    <div
                        key={info.name}
                        className={'rxdbv-rail-item' + (active ? ' rxdbv-active' : '')}
                        onClick={() => ctx.navigate({ view: 'collection', collectionName: info.name })}
                    >
                        <span className="rxdbv-rail-label">{info.name}</span>
                        <span className="rxdbv-rail-count">{typeof count === 'number' ? formatInteger(count) : '…'}</span>
                    </div>
                );
            })}
            {collections.length === 0 ? (
                <div className="rxdbv-rail-item">
                    <span className="rxdbv-rail-label rxdbv-dim">none yet</span>
                </div>
            ) : null}
            {replicationsByCollection.size > 0 ? (
                <div className="rxdbv-rail-header">REPLICATION</div>
            ) : null}
            {Array.from(replicationsByCollection.entries()).map(([collectionName, replicationState]) => {
                const active = nav.view === 'replication' && nav.collectionName === collectionName;
                return (
                    <div
                        key={'repl-' + collectionName}
                        className={'rxdbv-rail-item' + (active ? ' rxdbv-active' : '')}
                        onClick={() => ctx.navigate({ view: 'replication', collectionName })}
                    >
                        <span className="rxdbv-rail-label">{collectionName}</span>
                        <span
                            title={replicationState.state}
                            style={{ color: replicationState.color, fontSize: 10 }}
                        >{replicationState.glyph}</span>
                    </div>
                );
            })}
            <div className="rxdbv-rail-header">TOOLS</div>
            {tools.map(tool => {
                const disabled = ctx.source.kind === 'dump' && dumpDisabled.includes(tool.view);
                return (
                    <div
                        key={tool.view}
                        className={'rxdbv-rail-item' + (nav.view === tool.view ? ' rxdbv-active' : '')}
                        title={disabled ? 'not available on a dump' : tool.label}
                        style={disabled ? { opacity: 0.45, cursor: 'default' } : undefined}
                        onClick={() => {
                            if (!disabled) {
                                ctx.navigate({ view: tool.view });
                            }
                        }}
                    >{tool.label}</div>
                );
            })}
            <div className="rxdbv-rail-spacer" />
            <div
                className={'rxdbv-rail-settings' + (nav.view === 'settings' ? ' rxdbv-active' : '')}
                onClick={() => ctx.navigate({ view: 'settings' })}
            >Settings</div>
        </div>
    );
}
