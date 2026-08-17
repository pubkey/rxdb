import { newRxError } from '../../rx-error.ts';
import { RXDB_VERSION } from '../utils/index.ts';
import {
    createDumpDataSource,
    createLiveDataSource,
    type ViewerDataSource
} from './dbviewer-data.ts';
import {
    DBVIEWER_LOGO_SVG,
    clearChildren,
    el,
    ensureViewerStyles
} from './dbviewer-dom.ts';
import {
    createViewerEventHub,
    type ViewerEventHub
} from './dbviewer-events.ts';
import {
    formatClockTime,
    formatInteger
} from './dbviewer-helpers.ts';
import type {
    RxDBViewerDump,
    RxDBViewerHandle,
    RxDBViewerOptions
} from './dbviewer-types.ts';
import { renderCollectionScreen } from './dbviewer-collection.ts';
import {
    renderQueryLabPanel,
    renderSchemaPanel,
    renderStoragePanel
} from './dbviewer-panels.ts';
import {
    renderChangesPanel,
    renderReplicationPanel
} from './dbviewer-feeds.ts';
import { renderLivePanel } from './dbviewer-live.ts';

export const VIEWER_DOCS_BASE_URL = 'https://rxdb.info/';
const SETTINGS_STORAGE_KEY = 'rxdb-dbviewer-settings';
export const NARROW_BREAKPOINT = 640;

export type ViewerNavView = 'collection' | 'live' | 'schema' | 'changes' | 'querylab' | 'storage' | 'replication' | 'settings';

export type ViewerNav = {
    view: ViewerNavView;
    collectionName?: string;
};

export type ViewerContext = {
    options: RxDBViewerOptions;
    source: ViewerDataSource;
    liveSource: ViewerDataSource | null;
    events: ViewerEventHub | null;
    pageSize: number;
    root: HTMLElement;
    topbarHost: HTMLElement;
    bannerHost: HTMLElement;
    railHost: HTMLElement;
    contentHost: HTMLElement;
    nav: ViewerNav;
    lastCollectionName: string | null;
    collectionState: Map<string, any>;
    schemaViewMode: Map<string, 'analysis' | 'schema'>;
    countsCache: Map<string, number | null>;
    viewerWriteTimes: number[];
    isNarrow: boolean;
    phoneNav: {
        screen: 'collections' | 'list' | 'doc';
        collectionName?: string;
        docId?: string;
    };
    destroyed: boolean;
    navigate(nav: ViewerNav): void;
    renderContent(): void;
    renderRail(): void;
    setCleanup(fn: () => void): void;
    currentCollectionName(): string | null;
    openDump(dump: RxDBViewerDump, filename?: string): void;
    closeDump(): void;
};

function readStoredSettings(): { pageSize?: number; } {
    try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (err) {
        return {};
    }
}

