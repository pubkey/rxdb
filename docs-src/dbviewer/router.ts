import {
    formatInteger
} from '../../src/plugins/dbviewer/dbviewer-helpers.ts';
import { renderCollectionScreen } from './collection.ts';
import type { PageContext } from './context.ts';
import { storeSettings } from './context.ts';
import {
    DBVIEWER_LOGO_SVG,
    el
} from './dom.ts';
import {
    VIEWER_DOCS_BASE_URL,
    showViewerError
} from './error.ts';
import {
    renderChangesPanel,
    renderReplicationPanel
} from './feeds.ts';
import { renderLivePanel } from './live.ts';
import {
    renderQueryLabPanel,
    renderSchemaPanel,
    renderStoragePanel
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
                showViewerError(ctx.root, file.name + ' is not a valid JSON dump', err);
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

    const docCollectionName = phone.collectionName;
    const docId = phone.docId as string;
    const docHeader = el('div', 'rxdbv-phone-header', [
        el('span', 'rxdbv-phone-back', '‹', {
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
