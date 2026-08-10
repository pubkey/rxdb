import {
    clearChildren,
    downloadJson,
    el
} from './dbviewer-dom.ts';
import {
    buildViewerWillRun,
    colorViewerJson,
    escapeHtml,
    formatInteger,
    formatTimeAgo,
    parseViewerSelector,
    shortRev,
    viewerTypeOf
} from './dbviewer-helpers.ts';
import { stripInternalFields } from './dbviewer-data.ts';
import type { ViewerContext } from './dbviewer.ts';

const HISTORY_STORAGE_KEY = 'rxdb-dbviewer-queries';

type DrawerState = {
    mode: 'edit' | 'new';
    docId?: string;
    doc: any;
    staged: Map<string, string>;
    expanded: Set<string>;
    applyError?: string;
};

type CollectionUiState = {
    view: 'table' | 'json';
    queryInput: string;
    appliedSelector: any;
    parseError: { message: string; position: number; } | null;
    page: number;
    selection: Set<string>;
    observe: boolean;
    drawer: DrawerState | null;
    freshIds: Map<string, number>;
    lastResult: { docs: any[]; total: number | null; } | null;
    sortField: string | null;
    sortDirection: 1 | -1;
    historyOpen: boolean;
};

function getUiState(ctx: ViewerContext, collectionName: string): CollectionUiState {
    let state = ctx.collectionState.get(collectionName);
    if (!state) {
        state = {
            view: 'table',
            queryInput: '',
            appliedSelector: {},
            parseError: null,
            page: 0,
            selection: new Set(),
            observe: false,
            drawer: null,
            freshIds: new Map(),
            lastResult: null,
            sortField: null,
            sortDirection: -1,
            historyOpen: false
        } as CollectionUiState;
        ctx.collectionState.set(collectionName, state);
    }
    return state;
}

type StoredQueries = {
    favourites: { name: string; query: string; }[];
    recent: string[];
};

function readStoredQueries(): StoredQueries {
    try {
        const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return {
            favourites: parsed && Array.isArray(parsed.favourites) ? parsed.favourites : [],
            recent: parsed && Array.isArray(parsed.recent) ? parsed.recent : []
        };
    } catch (err) {
        return { favourites: [], recent: [] };
    }
}

function writeStoredQueries(stored: StoredQueries) {
    try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(stored));
    } catch (err) {
        // without localStorage the history is session-only
    }
}

function rememberRecentQuery(query: string) {
    if (query.trim() === '') {
        return;
    }
    const stored = readStoredQueries();
    stored.recent = [query].concat(stored.recent.filter(entry => entry !== query)).slice(0, 8);
    writeStoredQueries(stored);
}