function storeSettings(settings: { pageSize?: number; }) {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
        // localStorage can be unavailable, settings are then session-only
    }
}

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
    ensureViewerStyles(parent.ownerDocument || document);

    const liveSource = options.database ? createLiveDataSource(options.database) : null;
    const source: ViewerDataSource = liveSource
        ? liveSource
        : createDumpDataSource(options.dump as RxDBViewerDump, options.dumpFilename);
    const events = options.database ? createViewerEventHub(options.database) : null;

    const root = el('div', 'rxdbv-root');
    root.style.position = 'relative';
    const topbarHost = el('div');
    const bannerHost = el('div');
    const railHost = el('div', 'rxdbv-rail');
    const contentHost = el('div', 'rxdbv-content');
    const body = el('div', 'rxdbv-body', [railHost, contentHost]);
    root.appendChild(topbarHost);
    root.appendChild(bannerHost);
    root.appendChild(body);
    parent.appendChild(root);

    const stored = readStoredSettings();
    let contentCleanup: (() => void) | null = null;
    let rendering = false;

    const ctx: ViewerContext = {
        options,
        source,
        liveSource,
        events,
        pageSize: options.pageSize || stored.pageSize || 100,
        root,
        topbarHost,
        bannerHost,
        railHost,
        contentHost,
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
            ctx.nav = nav;
            if (nav.collectionName) {
                ctx.lastCollectionName = nav.collectionName;
            }
            ctx.renderRail();
            ctx.renderContent();
        },
        renderContent() {
            if (ctx.destroyed) {
                return;
            }
            if (rendering) {
                setTimeout(() => ctx.renderContent(), 0);
                return;
            }
            rendering = true;
            try {
                if (contentCleanup) {
                    contentCleanup();
                    contentCleanup = null;
                }
                clearChildren(contentHost);
                renderContentScreen(ctx);
            } finally {
                rendering = false;
            }
        },
        renderRail() {
            if (ctx.destroyed) {
                return;
            }
            renderRail(ctx);
        },
        setCleanup(fn: () => void) {
            const previous = contentCleanup;
            contentCleanup = () => {
                if (previous) {
                    previous();
                }
                fn();
            };
        },
        currentCollectionName() {
            const collections = ctx.source.listCollections();
            if (collections.length === 0) {
                return null;
            }
            if (ctx.nav.collectionName && collections.some(c => c.name === ctx.nav.collectionName)) {
                return ctx.nav.collectionName;
            }
            if (ctx.lastCollectionName && collections.some(c => c.name === ctx.lastCollectionName)) {
                return ctx.lastCollectionName;
            }
            return collections[0].name;
        },
        openDump(dump: RxDBViewerDump, filename?: string) {
            ctx.source = createDumpDataSource(dump, filename);
            ctx.collectionState.clear();
            ctx.countsCache.clear();
            ctx.nav = { view: 'collection' };
            renderTopbar(ctx);
            renderBanner(ctx);
            ctx.renderRail();
            ctx.renderContent();
        },
        closeDump() {
            if (!ctx.liveSource) {
                return;
            }
            ctx.source = ctx.liveSource;
            ctx.collectionState.clear();
            ctx.countsCache.clear();
            ctx.nav = { view: 'collection' };
            renderTopbar(ctx);
            renderBanner(ctx);
            ctx.renderRail();
            ctx.renderContent();
        }
    };

    const firstCollection = source.listCollections()[0];
    if (firstCollection) {
        ctx.nav = { view: 'collection', collectionName: firstCollection.name };
        ctx.lastCollectionName = firstCollection.name;
    }

    renderTopbar(ctx);
    renderBanner(ctx);
    ctx.renderRail();

    /**
     * Below 640px the map and grids do not fit,
     * the stacked read-only phone layout is used instead.
     */
    const applyWidth = () => {
        const narrow = root.clientWidth > 0 && root.clientWidth < NARROW_BREAKPOINT;
        if (narrow !== ctx.isNarrow) {
            ctx.isNarrow = narrow;
            railHost.style.display = narrow ? 'none' : '';
            topbarHost.style.display = narrow ? 'none' : '';
            ctx.renderContent();
        }
    };
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => applyWidth());
        resizeObserver.observe(root);
    }
    applyWidth();
    ctx.renderContent();

    const onKeyDown = (event: KeyboardEvent) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            openCommandPalette(ctx);
        }
    };
    document.addEventListener('keydown', onKeyDown);

    let railTimer: any = null;
    if (events) {
        let lastSeenWrites = -1;
        railTimer = setInterval(() => {
            if (events.counters.writes !== lastSeenWrites) {
                lastSeenWrites = events.counters.writes;
                refreshRailCounts(ctx);
            }
        }, 2000);
        refreshRailCounts(ctx);
    } else {
        refreshRailCounts(ctx);
    }

    return {
        element: root,
        remove() {
            ctx.destroyed = true;
            if (contentCleanup) {
                contentCleanup();
                contentCleanup = null;
            }
            document.removeEventListener('keydown', onKeyDown);
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            if (railTimer) {
                clearInterval(railTimer);
            }
            if (events) {
                events.destroy();
            }
            if (root.parentElement) {
                root.parentElement.removeChild(root);
            }
        }
    };
}

