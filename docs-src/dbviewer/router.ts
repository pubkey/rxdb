import {
    formatInteger
} from '../../src/plugins/dbviewer/dbviewer-helpers.ts';
import { renderCollectionScreen } from './collection.ts';
import type { PageContext } from './context.ts';
import {
    DBVIEWER_ICON_ARROW_LEFT,
    DBVIEWER_ICON_ARROW_RIGHT,
    DBVIEWER_LOGO_SVG,
    el
} from './dom.ts';
import { VIEWER_DOCS_BASE_URL } from './error.ts';
import {
    renderChangesPanel,
    renderReplicationPanel
} from './feeds.ts';
import { renderLivePanel } from './live.ts';
import {
    renderExplainPanel,
    renderSchemaPanel,
    renderStoragePanel,
    renderCleanupPanel,
    renderExportPanel
} from './panels.ts';

/**
 * Renders the screen for the current navigation state into
 * ctx.contentHost. Called by the React shell whenever the
 * navigation or the content version changes.
 */
export function renderContentScreen(ctx: PageContext) {
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
        case 'explain':
            renderExplainPanel(ctx);
            break;
        case 'storage':
            renderStoragePanel(ctx);
            break;
        case 'cleanup':
            renderCleanupPanel(ctx);
            break;
        case 'export':
            renderExportPanel(ctx);
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

function renderEmptyDatabase(ctx: PageContext) {
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

function renderSettings(ctx: PageContext) {
    ctx.contentHost.appendChild(el('div', 'rxdbv-panel-scroll', [
        el('div', '', [
            el('div', 'rxdbv-section-label', 'ABOUT'),
            el('div', 'rxdbv-dim', 'RxDB database viewer · rxdb v' + ctx.source.rxdbVersion, { style: 'padding:8px 12px' })
        ])
    ]));
}

/**
 * Stacked read-only screens for viewports below 640px:
 * collections list, document list, document read view.
 */
function renderPhoneLayout(ctx: PageContext) {
    const host = ctx.contentHost;
    const phone = ctx.phoneNav;

    if (phone.screen !== 'tool' && (phone.screen === 'collections' || !phone.collectionName)) {
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
        const phoneCollections = ctx.source.listCollections();
        phoneCollections.filter(info => !info.viewOnly).forEach(info => {
            const count = ctx.countsCache.get(info.name);
            listWrap.appendChild(el('div', 'rxdbv-phone-row rxdbv-phone-group', [
                el('span', 'rxdbv-mono rxdbv-flex1', info.name)
            ]));
            listWrap.appendChild(el('div', 'rxdbv-phone-row rxdbv-phone-subrow', [
                el('span', 'rxdbv-flex1', typeof count === 'number' ? 'Documents (' + formatInteger(count) + ')' : 'Documents'),
                el('span', 'rxdbv-dim', undefined, { html: DBVIEWER_ICON_ARROW_RIGHT })
            ], {
                onClick: () => {
                    ctx.phoneNav = { screen: 'list', collectionName: info.name };
                    ctx.renderContent();
                }
            }));
            const collectionTools: { view: typeof ctx.nav.view; label: string; }[] = [
                { view: 'schema', label: 'Schema' },
                { view: 'changes', label: 'Changes' }
            ];
            if (ctx.events && ctx.events.replications.some(r => r.collectionName === info.name)) {
                collectionTools.push({ view: 'replication', label: 'Replication' });
            }
            collectionTools.forEach(tool => {
                if (tool.view === 'changes' && ctx.source.kind === 'dump') {
                    return;
                }
                let label = tool.label;
                if (tool.view === 'changes' && ctx.events) {
                    const changeCount = ctx.events.changes.filter(entry => entry.collectionName === info.name).length;
                    if (changeCount > 0) {
                        label = 'Changes (' + formatInteger(changeCount) + ')';
                    }
                }
                if (tool.view === 'schema' && typeof info.schemaVersion === 'number') {
                    label = 'Schema (v' + info.schemaVersion + ')';
                }
                listWrap.appendChild(el('div', 'rxdbv-phone-row rxdbv-phone-subrow', [
                    el('span', 'rxdbv-flex1', label),
                    el('span', 'rxdbv-dim', undefined, { html: DBVIEWER_ICON_ARROW_RIGHT })
                ], {
                    onClick: () => {
                        ctx.nav = { view: tool.view, collectionName: info.name };
                        ctx.phoneNav = { screen: 'tool', toolView: tool.view, collectionName: info.name };
                        ctx.renderContent();
                    }
                }));
            });
        });
        const tools: { view: typeof ctx.nav.view; label: string; }[] = [
            { view: 'live', label: 'Live' },
            { view: 'storage', label: 'Storage' },
            { view: 'cleanup', label: 'Cleanup' },
            { view: 'export', label: 'Export/Import' },
            { view: 'settings', label: 'Settings' }
        ];
        const dumpDisabled = ctx.source.kind === 'dump' ? ['live', 'changes'] : [];
        listWrap.appendChild(el('div', 'rxdbv-rail-header', 'TOOLS', { style: 'padding:16px 14px 4px' }));
        tools.filter(tool => !dumpDisabled.includes(tool.view)).forEach(tool => {
            listWrap.appendChild(el('div', 'rxdbv-phone-row', [
                el('span', 'rxdbv-flex1', tool.label),
                el('span', 'rxdbv-dim', undefined, { html: DBVIEWER_ICON_ARROW_RIGHT })
            ], {
                onClick: () => {
                    ctx.phoneNav = { screen: 'tool', toolView: tool.view };
                    ctx.renderContent();
                }
            }));
        });
        if (phoneCollections.some(info => !!info.viewOnly)) {
            listWrap.appendChild(el('div', 'rxdbv-rail-header', 'SYSTEM', { style: 'padding:16px 14px 4px' }));
            phoneCollections.filter(info => !!info.viewOnly).forEach(info => {
                const count = ctx.countsCache.get(info.name);
                listWrap.appendChild(el('div', 'rxdbv-phone-row', [
                    el('span', 'rxdbv-mono rxdbv-muted rxdbv-flex1', info.name),
                    el('span', 'rxdbv-dim rxdbv-mono', typeof count === 'number' ? formatInteger(count) : '…', { style: 'font-size:12px' }),
                    el('span', 'rxdbv-dim', undefined, { html: DBVIEWER_ICON_ARROW_RIGHT })
                ], {
                    onClick: () => {
                        ctx.phoneNav = { screen: 'list', collectionName: info.name };
                        ctx.renderContent();
                    }
                }));
            });
        }
        host.appendChild(header);
        host.appendChild(listWrap);
        return;
    }

    if (phone.screen === 'tool') {
        const toolView = phone.toolView || 'settings';
        const title = toolView === 'export' ? 'Export/Import'
            : toolView.charAt(0).toUpperCase() + toolView.slice(1);
        host.appendChild(el('div', 'rxdbv-phone-header', [
            el('span', 'rxdbv-phone-back', undefined, {
                html: DBVIEWER_ICON_ARROW_LEFT,
                onClick: () => {
                    ctx.phoneNav = { screen: 'collections' };
                    ctx.renderContent();
                }
            }),
            el('span', 'rxdbv-phone-header-title', title)
        ]));
        /**
         * The tool panels render into ctx.contentHost, so a
         * scrollable wrapper stands in as the content host
         * while the panel builds itself.
         */
        const toolHost = el('div', 'rxdbv-phone-tool-host');
        host.appendChild(toolHost);
        const originalContentHost = ctx.contentHost;
        ctx.contentHost = toolHost;
        try {
            switch (toolView) {
                case 'live':
                    renderLivePanel(ctx);
                    break;
                case 'schema':
                    renderSchemaPanel(ctx);
                    break;
                case 'changes':
                    renderChangesPanel(ctx);
                    break;
                case 'replication':
                    renderReplicationPanel(ctx);
                    break;
                case 'storage':
                    renderStoragePanel(ctx);
                    break;
                case 'cleanup':
                    renderCleanupPanel(ctx);
                    break;
                case 'export':
                    renderExportPanel(ctx);
                    break;
                case 'settings':
                    renderSettings(ctx);
                    break;
            }
        } finally {
            ctx.contentHost = originalContentHost;
        }
        return;
    }

    if (phone.screen === 'list') {
        const collectionName = phone.collectionName;
        const header = el('div', 'rxdbv-phone-header', [
            el('span', 'rxdbv-phone-back', undefined, {
                html: DBVIEWER_ICON_ARROW_LEFT,
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
                    el('span', 'rxdbv-dim', undefined, { html: DBVIEWER_ICON_ARROW_RIGHT })
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

    const docCollectionName = phone.collectionName;
    const docId = phone.docId as string;
    const docHeader = el('div', 'rxdbv-phone-header', [
        el('span', 'rxdbv-phone-back', undefined, {
                html: DBVIEWER_ICON_ARROW_LEFT,
            onClick: () => {
                ctx.phoneNav = { screen: 'list', collectionName: docCollectionName };
                ctx.renderContent();
            }
        }),
        el('span', 'rxdbv-mono', docId, { style: 'font-weight:700' }),
        el('span', 'rxdbv-dim', 'in ' + docCollectionName, { style: 'font-size:11px' })
    ]);
    const fieldsWrap = el('div', '', undefined, { style: 'overflow:auto;padding:6px 0;flex:1' });
    host.appendChild(docHeader);
    host.appendChild(fieldsWrap);
    host.appendChild(el('div', 'rxdbv-phone-note', 'Read-only at this width. Editing needs the desktop drawer.'));
    ctx.source.getById(docCollectionName, docId).then(doc => {
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