export function renderCollectionScreen(ctx: ViewerContext) {
    const collectionName = ctx.currentCollectionName();
    if (!collectionName) {
        return;
    }
    const uiState = getUiState(ctx, collectionName);
    const host = ctx.contentHost;
    const info = ctx.source.listCollections().find(c => c.name === collectionName);
    const primaryPath = info ? info.primaryPath : 'id';
    const readOnly = ctx.source.readOnly;

    const screen = el('div', 'rxdbv-content', undefined, { style: 'position:relative' });
    host.appendChild(screen);

    const resultHost = el('div', 'rxdbv-content', undefined, { style: 'flex:1;min-height:0;display:flex;flex-direction:column' });
    const footerHost = el('div');
    const drawerHost = el('div');

    const rerun = () => {
        runQuery(ctx, collectionName, uiState, resultHost, footerHost, primaryPath);
    };

    // toolbar row 1
    const observeToggle = el('div', 'rxdbv-observe' +
        (uiState.observe ? ' rxdbv-active' : '') +
        (readOnly ? ' rxdbv-disabled' : ''), [
        el('span', 'rxdbv-observe-dot'),
        uiState.observe ? 'Observing' : 'Observe'
    ], {
        title: readOnly ? 'not available on a dump' : 'Update the current result live as documents change',
        onClick: () => {
            if (readOnly) {
                return;
            }
            uiState.observe = !uiState.observe;
            ctx.renderContent();
        }
    });
    const toolbar = el('div', 'rxdbv-toolbar', [
        el('span', 'rxdbv-toolbar-title rxdbv-mono', collectionName),
        el('div', 'rxdbv-segments', [
            el('div', 'rxdbv-segment' + (uiState.view === 'table' ? ' rxdbv-active' : ''), 'Table', {
                onClick: () => {
                    uiState.view = 'table';
                    ctx.renderContent();
                }
            }),
            el('div', 'rxdbv-segment' + (uiState.view === 'json' ? ' rxdbv-active' : ''), 'JSON', {
                onClick: () => {
                    uiState.view = 'json';
                    ctx.renderContent();
                }
            })
        ]),
        observeToggle,
        uiState.observe ? el('span', 'rxdbv-dim', 'live — the list updates as documents change', { style: 'font-size:10px' }) : null,
        el('div', 'rxdbv-flex1'),
        el('button', 'rxdbv-btn', 'Export', {
            onClick: () => {
                ctx.source.exportCollection(collectionName).then(data => {
                    downloadJson(ctx.source.databaseName + '-' + collectionName + '.json', data);
                });
            }
        })
    ]);
    screen.appendChild(toolbar);

    // query bar
    const queryInput = el('input', 'rxdbv-query-input', undefined, {
        value: uiState.queryInput,
        placeholder: '{ "field": "value" }'
    }) as HTMLInputElement;
    const inputWrap = el('div', 'rxdbv-query-input-wrap' + (uiState.parseError ? ' rxdbv-error' : ''), [
        el('span', 'rxdbv-dim', 'find'),
        queryInput,
        el('span', 'rxdbv-query-history-toggle', 'history ▾', {
            onClick: () => {
                uiState.historyOpen = !uiState.historyOpen;
                renderHistoryDropdown();
            }
        })
    ]);
    const runButton = el('button', 'rxdbv-btn-primary', 'Run') as HTMLButtonElement;
    const explainButton = el('button', 'rxdbv-btn', 'Explain', {
        title: 'Analyze this query in the Query lab',
        onClick: () => {
            applyInput();
            ctx.navigate({ view: 'querylab', collectionName });
        }
    });
    const dropdownHost = el('div');
    const querybar = el('div', 'rxdbv-querybar', [inputWrap, explainButton, runButton, dropdownHost]);
    screen.appendChild(querybar);
    const errorHost = el('div');
    screen.appendChild(errorHost);

    const applyInput = (commit = true) => {
        uiState.queryInput = queryInput.value;
        const parsed = parseViewerSelector(queryInput.value);
        if (parsed.error) {
            uiState.parseError = parsed.error;
        } else {
            uiState.parseError = null;
            if (commit) {
                uiState.appliedSelector = parsed.selector;
            }
        }
        renderQueryError();
    };

    const renderQueryError = () => {
        clearChildren(errorHost);
        inputWrap.classList.toggle('rxdbv-error', !!uiState.parseError);
        runButton.disabled = !!uiState.parseError;
        if (!uiState.parseError) {
            return;
        }
        const caretLine = ' '.repeat(Math.max(0, Math.min(uiState.parseError.position, 200)));
        const caretBlock = el('div', 'rxdbv-query-error-caret');
        caretBlock.innerHTML = escapeHtml(queryInput.value) + '\n' + caretLine + '<span class="rxdbv-caret">^</span>';
        errorHost.appendChild(el('div', 'rxdbv-query-error-block', [
            el('div', 'rxdbv-query-error-message', '✕ ' + uiState.parseError.message),
            caretBlock,
            el('div', 'rxdbv-query-error-hint', [
                'Quote strings, use lowercase ',
                el('code', '', 'true'),
                '/',
                el('code', '', 'false'),
                ', and prefix Mango operators with ',
                el('code', '', '$'),
                '. Previous results stay visible below.'
            ])
        ]));
    };

    const run = () => {
        applyInput();
        if (uiState.parseError) {
            return;
        }
        uiState.page = 0;
        uiState.selection.clear();
        rememberRecentQuery(queryInput.value.trim());
        rerun();
    };
    runButton.addEventListener('click', run);
    queryInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            run();
        } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            const name = prompt('Name of this favourite query:');
            if (name) {
                const stored = readStoredQueries();
                stored.favourites = stored.favourites
                    .filter(entry => entry.query !== queryInput.value.trim())
                    .concat([{ name, query: queryInput.value.trim() }])
                    .slice(-10);
                writeStoredQueries(stored);
            }
        }
    });
    queryInput.addEventListener('input', () => {
        // validate live so the Run button recovers as soon as the JSON is valid again
        applyInput(false);
    });
    queryInput.addEventListener('focus', () => inputWrap.classList.add('rxdbv-focus'));
    queryInput.addEventListener('blur', () => inputWrap.classList.remove('rxdbv-focus'));

    const renderHistoryDropdown = () => {
        clearChildren(dropdownHost);
        if (!uiState.historyOpen) {
            return;
        }
        const stored = readStoredQueries();
        const dropdown = el('div', 'rxdbv-query-dropdown');
        const useQuery = (query: string) => {
            queryInput.value = query;
            uiState.historyOpen = false;
            run();
        };
        if (stored.favourites.length > 0) {
            dropdown.appendChild(el('div', 'rxdbv-query-dropdown-header', 'FAVOURITES'));
            stored.favourites.forEach(fav => {
                dropdown.appendChild(el('div', 'rxdbv-query-dropdown-row', [
                    el('span', 'rxdbv-fav-star', '★'),
                    el('span', 'rxdbv-fav-name', fav.name),
                    el('span', 'rxdbv-query-text', fav.query)
                ], { onClick: () => useQuery(fav.query) }));
            });
        }
        if (stored.recent.length > 0) {
            dropdown.appendChild(el('div', 'rxdbv-query-dropdown-header', 'RECENT'));
            stored.recent.forEach(recent => {
                dropdown.appendChild(el('div', 'rxdbv-query-dropdown-row', [
                    el('span', 'rxdbv-recent-glyph', '↺'),
                    el('span', 'rxdbv-query-text', recent)
                ], { onClick: () => useQuery(recent) }));
            });
        }
        if (stored.favourites.length === 0 && stored.recent.length === 0) {
            dropdown.appendChild(el('div', 'rxdbv-query-dropdown-header', 'NO QUERIES YET'));
            dropdown.appendChild(el('div', 'rxdbv-query-dropdown-row', [
                el('span', 'rxdbv-query-text rxdbv-dim', 'Run a query to record it here')
            ]));
        }
        dropdown.appendChild(el('div', 'rxdbv-query-dropdown-footer', '↵ run · ⌘S save as favourite'));
        dropdownHost.appendChild(dropdown);
    };

    const bodyWrap = el('div', '', [resultHost, drawerHost], { style: 'flex:1;display:flex;min-height:0' });
    screen.appendChild(bodyWrap);
    screen.appendChild(footerHost);

    const renderDrawer = () => {
        clearChildren(drawerHost);
        if (uiState.drawer) {
            drawerHost.appendChild(buildDrawer(ctx, collectionName, primaryPath, uiState, rerun, renderDrawer));
        }
    };
    (uiState as any)._renderDrawer = renderDrawer;

    renderQueryError();
    rerun();
    renderDrawer();

    // live observe subscription
    if (uiState.observe && ctx.events) {
        let pending = false;
        const subscription = ctx.events.changed$.subscribe(() => {
            const latest = ctx.events && ctx.events.changes[0];
            if (!latest || latest.collectionName !== collectionName) {
                return;
            }
            uiState.freshIds.set(latest.documentId, latest.time);
            if (!pending) {
                pending = true;
                setTimeout(() => {
                    pending = false;
                    if (!ctx.destroyed) {
                        rerun();
                    }
                }, 250);
            }
        });
        ctx.setCleanup(() => subscription.unsubscribe());
    }
}