function renderTopbar(ctx: ViewerContext) {
    clearChildren(ctx.topbarHost);
    const identity = ctx.source.databaseName + ' / ' + ctx.source.storageName + ' / v' + RXDB_VERSION;
    const topbar = el('div', 'rxdbv-topbar', [
        el('div', '', [
            el('div', 'rxdbv-logo', undefined, { html: DBVIEWER_LOGO_SVG }),
        ], { style: 'display:flex;align-items:center;gap:8px' }),
        el('span', 'rxdbv-wordmark', 'RxDB'),
        el('span', 'rxdbv-topbar-divider', '|'),
        el('span', 'rxdbv-topbar-identity', identity),
        el('div', 'rxdbv-flex1'),
        el('div', 'rxdbv-cmdk', ['⌘K', el('span', '', 'commands')], {
            onClick: () => openCommandPalette(ctx)
        }),
        el('button', 'rxdbv-btn', 'Refresh', {
            onClick: () => {
                ctx.countsCache.clear();
                refreshRailCounts(ctx);
                ctx.renderContent();
            }
        }),
        el('button', 'rxdbv-btn', '?', {
            title: 'Open the RxDB documentation',
            onClick: () => window.open(VIEWER_DOCS_BASE_URL, '_blank')
        })
    ]);
    ctx.topbarHost.appendChild(topbar);
}

function renderBanner(ctx: ViewerContext) {
    clearChildren(ctx.bannerHost);
    if (ctx.source.kind !== 'dump') {
        return;
    }
    const filename = ctx.source.dumpFilename || (ctx.source.databaseName + '.json');
    const asOf = ctx.source.dumpTime ? formatClockTime(ctx.source.dumpTime).slice(0, 5) : '';
    const banner = el('div', 'rxdbv-banner-dump', [
        el('span', 'rxdbv-mono', 'Reading dump ' + filename),
        el('span', 'rxdbv-dim', '· read-only · data as of ' + asOf),
        el('div', 'rxdbv-flex1'),
        ctx.liveSource
            ? el('button', 'rxdbv-btn rxdbv-btn-small', 'Close dump', { onClick: () => ctx.closeDump() })
            : null
    ]);
    ctx.bannerHost.appendChild(banner);
}

function refreshRailCounts(ctx: ViewerContext) {
    const collections = ctx.source.listCollections();
    Promise.all(
        collections.map(async info => {
            const count = await ctx.source.count(info.name);
            return [info.name, count] as [string, number | null];
        })
    ).then(entries => {
        if (ctx.destroyed) {
            return;
        }
        entries.forEach(([name, count]) => ctx.countsCache.set(name, count));
        renderRail(ctx);
    });
}