function gridTemplate(fields: string[]): string {
    const extras = fields.map((field, index) => index === 0 ? 'minmax(120px, 1fr)' : 'minmax(64px, 110px)');
    return '32px 90px ' + extras.join(' ') + ' 90px 100px';
}

function pickGridFields(docs: any[], jsonSchema: any, primaryPath: string): string[] {
    const scalarTypes = ['string', 'number', 'integer', 'boolean'];
    const fields: string[] = [];
    const declaredScalar = (name: string): boolean | null => {
        const propSchema = jsonSchema && jsonSchema.properties ? jsonSchema.properties[name] : null;
        if (!propSchema || !propSchema.type) {
            return null;
        }
        const types: string[] = Array.isArray(propSchema.type) ? propSchema.type : [propSchema.type];
        return types.some(type => scalarTypes.includes(type));
    };
    const addField = (name: string, scalar: boolean) => {
        if (
            name === primaryPath ||
            name.startsWith('_') ||
            fields.includes(name) ||
            fields.length >= 3 ||
            !scalar
        ) {
            return;
        }
        fields.push(name);
    };
    /**
     * Document key order comes first because it keeps
     * the order the app inserts fields in; schema-only
     * fields that never occurred yet follow.
     */
    docs.forEach(doc => {
        Object.entries(doc || {}).forEach(([name, value]) => {
            const scalarBySchema = declaredScalar(name);
            const type = viewerTypeOf(value);
            const scalarByValue = type === 'string' || type === 'number' || type === 'boolean';
            addField(name, scalarBySchema !== null ? scalarBySchema : scalarByValue);
        });
    });
    if (jsonSchema && jsonSchema.properties) {
        Object.keys(jsonSchema.properties).forEach(name => addField(name, declaredScalar(name) === true));
    }
    return fields;
}

function runQuery(
    ctx: ViewerContext,
    collectionName: string,
    uiState: CollectionUiState,
    resultHost: HTMLElement,
    footerHost: HTMLElement,
    primaryPath: string
) {
    const skip = uiState.page * ctx.pageSize;
    ctx.source.query(collectionName, uiState.appliedSelector, skip, ctx.pageSize).then(result => {
        if (ctx.destroyed) {
            return;
        }
        uiState.lastResult = result;
        renderResult(ctx, collectionName, uiState, resultHost, footerHost, primaryPath);
    }).catch(err => {
        clearChildren(resultHost);
        resultHost.appendChild(el('div', 'rxdbv-query-error-block', [
            el('div', 'rxdbv-query-error-message', '✕ ' + String(err && err.message ? err.message : err))
        ]));
    });
}

function renderResult(
    ctx: ViewerContext,
    collectionName: string,
    uiState: CollectionUiState,
    resultHost: HTMLElement,
    footerHost: HTMLElement,
    primaryPath: string
) {
    clearChildren(resultHost);
    clearChildren(footerHost);
    const result = uiState.lastResult;
    if (!result) {
        return;
    }
    const hasSelector = Object.keys(uiState.appliedSelector || {}).length > 0;

    if (result.docs.length === 0) {
        if (hasSelector) {
            renderNoMatches(ctx, collectionName, uiState, resultHost);
        } else {
            renderEmptyCollection(ctx, collectionName, uiState, resultHost);
        }
        return;
    }

    let docs = result.docs.slice();
    if (uiState.sortField) {
        const field = uiState.sortField;
        const direction = uiState.sortDirection;
        docs.sort((a, b) => {
            const av = field === '_updated' ? (a._meta ? a._meta.lwt : 0) : a[field];
            const bv = field === '_updated' ? (b._meta ? b._meta.lwt : 0) : b[field];
            if (av === bv) {
                return 0;
            }
            return (av < bv ? -1 : 1) * direction;
        });
    }

    if (uiState.view === 'json') {
        renderJsonView(ctx, uiState, resultHost, docs, primaryPath);
    } else {
        renderTableView(ctx, collectionName, uiState, resultHost, docs, primaryPath);
    }
    renderFooter(ctx, collectionName, uiState, footerHost, primaryPath);
}

function renderTableView(
    ctx: ViewerContext,
    collectionName: string,
    uiState: CollectionUiState,
    resultHost: HTMLElement,
    docs: any[],
    primaryPath: string
) {
    const info = ctx.source.listCollections().find(c => c.name === collectionName);
    const fields = pickGridFields(docs, info ? info.jsonSchema : null, primaryPath);
    const template = gridTemplate(fields);

    const headerCells: HTMLElement[] = [];
    headerCells.push(el('div', 'rxdbv-grid-checkbox-cell', [buildSelectAllCheckbox(ctx, uiState, docs, primaryPath)]));
    const sortableHeader = (label: string, sortKey: string) => {
        const sorted = uiState.sortField === sortKey;
        const arrow = sorted ? (uiState.sortDirection === -1 ? ' ↓' : ' ↑') : '';
        return el('div', sorted ? 'rxdbv-sorted' : '', label + arrow, {
            title: 'Sort this page by ' + label,
            onClick: () => {
                if (uiState.sortField === sortKey) {
                    uiState.sortDirection = uiState.sortDirection === -1 ? 1 : -1;
                } else {
                    uiState.sortField = sortKey;
                    uiState.sortDirection = -1;
                }
                ctx.renderContent();
            }
        });
    };
    headerCells.push(sortableHeader(primaryPath, primaryPath));
    fields.forEach(field => headerCells.push(sortableHeader(field, field)));
    headerCells.push(el('div', '', '_rev'));
    headerCells.push(sortableHeader('updated', '_updated'));

    const header = el('div', 'rxdbv-grid-header', headerCells);
    header.style.gridTemplateColumns = template;

    const scroll = el('div', 'rxdbv-grid-scroll');
    scroll.appendChild(header);

    docs.forEach(doc => {
        const id = String(doc[primaryPath]);
        const selected = uiState.selection.has(id) ||
            (uiState.drawer !== null && uiState.drawer.docId === id);
        const fresh = uiState.freshIds.has(id) && Date.now() - (uiState.freshIds.get(id) || 0) < 3000;
        const cells: HTMLElement[] = [];

        const checkbox = el('input', '', undefined, { type: 'checkbox' }) as HTMLInputElement;
        checkbox.checked = uiState.selection.has(id);
        checkbox.addEventListener('click', event => {
            event.stopPropagation();
            if (checkbox.checked) {
                uiState.selection.add(id);
            } else {
                uiState.selection.delete(id);
            }
            ctx.renderContent();
        });
        cells.push(el('div', 'rxdbv-grid-checkbox-cell', [checkbox]));
        cells.push(el('div', 'rxdbv-mono rxdbv-muted', id));

        fields.forEach(field => {
            const value = doc[field];
            const type = viewerTypeOf(value);
            const text = type === 'string' ? String(value) : JSON.stringify(value);
            const cell = el('div', type === 'string' ? '' : 'rxdbv-mono', typeof value === 'undefined' ? '' : text);
            if (type === 'boolean') {
                cell.style.color = value ? 'var(--rxdbv-success)' : 'var(--rxdbv-fg-muted)';
            }
            if (!ctx.source.readOnly && (type === 'string' || type === 'number' || type === 'boolean' || type === 'null')) {
                cell.title = 'Double-click to edit';
                cell.addEventListener('dblclick', event => {
                    event.stopPropagation();
                    startInlineEdit(ctx, collectionName, uiState, doc, field, cell, primaryPath);
                });
            }
            cells.push(cell);
        });

        cells.push(el('div', 'rxdbv-mono rxdbv-dim', shortRev(doc._rev)));
        cells.push(el('div', 'rxdbv-muted', doc._meta && doc._meta.lwt ? formatTimeAgo(doc._meta.lwt) : '—'));

        const row = el('div', 'rxdbv-grid-row' + (selected ? ' rxdbv-selected' : '') + (fresh ? ' rxdbv-fresh' : ''), cells, {
            onClick: () => {
                openDrawer(ctx, collectionName, uiState, doc, primaryPath);
            }
        });
        row.style.gridTemplateColumns = template;
        scroll.appendChild(row);
    });
    resultHost.appendChild(scroll);
}

function buildSelectAllCheckbox(
    ctx: ViewerContext,
    uiState: CollectionUiState,
    docs: any[],
    primaryPath: string
): HTMLElement {
    const checkbox = el('input', '', undefined, { type: 'checkbox' }) as HTMLInputElement;
    const allSelected = docs.length > 0 && docs.every(doc => uiState.selection.has(String(doc[primaryPath])));
    checkbox.checked = allSelected;
    checkbox.addEventListener('click', event => {
        event.stopPropagation();
        if (allSelected) {
            uiState.selection.clear();
        } else {
            docs.forEach(doc => uiState.selection.add(String(doc[primaryPath])));
        }
        ctx.renderContent();
    });
    return checkbox;
}