function renderRail(ctx: ViewerContext) {
    clearChildren(ctx.railHost);
    const collections = ctx.source.listCollections();
    const nav = ctx.nav;
    const rail = ctx.railHost;

    rail.appendChild(el('div', 'rxdbv-rail-header', 'COLLECTIONS'));
    collections.forEach(info => {
        const active = nav.view === 'collection' && ctx.currentCollectionName() === info.name;
        const count = ctx.countsCache.get(info.name);
        rail.appendChild(el('div', 'rxdbv-rail-item' + (active ? ' rxdbv-active' : ''), [
            el('span', 'rxdbv-rail-label', info.name),
            el('span', 'rxdbv-rail-count', typeof count === 'number' ? formatInteger(count) : '…')
        ], {
            onClick: () => ctx.navigate({ view: 'collection', collectionName: info.name })
        }));
    });
    if (collections.length === 0) {
        rail.appendChild(el('div', 'rxdbv-rail-item', [
            el('span', 'rxdbv-rail-label rxdbv-dim', 'none yet')
        ]));
    }

    if (ctx.events && ctx.events.replications.length > 0) {
        rail.appendChild(el('div', 'rxdbv-rail-header', 'REPLICATION'));
        const byCollection = new Map<string, { glyph: string; color: string; state: string; }>();
        ctx.events.replications.forEach(info => {
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
            byCollection.set(info.collectionName, { glyph, color, state });
        });
        byCollection.forEach((replicationState, collectionName) => {
            const active = nav.view === 'replication' && nav.collectionName === collectionName;
            const glyphSpan = el('span', '', replicationState.glyph, { title: replicationState.state });
            glyphSpan.style.color = replicationState.color;
            glyphSpan.style.fontSize = '10px';
            rail.appendChild(el('div', 'rxdbv-rail-item' + (active ? ' rxdbv-active' : ''), [
                el('span', 'rxdbv-rail-label', collectionName),
                glyphSpan
            ], {
                onClick: () => ctx.navigate({ view: 'replication', collectionName })
            }));
        });
    }

    rail.appendChild(el('div', 'rxdbv-rail-header', 'TOOLS'));
    const tools: { view: ViewerNavView; label: string; }[] = [
        { view: 'live', label: 'Live' },
        { view: 'schema', label: 'Schema' },
        { view: 'changes', label: 'Changes' },
        { view: 'querylab', label: 'Query lab' },
        { view: 'storage', label: 'Storage' }
    ];
    const dumpDisabled: ViewerNavView[] = ['live', 'changes'];
    tools.forEach(tool => {
        const disabled = ctx.source.kind === 'dump' && dumpDisabled.includes(tool.view);
        const item = el('div', 'rxdbv-rail-item' + (nav.view === tool.view ? ' rxdbv-active' : ''), tool.label, {
            title: disabled ? 'not available on a dump' : tool.label,
            onClick: () => {
                if (!disabled) {
                    ctx.navigate({ view: tool.view });
                }
            }
        });
        if (disabled) {
            item.style.opacity = '0.45';
            item.style.cursor = 'default';
        }
        rail.appendChild(item);
    });

    rail.appendChild(el('div', 'rxdbv-rail-spacer'));
    rail.appendChild(el('div', 'rxdbv-rail-settings' + (nav.view === 'settings' ? ' rxdbv-active' : ''), 'Settings', {
        onClick: () => ctx.navigate({ view: 'settings' })
    }));
}

function renderContentScreen(ctx: ViewerContext) {
    if (ctx.isNarrow) {
        renderPhoneLayout(ctx);
        return;
    }
    const collections = ctx.source.listCollections();
    if (collections.length === 0 && ctx.nav.view === 'collection') {
        renderEmptyDatabase(ctx);
        return;
    }
    switch (ctx.nav.view) {
        case 'live':
            renderLivePanel(ctx);
            break;
        case 'schema':
            renderSchemaPanel(ctx);
            break;
        case 'changes':
            renderChangesPanel(ctx);
            break;
        case 'querylab':
            renderQueryLabPanel(ctx);
            break;
        case 'storage':
            renderStoragePanel(ctx);
            break;
        case 'replication':
            renderReplicationPanel(ctx);
            break;
        case 'settings':
            renderSettings(ctx);
            break;
        default:
            renderCollectionScreen(ctx);
            break;
    }
}

function renderEmptyDatabase(ctx: ViewerContext) {
    const code = 'await db.addCollections({\n  todos: { schema: todoSchema }\n})';
    ctx.contentHost.appendChild(el('div', 'rxdbv-empty-state', [
        el('div', 'rxdbv-empty-inner', [
            el('div', 'rxdbv-empty-title', 'No collections yet'),
            el('div', 'rxdbv-empty-body', [
                el('code', '', ctx.source.databaseName),
                ' is reachable but empty. Collections are declared in your app code:'
            ]),
            el('div', 'rxdbv-empty-code', code),
            el('div', '', [
                el('a', '', 'Schema documentation', {
                    onClick: () => window.open(VIEWER_DOCS_BASE_URL + 'rx-schema.html', '_blank')
                })
            ], { style: 'margin-top:10px;font-size:11px' })
        ])
    ]));
}