function startInlineEdit(
    ctx: ViewerContext,
    collectionName: string,
    uiState: CollectionUiState,
    doc: any,
    field: string,
    cell: HTMLElement,
    primaryPath: string
) {
    const currentValue = doc[field];
    const input = el('input', 'rxdbv-cell-edit-input', undefined, {
        value: typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue)
    }) as HTMLInputElement;
    clearChildren(cell);
    cell.appendChild(input);
    input.focus();
    input.select();
    input.addEventListener('click', event => event.stopPropagation());
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            openDrawer(ctx, collectionName, uiState, doc, primaryPath);
            if (uiState.drawer) {
                uiState.drawer.staged.set(field, input.value);
            }
            ctx.renderContent();
        } else if (event.key === 'Escape') {
            ctx.renderContent();
        }
    });
    input.addEventListener('blur', () => {
        if (!ctx.destroyed) {
            ctx.renderContent();
        }
    });
}

function renderJsonView(
    ctx: ViewerContext,
    uiState: CollectionUiState,
    resultHost: HTMLElement,
    docs: any[],
    primaryPath: string
) {
    const view = el('div', 'rxdbv-json-view');
    let html = '[\n';
    docs.forEach((doc, index) => {
        const id = String(doc[primaryPath]);
        const freshTime = uiState.freshIds.get(id);
        const fresh = freshTime && Date.now() - freshTime < 5000;
        const docHtml = '  ' + colorViewerJson(doc, 1).split('\n').join('\n') + (index < docs.length - 1 ? ',' : '');
        if (fresh) {
            const lines = docHtml.split('\n');
            const withNote = lines
                .map((line, lineIndex) => {
                    const note = lineIndex === 0 ? '  <span class="rxdbv-json-fresh-note">← updated ' + escapeHtml(formatTimeAgo(freshTime as number)) + '</span>' : '';
                    return '<span class="rxdbv-json-doc-fresh">' + line + note + '</span>';
                })
                .join('');
            html = html + withNote;
        } else {
            html = html + docHtml + '\n';
        }
    });
    html = html + ']';
    view.innerHTML = html;
    resultHost.appendChild(view);
}

function renderFooter(
    ctx: ViewerContext,
    collectionName: string,
    uiState: CollectionUiState,
    footerHost: HTMLElement,
    primaryPath: string
) {
    const result = uiState.lastResult;
    if (!result) {
        return;
    }
    const skip = uiState.page * ctx.pageSize;
    const rangeEnd = skip + result.docs.length;
    const totalText = result.total === null ? '—' : formatInteger(result.total);
    const selectionCount = uiState.selection.size;
    const readOnly = ctx.source.readOnly;

    const previousButton = el('button', 'rxdbv-pager', '‹', {
        onClick: () => {
            uiState.page = Math.max(0, uiState.page - 1);
            ctx.renderContent();
        }
    }) as HTMLButtonElement;
    previousButton.disabled = uiState.page === 0;
    const nextButton = el('button', 'rxdbv-pager', '›', {
        onClick: () => {
            uiState.page = uiState.page + 1;
            ctx.renderContent();
        }
    }) as HTMLButtonElement;
    nextButton.disabled = result.total !== null ? rangeEnd >= result.total : result.docs.length < ctx.pageSize;

    const footer = el('div', 'rxdbv-grid-footer', [
        el('span', '', formatInteger(skip + 1) + '–' + formatInteger(rangeEnd) + ' of ' + totalText),
        previousButton,
        nextButton,
        selectionCount > 0 ? el('span', 'rxdbv-dim', [
            formatInteger(selectionCount) + ' selected · ',
            el('a', '', 'Delete', {
                onClick: () => openDeleteModal(ctx, collectionName, uiState)
            }),
            ' · ',
            el('a', '', 'Export selection', {
                onClick: () => {
                    const result2 = uiState.lastResult;
                    if (!result2) {
                        return;
                    }
                    const docs = result2.docs.filter(doc => uiState.selection.has(String(doc[primaryPath])));
                    downloadJson(ctx.source.databaseName + '-' + collectionName + '-selection.json', docs);
                }
            })
        ]) : null,
        el('div', 'rxdbv-flex1'),
        readOnly
            ? el('button', 'rxdbv-btn-primary', '+ New document', { title: 'not available on a dump', disabled: 'true' })
            : el('button', 'rxdbv-btn-primary', '+ New document', {
                onClick: () => openNewDocumentDrawer(ctx, collectionName, uiState)
            })
    ]);
    footerHost.appendChild(footer);
}

function renderEmptyCollection(
    ctx: ViewerContext,
    collectionName: string,
    uiState: CollectionUiState,
    resultHost: HTMLElement
) {
    resultHost.appendChild(el('div', 'rxdbv-empty-state', [
        el('div', 'rxdbv-empty-inner', [
            el('div', 'rxdbv-empty-title', [
                el('span', 'rxdbv-mono', collectionName),
                ' has no documents'
            ]),
            el('div', 'rxdbv-empty-body', [
                'Create the first one here, or insert from the app with ',
                el('code', '', 'db.' + collectionName + '.insert({ … })')
            ]),
            ctx.source.readOnly ? null : el('div', 'rxdbv-empty-actions', [
                el('button', 'rxdbv-btn-primary', '+ New document', {
                    onClick: () => openNewDocumentDrawer(ctx, collectionName, uiState)
                })
            ])
        ])
    ]));
}

function renderNoMatches(
    ctx: ViewerContext,
    collectionName: string,
    uiState: CollectionUiState,
    resultHost: HTMLElement
) {
    ctx.source.count(collectionName).then(total => {
        if (ctx.destroyed) {
            return;
        }
        const selectorText = JSON.stringify(uiState.appliedSelector);
        resultHost.appendChild(el('div', 'rxdbv-empty-state', [
            el('div', 'rxdbv-empty-inner', [
                el('div', 'rxdbv-empty-title', '0 of ' + (total === null ? '?' : formatInteger(total)) + ' documents match'),
                el('div', 'rxdbv-empty-body', [
                    'Values compare case-sensitively and matching is exact — check the values in ',
                    el('code', '', selectorText),
                    '.'
                ]),
                el('div', 'rxdbv-empty-actions', [
                    el('button', 'rxdbv-btn', 'Clear query', {
                        onClick: () => {
                            uiState.queryInput = '';
                            uiState.appliedSelector = {};
                            uiState.parseError = null;
                            uiState.page = 0;
                            ctx.renderContent();
                        }
                    })
                ])
            ])
        ]));
    });
}

function openDrawer(
    ctx: ViewerContext,
    collectionName: string,
    uiState: CollectionUiState,
    doc: any,
    primaryPath: string
) {
    uiState.drawer = {
        mode: 'edit',
        docId: String(doc[primaryPath]),
        doc,
        staged: new Map(),
        expanded: new Set()
    };
    ctx.renderContent();
}

function openNewDocumentDrawer(
    ctx: ViewerContext,
    collectionName: string,
    uiState: CollectionUiState
) {
    const info = ctx.source.listCollections().find(c => c.name === collectionName);
    const template: any = {};
    if (info && info.jsonSchema && info.jsonSchema.properties) {
        Object.entries(info.jsonSchema.properties).forEach(([name, propSchema]: [string, any]) => {
            if (name.startsWith('_')) {
                return;
            }
            const type = propSchema && propSchema.type;
            if (type === 'string') {
                template[name] = '';
            } else if (type === 'number' || type === 'integer') {
                template[name] = 0;
            } else if (type === 'boolean') {
                template[name] = false;
            } else if (type === 'array') {
                template[name] = [];
            } else if (type === 'object') {
                template[name] = {};
            }
        });
    }
    uiState.drawer = {
        mode: 'new',
        doc: template,
        staged: new Map(),
        expanded: new Set()
    };
    ctx.renderContent();
}

function stagedValueToTyped(originalValue: any, rawInput: string): any {
    const originalType = viewerTypeOf(originalValue);
    if (originalType === 'string') {
        return rawInput;
    }
    try {
        return JSON.parse(rawInput);
    } catch (err) {
        return rawInput;
    }
}

function buildDrawerDocument(drawer: DrawerState): { doc: any; changedFields: string[]; } {
    const base = stripInternalFields(drawer.doc);
    const changedFields: string[] = [];
    drawer.staged.forEach((rawInput, field) => {
        const typed = stagedValueToTyped(base[field], rawInput);
        if (JSON.stringify(typed) !== JSON.stringify(base[field])) {
            base[field] = typed;
            changedFields.push(field);
        }
    });
    return { doc: base, changedFields };
}