function renderSettings(ctx: ViewerContext) {
    const pageSizes = [25, 50, 100, 250];
    const select = el('select', '', undefined, {
        style: 'background:var(--rxdbv-bg);color:var(--rxdbv-fg);border:1px solid rgba(255,255,255,0.2);padding:4px 8px;font-family:inherit;font-size:11px'
    }) as HTMLSelectElement;
    pageSizes.forEach(size => {
        const option = document.createElement('option');
        option.value = String(size);
        option.textContent = String(size) + ' rows per page';
        if (size === ctx.pageSize) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    select.addEventListener('change', () => {
        ctx.pageSize = parseInt(select.value, 10);
        storeSettings({ pageSize: ctx.pageSize });
    });

    const fileInput = el('input', '', undefined, { type: 'file' }) as HTMLInputElement;
    fileInput.accept = 'application/json,.json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) {
            return;
        }
        file.text().then(text => {
            try {
                const dump = JSON.parse(text);
                ctx.openDump(dump, file.name);
            } catch (err) {
                alert('This file is not a valid JSON dump.');
            }
        });
    });

    ctx.contentHost.appendChild(el('div', 'rxdbv-panel-scroll', [
        el('div', 'rxdbv-toolbar', [
            el('span', 'rxdbv-toolbar-title', 'Settings')
        ]),
        el('div', '', [
            el('div', 'rxdbv-section-label', 'GRID'),
            el('div', '', [select], { style: 'padding:8px 12px' }),
            el('div', 'rxdbv-section-label', 'DUMP FILE'),
            el('div', '', [
                el('div', 'rxdbv-muted', [
                    'Open a static export created with ',
                    el('code', 'rxdbv-mono', 'await db.exportJSON()'),
                    ' and browse it read-only.'
                ], { style: 'line-height:1.55;margin-bottom:10px;font-size:11.5px' }),
                el('button', 'rxdbv-btn-primary', 'Open dump file…', {
                    onClick: () => fileInput.click()
                }),
                fileInput
            ], { style: 'padding:8px 12px;max-width:520px' }),
            el('div', 'rxdbv-section-label', 'ABOUT'),
            el('div', 'rxdbv-dim', 'RxDB database viewer · rxdb v' + RXDB_VERSION, { style: 'padding:8px 12px' })
        ])
    ]));
}

type PaletteEntry = {
    kind: string;
    label: string;
    run: () => void;
};

function openCommandPalette(ctx: ViewerContext) {
    const existing = ctx.root.querySelector('.rxdbv-palette-backdrop');
    if (existing) {
        existing.remove();
        return;
    }
    const entries: PaletteEntry[] = [];
    ctx.source.listCollections().forEach(info => {
        entries.push({
            kind: 'collection',
            label: info.name,
            run: () => ctx.navigate({ view: 'collection', collectionName: info.name })
        });
    });
    ([
        ['live', 'Live'],
        ['schema', 'Schema'],
        ['changes', 'Changes'],
        ['querylab', 'Query lab'],
        ['storage', 'Storage'],
        ['settings', 'Settings']
    ] as [ViewerNavView, string][]).forEach(([view, label]) => {
        entries.push({
            kind: 'tool',
            label,
            run: () => ctx.navigate({ view })
        });
    });

    let activeIndex = 0;
    let filtered = entries;
    const list = el('div', 'rxdbv-palette-list');
    const input = el('input', 'rxdbv-palette-input', undefined, {
        placeholder: 'Jump to collection or tool…'
    }) as HTMLInputElement;
    const backdrop = el('div', 'rxdbv-palette-backdrop', [
        el('div', 'rxdbv-palette', [input, list])
    ]);
    const close = () => backdrop.remove();
    backdrop.addEventListener('click', event => {
        if (event.target === backdrop) {
            close();
        }
    });

    const renderList = () => {
        clearChildren(list);
        const term = input.value.toLowerCase();
        filtered = entries.filter(entry => entry.label.toLowerCase().includes(term));
        if (activeIndex >= filtered.length) {
            activeIndex = 0;
        }
        filtered.forEach((entry, index) => {
            list.appendChild(el('div', 'rxdbv-palette-row' + (index === activeIndex ? ' rxdbv-active' : ''), [
                el('span', 'rxdbv-palette-kind', entry.kind),
                el('span', 'rxdbv-mono', entry.label)
            ], {
                onClick: () => {
                    close();
                    entry.run();
                }
            }));
        });
    };
    input.addEventListener('input', () => {
        activeIndex = 0;
        renderList();
    });
    input.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            close();
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            activeIndex = Math.min(filtered.length - 1, activeIndex + 1);
            renderList();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            activeIndex = Math.max(0, activeIndex - 1);
            renderList();
        } else if (event.key === 'Enter' && filtered[activeIndex]) {
            close();
            filtered[activeIndex].run();
        }
    });
    renderList();
    ctx.root.appendChild(backdrop);
    input.focus();
}