function buildDrawer(
    ctx: ViewerContext,
    collectionName: string,
    primaryPath: string,
    uiState: CollectionUiState,
    rerun: () => void,
    renderDrawer: () => void
): HTMLElement {
    const drawer = uiState.drawer as DrawerState;
    const readOnly = ctx.source.readOnly;
    const { doc: mergedDoc, changedFields } = buildDrawerDocument(drawer);
    const edited = changedFields.length > 0 || drawer.mode === 'new';

    const container = el('div', 'rxdbv-drawer');
    container.appendChild(el('div', 'rxdbv-drawer-header', [
        el('span', 'rxdbv-mono', drawer.mode === 'new' ? 'new document' : String(drawer.docId), { style: 'font-weight:700;font-size:12px' }),
        edited ? el('span', 'rxdbv-badge-edited', drawer.mode === 'new' ? 'new' : 'edited') : null,
        el('div', 'rxdbv-flex1'),
        el('span', 'rxdbv-close', '×', {
            onClick: () => {
                uiState.drawer = null;
                ctx.renderContent();
            }
        })
    ]));

    container.appendChild(el('div', 'rxdbv-drawer-section', 'FIELDS'));
    Object.entries(mergedDoc).forEach(([field, value]) => {
        const type = viewerTypeOf(value);
        const isPrimary = field === primaryPath;
        if (type === 'object' || type === 'array') {
            const expanded = drawer.expanded.has(field);
            const row = el('div', 'rxdbv-field-row', [
                el('span', 'rxdbv-field-label rxdbv-expand-toggle', (expanded ? '▾ ' : '▸ ') + field),
                el('span', 'rxdbv-dim', type === 'array' ? 'array [' + (value as any[]).length + ']' : 'object {' + Object.keys(value as object).length + '}')
            ], {
                onClick: () => {
                    if (expanded) {
                        drawer.expanded.delete(field);
                    } else {
                        drawer.expanded.add(field);
                    }
                    renderDrawer();
                }
            });
            container.appendChild(row);
            if (expanded) {
                const entries = type === 'array'
                    ? (value as any[]).map((item, index) => [String(index), item] as [string, any])
                    : Object.entries(value as object);
                entries.slice(0, 30).forEach(([childKey, childValue]) => {
                    const childType = viewerTypeOf(childValue);
                    const text = childType === 'string' ? '"' + String(childValue) + '"' : JSON.stringify(childValue);
                    const valueSpan = el('span', childType === 'string' ? 'rxdbv-json-str' : 'rxdbv-muted', text);
                    container.appendChild(el('div', 'rxdbv-field-child', [
                        el('span', 'rxdbv-field-label', childKey),
                        valueSpan
                    ]));
                });
            }
            return;
        }
        // scalar field
        const editable = !readOnly && (!isPrimary || drawer.mode === 'new');
        if (!editable) {
            container.appendChild(el('div', 'rxdbv-field-row', [
                el('span', 'rxdbv-field-label', field),
                el('span', 'rxdbv-field-value' + (type === 'string' ? ' rxdbv-string' : ''), type === 'string' ? '"' + String(value) + '"' : String(value)),
                isPrimary ? el('span', 'rxdbv-badge-primary', 'primary') : null
            ]));
            return;
        }
        const staged = drawer.staged.has(field);
        const input = el('input', 'rxdbv-field-input' + (staged ? '' : ' rxdbv-clean'), undefined, {
            value: staged
                ? drawer.staged.get(field)
                : (type === 'string' ? String(value) : JSON.stringify(value))
        }) as HTMLInputElement;
        input.addEventListener('input', () => {
            drawer.staged.set(field, input.value);
            input.classList.remove('rxdbv-clean');
        });
        input.addEventListener('change', () => renderDrawer());
        container.appendChild(el('div', 'rxdbv-field-row', [
            el('span', 'rxdbv-field-label', field),
            input,
            staged ? el('span', 'rxdbv-modified-dot', undefined, { title: 'modified' }) : null,
            isPrimary ? el('span', 'rxdbv-badge-primary', 'primary') : null
        ]));
    });

    if (drawer.mode === 'edit') {
        container.appendChild(el('div', 'rxdbv-drawer-section rxdbv-bordered', 'INTERNALS'));
        const internals: [string, any][] = [
            ['_rev', drawer.doc._rev],
            ['_deleted', drawer.doc._deleted],
            ['_meta.lwt', drawer.doc._meta ? drawer.doc._meta.lwt : undefined]
        ];
        internals.forEach(([key, value]) => {
            if (typeof value === 'undefined') {
                return;
            }
            container.appendChild(el('div', 'rxdbv-field-row rxdbv-mono', [
                el('span', 'rxdbv-field-label', key),
                el('span', 'rxdbv-field-value', String(value)),
                key === '_meta.lwt' && typeof value === 'number'
                    ? el('span', 'rxdbv-dim', formatTimeAgo(value))
                    : null
            ]));
        });
        renderDrawerAttachments(ctx, collectionName, drawer, container);
    }

    // WILL RUN preview
    if (!readOnly) {
        container.appendChild(el('div', 'rxdbv-drawer-section rxdbv-bordered rxdbv-willrun', 'WILL RUN'));
        const code = el('div', 'rxdbv-willrun-code');
        const lines = buildViewerWillRun(
            ctx.source.databaseName,
            collectionName,
            mergedDoc,
            changedFields,
            drawer.mode === 'new' ? 'insert' : 'upsert'
        );
        code.innerHTML = '<span class="rxdbv-plain-line"><span class="rxdbv-comment">// applied on save — nothing has run yet</span></span>' +
            lines.map(line => line.changed
                ? '<span class="rxdbv-changed-line">' + escapeHtml(line.text) + '</span>'
                : '<span class="rxdbv-plain-line">' + escapeHtml(line.text) + '</span>'
            ).join('');
        container.appendChild(code);
        if (drawer.applyError) {
            container.appendChild(el('div', 'rxdbv-query-error-message', '✕ ' + drawer.applyError, { style: 'padding:4px 12px' }));
        }
        const applyButton = el('button', 'rxdbv-btn-primary', 'Apply changes', {
            onClick: () => {
                ctx.source.upsert(collectionName, mergedDoc).then(() => {
                    ctx.viewerWriteTimes.push(Date.now());
                    if (drawer.mode === 'new') {
                        uiState.drawer = null;
                    } else {
                        drawer.staged.clear();
                        drawer.applyError = undefined;
                    }
                    rerun();
                    ctx.renderContent();
                }).catch(err => {
                    drawer.applyError = String(err && err.message ? err.message : err);
                    renderDrawer();
                });
            }
        }) as HTMLButtonElement;
        applyButton.disabled = !edited;
        container.appendChild(el('div', 'rxdbv-drawer-actions', [
            applyButton,
            el('button', 'rxdbv-btn', 'Discard', {
                onClick: () => {
                    if (drawer.mode === 'new') {
                        uiState.drawer = null;
                        ctx.renderContent();
                    } else {
                        drawer.staged.clear();
                        drawer.applyError = undefined;
                        renderDrawer();
                    }
                }
            })
        ]));
    }
    return container;
}