/**
 * Stacked read-only screens for viewports below 640px:
 * collections list, document list, document read view.
 */
function renderPhoneLayout(ctx: ViewerContext) {
    const host = ctx.contentHost;
    const phone = ctx.phoneNav;

    if (phone.screen === 'collections' || !phone.collectionName) {
        const header = el('div', 'rxdbv-phone-header', [
            el('div', 'rxdbv-logo', undefined, { html: DBVIEWER_LOGO_SVG }),
            el('span', '', 'RxDB', { style: 'font-weight:800' }),
            el('span', 'rxdbv-topbar-identity', ctx.source.databaseName + ' / ' + ctx.source.storageName),
            el('div', 'rxdbv-flex1'),
            el('span', 'rxdbv-muted', 'Refresh', {
                style: 'cursor:pointer;font-size:12px',
                onClick: () => ctx.renderContent()
            })
        ]);
        const listWrap = el('div', '', undefined, { style: 'flex:1;overflow:auto' });
        listWrap.appendChild(el('div', 'rxdbv-rail-header', 'COLLECTIONS', { style: 'padding:12px 14px 4px' }));
        ctx.source.listCollections().forEach(info => {
            const count = ctx.countsCache.get(info.name);
            listWrap.appendChild(el('div', 'rxdbv-phone-row', [
                el('span', 'rxdbv-mono rxdbv-flex1', info.name),
                el('span', 'rxdbv-dim rxdbv-mono', typeof count === 'number' ? formatInteger(count) : '…', { style: 'font-size:12px' }),
                el('span', 'rxdbv-dim', '›')
            ], {
                onClick: () => {
                    ctx.phoneNav = { screen: 'list', collectionName: info.name };
                    ctx.renderContent();
                }
            }));
        });
        if (ctx.events && ctx.events.replications.length > 0) {
            listWrap.appendChild(el('div', 'rxdbv-rail-header', 'REPLICATION', { style: 'padding:16px 14px 4px' }));
            ctx.events.replications.forEach(info => {
                const state = info.lastError ? '▲ error' : (info.active ? '● running' : (info.stopped ? '■ stopped' : '○ idle'));
                const color = info.lastError ? 'var(--rxdbv-danger)' : (info.active ? 'var(--rxdbv-success)' : 'var(--rxdbv-fg-dim)');
                const stateSpan = el('span', '', state, { style: 'font-size:11px' });
                stateSpan.style.color = color;
                listWrap.appendChild(el('div', 'rxdbv-phone-row', [
                    el('span', 'rxdbv-mono rxdbv-flex1', info.collectionName),
                    stateSpan
                ]));
            });
        }
        host.appendChild(header);
        host.appendChild(listWrap);
        host.appendChild(el('div', 'rxdbv-phone-note', 'Tools (Schema, Changes, Query lab, Storage) are desktop-only. Reading data works here.'));
        return;
    }

    if (phone.screen === 'list') {
        const collectionName = phone.collectionName;
        const header = el('div', 'rxdbv-phone-header', [
            el('span', 'rxdbv-phone-back', '‹', {
                onClick: () => {
                    ctx.phoneNav = { screen: 'collections' };
                    ctx.renderContent();
                }
            }),
            el('span', 'rxdbv-mono', collectionName, { style: 'font-weight:700' }),
        ]);
        const listWrap = el('div', '', undefined, { style: 'flex:1;overflow:auto' });
        host.appendChild(header);
        host.appendChild(listWrap);
        const info = ctx.source.listCollections().find(c => c.name === collectionName);
        const primaryPath = info ? info.primaryPath : 'id';
        ctx.source.query(collectionName, {}, 0, ctx.pageSize).then(result => {
            if (ctx.destroyed) {
                return;
            }
            result.docs.forEach(doc => {
                const id = String(doc[primaryPath]);
                const title = firstTextValue(doc, primaryPath) || id;
                listWrap.appendChild(el('div', 'rxdbv-phone-row', [
                    el('div', 'rxdbv-flex1', [
                        el('div', '', title, { style: 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }),
                        el('div', 'rxdbv-mono rxdbv-dim', id + ' · ' + String(doc._rev || ''), { style: 'font-size:10px' })
                    ], { style: 'min-width:0' }),
                    el('span', 'rxdbv-dim', '›')
                ], {
                    onClick: () => {
                        ctx.phoneNav = { screen: 'doc', collectionName, docId: id };
                        ctx.renderContent();
                    }
                }));
            });
        });
        return;
    }

    const collectionName = phone.collectionName;
    const docId = phone.docId as string;
    const header = el('div', 'rxdbv-phone-header', [
        el('span', 'rxdbv-phone-back', '‹', {
            onClick: () => {
                ctx.phoneNav = { screen: 'list', collectionName };
                ctx.renderContent();
            }
        }),
        el('span', 'rxdbv-mono', docId, { style: 'font-weight:700' }),
        el('span', 'rxdbv-dim', 'in ' + collectionName, { style: 'font-size:11px' })
    ]);
    const fieldsWrap = el('div', '', undefined, { style: 'overflow:auto;padding:6px 0;flex:1' });
    host.appendChild(header);
    host.appendChild(fieldsWrap);
    host.appendChild(el('div', 'rxdbv-phone-note', 'Read-only at this width. Editing needs the desktop drawer.'));
    ctx.source.getById(collectionName, docId).then(doc => {
        if (!doc || ctx.destroyed) {
            return;
        }
        fieldsWrap.appendChild(el('div', 'rxdbv-rail-header', 'FIELDS', { style: 'padding:10px 14px 2px' }));
        Object.entries(doc).forEach(([key, value]) => {
            if (key.startsWith('_')) {
                return;
            }
            fieldsWrap.appendChild(el('div', 'rxdbv-phone-field', [
                el('div', 'rxdbv-phone-field-label', key),
                el('div', 'rxdbv-mono', typeof value === 'string' ? value : JSON.stringify(value))
            ]));
        });
        fieldsWrap.appendChild(el('div', 'rxdbv-rail-header', 'INTERNALS', { style: 'padding:12px 14px 2px' }));
        [['_rev', doc._rev], ['_meta.lwt', doc._meta ? doc._meta.lwt : undefined]].forEach(([key, value]) => {
            if (typeof value === 'undefined') {
                return;
            }
            fieldsWrap.appendChild(el('div', 'rxdbv-phone-field', [
                el('div', 'rxdbv-phone-field-label', String(key)),
                el('div', 'rxdbv-mono', String(value))
            ]));
        });
    });
}

function firstTextValue(doc: any, primaryPath: string): string | null {
    const entry = Object.entries(doc).find(([key, value]) =>
        key !== primaryPath &&
        !key.startsWith('_') &&
        typeof value === 'string'
    );
    return entry ? String(entry[1]) : null;
}