function renderDrawerAttachments(
    ctx: ViewerContext,
    collectionName: string,
    drawer: DrawerState,
    container: HTMLElement
) {
    const database = ctx.source.rawDatabase;
    if (!database || !drawer.docId) {
        return;
    }
    const collection = (database.collections as any)[collectionName];
    if (!collection) {
        return;
    }
    collection.findOne(drawer.docId).exec().then((rxDocument: any) => {
        if (!rxDocument || typeof rxDocument.allAttachments !== 'function' || ctx.destroyed) {
            return;
        }
        let attachments: any[] = [];
        try {
            attachments = rxDocument.allAttachments();
        } catch (err) {
            return;
        }
        if (attachments.length === 0) {
            return;
        }
        container.appendChild(el('div', 'rxdbv-drawer-section rxdbv-bordered', 'ATTACHMENTS · ' + attachments.length));
        attachments.forEach(attachment => {
            const box = el('div', 'rxdbv-attachment-box');
            box.appendChild(el('div', 'rxdbv-attachment-row', [
                el('span', 'rxdbv-mono', attachment.id),
                el('span', 'rxdbv-dim', (attachment.type || '?') + ' · ' + Math.round((attachment.length || 0) / 1024) + ' KB'),
                el('div', 'rxdbv-flex1'),
                el('a', '', 'download', {
                    style: 'font-size:10px',
                    onClick: () => {
                        attachment.getData().then((blobData: Blob) => {
                            const url = URL.createObjectURL(blobData);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = attachment.id;
                            link.click();
                            setTimeout(() => URL.revokeObjectURL(url), 1000);
                        });
                    }
                })
            ]));
            if (attachment.type && String(attachment.type).startsWith('image/')) {
                const preview = el('div', 'rxdbv-attachment-preview');
                attachment.getData().then((blobData: Blob) => {
                    const url = URL.createObjectURL(blobData);
                    const image = document.createElement('img');
                    image.src = url;
                    image.alt = attachment.id;
                    preview.appendChild(image);
                });
                box.appendChild(preview);
            }
            container.appendChild(box);
        });
    });
}

function openDeleteModal(
    ctx: ViewerContext,
    collectionName: string,
    uiState: CollectionUiState
) {
    const count = uiState.selection.size;
    const total = uiState.lastResult && uiState.lastResult.total !== null
        ? formatInteger(uiState.lastResult.total)
        : '?';
    const hasReplication = !!ctx.events && ctx.events.replications.some(r => r.collectionName === collectionName);

    const input = el('input', 'rxdbv-modal-input', undefined, {
        placeholder: collectionName
    }) as HTMLInputElement;
    const deleteButton = el('button', 'rxdbv-btn-danger-solid', 'Delete ' + formatInteger(count) + ' documents') as HTMLButtonElement;
    deleteButton.disabled = true;
    deleteButton.title = 'enabled after typing the collection name';
    input.addEventListener('input', () => {
        deleteButton.disabled = input.value !== collectionName;
    });

    const backdrop = el('div', 'rxdbv-modal-backdrop');
    const close = () => backdrop.remove();
    deleteButton.addEventListener('click', () => {
        ctx.source.removeByIds(collectionName, Array.from(uiState.selection)).then(() => {
            uiState.selection.clear();
            ctx.viewerWriteTimes.push(Date.now());
            close();
            ctx.renderContent();
        }).catch(err => {
            close();
            alert('Delete failed: ' + String(err && err.message ? err.message : err));
        });
    });

    backdrop.appendChild(el('div', 'rxdbv-modal', [
        el('div', 'rxdbv-modal-title', 'Delete ' + formatInteger(count) + ' documents?'),
        el('div', 'rxdbv-modal-body', [
            'This removes ' + formatInteger(count) + ' selected of ' + total + ' documents in ',
            el('code', '', collectionName),
            '. ',
            hasReplication ? 'Deletes replicate to all connected peers. ' : '',
            'Tombstones remain until cleanup.'
        ]),
        el('div', 'rxdbv-modal-confirm-label', 'Type the collection name to confirm:'),
        input,
        el('div', 'rxdbv-modal-actions', [
            el('button', 'rxdbv-btn', 'Cancel', { onClick: close }),
            deleteButton
        ])
    ]));
    backdrop.addEventListener('click', event => {
        if (event.target === backdrop) {
            close();
        }
    });
    ctx.root.appendChild(backdrop);
    input.focus();
}
