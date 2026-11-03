import { stripInternalFields } from '../../src/plugins/dbviewer/dbviewer-data.ts';
import {
    buildViewerWillRun,
    escapeHtml,
    colorViewerJson,
    formatInteger,
    formatTimeAgo,
    parseViewerSelector,
    shortRev,
    viewerTypeOf
} from '../../src/plugins/dbviewer/dbviewer-helpers.ts';
import type { ViewerSortPart } from '../../src/plugins/dbviewer/dbviewer-helpers.ts';
import type { PageContext } from './context.ts';
import {
    base64ToBlob,
    buildTabs,
    DBVIEWER_ICON_ARROW_LEFT,
    DBVIEWER_ICON_ARROW_RIGHT,
    DBVIEWER_ICON_CLOSE,
    clearChildren,
    downloadJson,
    el,
    withCopyButton
} from './dom.ts';
import { showViewerError } from './error.ts';

/**
 * A collection is read-only on a dump and when the host marks
 * it view-only (internal store, local documents, RxState).
 */
function isReadOnlyCollection(ctx: PageContext, collectionName: string): boolean {
    if (ctx.source.readOnly) {
        return true;
    }
    const info = ctx.source.listCollections().find(collectionInfo => collectionInfo.name === collectionName);
    return !!(info && info.viewOnly);
}

function readOnlyReason(ctx: PageContext): string {
    return ctx.source.readOnly ? 'not available on a dump' : 'view-only collection';
}

const HISTORY_STORAGE_KEY = 'rxdb-dbviewer-queries';

type DrawerState = {
    mode: 'edit' | 'new';
    docId?: string;
    doc: any;
    staged: Map<string, string>;
    expanded: Set<string>;
    jsonMode: boolean;
    jsonDraft: string | null;
};

type CollectionUiState = {
    view: 'table' | 'json';
    queryInput: string;
    appliedSelector: any;
    parseError: { message: string; position: number; } | null;
    page: number;
    limit: number;
    skip: number;
    selection: Set<string>;
    observe: boolean;
    drawer: DrawerState | null;
    freshIds: Map<string, number>;
    lastResult: { docs: any[]; total: number | null; } | null;
    sortInput: string;
    allMatching: boolean;
    historyOpen: boolean;
};

function getUiState(ctx: PageContext, collectionName: string): CollectionUiState {
    let state = ctx.collectionState.get(collectionName);
    if (!state) {
        state = {
            view: 'table',
            queryInput: '',
            appliedSelector: {},
            parseError: null,
            page: 0,
            limit: 20,
            skip: 0,
            selection: new Set(),
            observe: ctx.source.kind === 'live',
            drawer: null,
            freshIds: new Map(),
            lastResult: null,
            sortInput: '',
            allMatching: false,
            historyOpen: false
        } as CollectionUiState;
        ctx.collectionState.set(collectionName, state);
    }
    return state;
}

/**
 * Parses the sort input of the query bar. Accepts '-field' for
 * descending, 'field desc' / 'field asc', and several fields
 * separated by comma, like '-power, name'.
 */
export function parseViewerSortInput(text: string): { sort: ViewerSortPart[] | undefined; error: string | null; } {
    const trimmed = (text || '').trim();
    if (!trimmed) {
        return { sort: undefined, error: null };
    }
    const parts: ViewerSortPart[] = [];
    for (const raw of trimmed.split(',')) {
        const token = raw.trim();
        if (!token) {
            continue;
        }
        let field = token;
        let direction: 'asc' | 'desc' = 'asc';
        if (field.startsWith('-')) {
            field = field.slice(1).trim();
            direction = 'desc';
        } else {
            const words = field.split(/\s+/);
            if (words.length === 2) {
                field = words[0];
                const dir = words[1].toLowerCase();
                if (dir === 'desc') {
                    direction = 'desc';
                } else if (dir !== 'asc') {
                    return { sort: undefined, error: 'invalid direction: ' + words[1] };
                }
            } else if (words.length > 2) {
                return { sort: undefined, error: 'invalid sort: ' + token };
            }
        }
        if (!field) {
            return { sort: undefined, error: 'invalid sort: ' + token };
        }
        parts.push({ [field]: direction });
    }
    return { sort: parts.length > 0 ? parts : undefined, error: null };
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

export function renderCollectionScreen(ctx: PageContext) {
    const collectionName = ctx.currentCollectionName();
    if (!collectionName) {
        return;
    }
    const uiState = getUiState(ctx, collectionName);
    const host = ctx.contentHost;
    const info = ctx.source.listCollections().find(c => c.name === collectionName);
    const primaryPath = info ? info.primaryPath : 'id';
    const readOnly = isReadOnlyCollection(ctx, collectionName);

    const screen = el('div', 'rxdbv-content', undefined, { style: 'position:relative' });
    host.appendChild(screen);

    const resultHost = el('div', 'rxdbv-content', undefined, { style: 'flex:1;min-height:0;display:flex;flex-direction:column' });
    const footerHost = el('div');
    const drawerHost = el('div');

    const rerun = () => {
        runQuery(ctx, collectionName, uiState, resultHost, footerHost, primaryPath);
    };

    // toolbar row 1
    const observeToggle = el('button', 'rxdbv-btn rxdbv-observe' +
        (uiState.observe ? ' rxdbv-active' : '') +
        (readOnly ? ' rxdbv-disabled' : ''), [
        el('span', 'rxdbv-observe-dot'),
        'Live'
    ], {
        title: readOnly ? readOnlyReason(ctx) : (
            uiState.observe ?
                'live — the list updates as documents change' :
                'Update the current result live as documents change'
        ),
        onClick: () => {
            if (readOnly) {
                return;
            }
            uiState.observe = !uiState.observe;
            ctx.renderContent();
        }
    });
    // query bar
    const queryInput = el('input', 'rxdbv-query-input', undefined, {
        value: uiState.queryInput,
        placeholder: '{ "field": "value" }'
    }) as HTMLInputElement;
    const historyButton = el('button', 'rxdbv-btn', 'History ▾', {
        title: 'Show favourite and recent queries',
        onClick: () => {
            uiState.historyOpen = !uiState.historyOpen;
            renderHistoryDropdown();
        }
    });
    const inputWrap = el('div', 'rxdbv-input rxdbv-query-input-wrap' + (uiState.parseError ? ' rxdbv-error' : ''), [
        el('span', 'rxdbv-dim', 'find'),
        queryInput
    ]);
    const buildNumberInput = (label: string, value: number, min: number, apply: (parsed: number) => void) => {
        const numberInput = el('input', 'rxdbv-query-input', undefined, {
            value: String(value),
            inputmode: 'numeric'
        }) as HTMLInputElement;
        const commit = () => {
            let parsed = parseInt(numberInput.value, 10);
            if (isNaN(parsed) || parsed < min) {
                parsed = min;
            }
            numberInput.value = String(parsed);
            apply(parsed);
            uiState.page = 0;
            rerun();
        };
        numberInput.addEventListener('change', commit);
        numberInput.addEventListener('keydown', event => {
            if ((event as KeyboardEvent).key === 'Enter') {
                commit();
            }
        });
        return el('div', 'rxdbv-input rxdbv-num-input-wrap', [
            el('span', 'rxdbv-dim', label),
            numberInput
        ], { title: label + ' for the query' });
    };
    const limitWrap = buildNumberInput('limit', uiState.limit, 1, parsed => {
        uiState.limit = parsed;
    });
    const skipWrap = buildNumberInput('skip', uiState.skip, 0, parsed => {
        uiState.skip = parsed;
    });
    const sortableFields: string[] = (() => {
        const list: string[] = [primaryPath];
        if (info && info.jsonSchema && info.jsonSchema.properties) {
            Object.entries(info.jsonSchema.properties).forEach(([name, propSchema]: [string, any]) => {
                const type = propSchema && propSchema.type;
                if (!name.startsWith('_') && name !== primaryPath &&
                    (type === 'string' || type === 'number' || type === 'integer' || type === 'boolean')) {
                    list.push(name);
                }
            });
        }
        list.push('_meta.lwt');
        return list;
    })();
    const currentSort = parseViewerSortInput(uiState.sortInput);
    const currentSortPart = currentSort.sort && currentSort.sort.length > 0 ? currentSort.sort[0] : null;
    const currentSortField = currentSortPart ? Object.keys(currentSortPart)[0] : null;
    const currentSortDirection: 'asc' | 'desc' = currentSortPart && currentSortField ? currentSortPart[currentSortField] : 'asc';
    if (currentSortField && !sortableFields.includes(currentSortField)) {
        sortableFields.push(currentSortField);
    }
    const applySort = (field: string | null, direction: 'asc' | 'desc') => {
        uiState.sortInput = field ? (direction === 'desc' ? '-' : '') + field : '';
        uiState.page = 0;
        ctx.renderContent();
    };
    const sortDropdownHost = el('div');
    let sortOpen = false;
    const renderSortDropdown = () => {
        clearChildren(sortDropdownHost);
        if (!sortOpen) {
            return;
        }
        const dropdown = el('div', 'rxdbv-sort-dropdown');
        const addRow = (field: string | null, direction: 'asc' | 'desc') => {
            const active = field === null
                ? currentSortField === null
                : field === currentSortField && direction === currentSortDirection;
            dropdown.appendChild(el('div', 'rxdbv-query-dropdown-row' + (active ? ' rxdbv-active' : ''), [
                el('span', 'rxdbv-mono rxdbv-flex1', field === null ? 'none' : field),
                field === null ? null : el('span', 'rxdbv-dim', direction)
            ], {
                onClick: () => applySort(field, direction)
            }));
        };
        addRow(null, 'asc');
        sortableFields.forEach(field => {
            addRow(field, 'asc');
            addRow(field, 'desc');
        });
        sortDropdownHost.appendChild(dropdown);
    };
    const sortFieldButton = el('button', 'rxdbv-sort-field', (currentSortField || 'none') + ' ▾', {
        title: 'Field the query is sorted by',
        onClick: () => {
            sortOpen = !sortOpen;
            renderSortDropdown();
        }
    });
    const sortDirButton = el('button', 'rxdbv-sort-dir', currentSortDirection, {
        title: 'Sort direction, click to flip',
        onClick: () => {
            if (currentSortField) {
                applySort(currentSortField, currentSortDirection === 'asc' ? 'desc' : 'asc');
            }
        }
    }) as HTMLButtonElement;
    sortDirButton.disabled = !currentSortField;
    const sortWrap = el('div', 'rxdbv-input rxdbv-sort-input-wrap', [
        el('span', 'rxdbv-dim', 'sort'),
        sortFieldButton,
        sortDirButton,
        sortDropdownHost
    ]);
    const runButton = el('button', 'rxdbv-btn-primary', 'Run') as HTMLButtonElement;
    const explainButton = el('button', 'rxdbv-btn', 'Explain', {
        title: 'Explain this query: used index, execution plan and findings',
        onClick: () => {
            applyInput();
            ctx.navigate({ view: 'explain', collectionName });
        }
    });
    const dropdownHost = el('div');
    const querybar = el('div', 'rxdbv-querybar', [historyButton, inputWrap, limitWrap, skipWrap, sortWrap, explainButton, runButton, dropdownHost]);
    screen.appendChild(querybar);
    const errorHost = el('div');
    screen.appendChild(errorHost);
    screen.appendChild(el('div', 'rxdbv-tabs-row', [
        buildTabs([
            { value: 'table', label: 'Table' },
            { value: 'json', label: 'JSON' }
        ], uiState.view, view => {
            uiState.view = view;
            ctx.renderContent();
        }),
        el('div', 'rxdbv-flex1'),
        observeToggle
    ]));

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
        uiState.allMatching = false;
        rememberRecentQuery(queryInput.value.trim());
        rerun();
    };
    runButton.addEventListener('click', run);
    queryInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            run();
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
        dropdown.appendChild(el('div', 'rxdbv-query-dropdown-footer', [
            el('a', '', '☆ Save current query as favourite', {
                onClick: () => {
                    const name = prompt('Name of this favourite query:');
                    if (name) {
                        const storedNow = readStoredQueries();
                        storedNow.favourites = storedNow.favourites
                            .filter(entry => entry.query !== queryInput.value.trim())
                            .concat([{ name, query: queryInput.value.trim() }])
                            .slice(-10);
                        writeStoredQueries(storedNow);
                        renderHistoryDropdown();
                    }
                }
            })
        ]));
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
    ctx: PageContext,
    collectionName: string,
    uiState: CollectionUiState,
    resultHost: HTMLElement,
    footerHost: HTMLElement,
    primaryPath: string
) {
    const skip = uiState.skip + uiState.page * uiState.limit;
    const parsedSort = parseViewerSortInput(uiState.sortInput);
    ctx.source.query(collectionName, uiState.appliedSelector, skip, uiState.limit, parsedSort.sort).then(result => {
        if (ctx.destroyed) {
            return;
        }
        uiState.lastResult = result;
        renderResult(ctx, collectionName, uiState, resultHost, footerHost, primaryPath);
    }).catch(err => {
        showViewerError(ctx.root, 'Query failed', err);
    });
}

function renderResult(
    ctx: PageContext,
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

    const docs = result.docs.slice();

    if (uiState.view === 'json') {
        renderJsonView(ctx, uiState, resultHost, docs, primaryPath);
    } else {
        renderTableView(ctx, collectionName, uiState, resultHost, docs, primaryPath);
    }
    renderFooter(ctx, collectionName, uiState, footerHost, primaryPath);
}

function renderTableView(
    ctx: PageContext,
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
    const parsedSort = parseViewerSortInput(uiState.sortInput);
    const firstSort = parsedSort.sort && parsedSort.sort.length > 0 ? parsedSort.sort[0] : null;
    const firstSortField = firstSort ? Object.keys(firstSort)[0] : null;
    const firstSortDirection = firstSort && firstSortField ? firstSort[firstSortField] : null;
    const sortableHeader = (label: string, sortKey: string) => {
        const sorted = firstSortField === sortKey;
        const cell: (string | HTMLElement)[] = [label];
        if (sorted) {
            cell.push(el('span', 'rxdbv-sort-arrow', firstSortDirection === 'desc' ? '▼' : '▲'));
        }
        return el('div', 'rxdbv-sortable' + (sorted ? ' rxdbv-sorted' : ''), cell, {
            title: 'Sort by ' + label,
            onClick: () => {
                const descending = !sorted || firstSortDirection === 'asc';
                uiState.sortInput = (descending ? '-' : '') + sortKey;
                uiState.page = 0;
                ctx.renderContent();
            }
        });
    };
    headerCells.push(sortableHeader(primaryPath, primaryPath));
    fields.forEach(field => headerCells.push(sortableHeader(field, field)));
    headerCells.push(el('div', '', '_rev'));
    headerCells.push(sortableHeader('updated', '_meta.lwt'));

    const header = el('div', 'rxdbv-grid-header', headerCells);
    header.style.gridTemplateColumns = template;

    const scroll = el('div', 'rxdbv-grid-scroll');
    scroll.appendChild(header);

    const buildRow = (doc: any): HTMLElement => {
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
                uiState.allMatching = false;
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
            if (!isReadOnlyCollection(ctx, collectionName) && (type === 'string' || type === 'number' || type === 'boolean' || type === 'null')) {
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
        return row;
    };

    /**
     * The rows are windowed: only the visible slice plus an
     * overscan exists in the DOM, so a limit of 10k documents
     * does not create 10k rows.
     */
    const ROW_HEIGHT = 24;
    const OVERSCAN = 10;
    const rowsHost = el('div', 'rxdbv-grid-virtual');
    rowsHost.style.height = (docs.length * ROW_HEIGHT) + 'px';
    scroll.appendChild(rowsHost);
    let renderedFrom = -1;
    let renderedTo = -1;
    const renderWindow = () => {
        const viewTop = scroll.scrollTop;
        const viewHeight = scroll.clientHeight || 800;
        const from = Math.max(0, Math.floor(viewTop / ROW_HEIGHT) - OVERSCAN);
        const to = Math.min(docs.length, Math.ceil((viewTop + viewHeight) / ROW_HEIGHT) + OVERSCAN);
        if (from === renderedFrom && to === renderedTo) {
            return;
        }
        renderedFrom = from;
        renderedTo = to;
        clearChildren(rowsHost);
        for (let index = from; index < to; index++) {
            const row = buildRow(docs[index]);
            row.style.position = 'absolute';
            row.style.top = (index * ROW_HEIGHT) + 'px';
            row.style.left = '0';
            row.style.right = '0';
            rowsHost.appendChild(row);
        }
    };
    scroll.addEventListener('scroll', renderWindow);
    renderWindow();
    setTimeout(() => {
        if (!ctx.destroyed) {
            renderWindow();
        }
    }, 0);
    resultHost.appendChild(scroll);
}

function buildSelectAllCheckbox(
    ctx: PageContext,
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
            uiState.allMatching = false;
        } else {
            docs.forEach(doc => uiState.selection.add(String(doc[primaryPath])));
        }
        ctx.renderContent();
    });
    return checkbox;
}

function startInlineEdit(
    ctx: PageContext,
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
    ctx: PageContext,
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
    resultHost.appendChild(withCopyButton(view, () => JSON.stringify(docs, null, 2)));
}

function renderFooter(
    ctx: PageContext,
    collectionName: string,
    uiState: CollectionUiState,
    footerHost: HTMLElement,
    primaryPath: string
) {
    const result = uiState.lastResult;
    if (!result) {
        return;
    }
    const skip = uiState.skip + uiState.page * uiState.limit;
    const rangeEnd = skip + result.docs.length;
    const totalText = result.total === null ? '—' : formatInteger(result.total);
    const selectionCount = uiState.allMatching && result.total !== null ? result.total : uiState.selection.size;
    const readOnly = isReadOnlyCollection(ctx, collectionName);
    const pageFullySelected = result.docs.length > 0 &&
        result.docs.every(doc => uiState.selection.has(String(doc[primaryPath])));
    const offerAllMatching = !uiState.allMatching &&
        pageFullySelected &&
        result.total !== null &&
        result.total > uiState.selection.size;

    const previousButton = el('button', 'rxdbv-pager', undefined, {
        html: DBVIEWER_ICON_ARROW_LEFT,
        onClick: () => {
            uiState.page = Math.max(0, uiState.page - 1);
            ctx.renderContent();
        }
    }) as HTMLButtonElement;
    previousButton.disabled = uiState.page === 0;
    const nextButton = el('button', 'rxdbv-pager', undefined, {
        html: DBVIEWER_ICON_ARROW_RIGHT,
        onClick: () => {
            uiState.page = uiState.page + 1;
            ctx.renderContent();
        }
    }) as HTMLButtonElement;
    nextButton.disabled = result.total !== null ? rangeEnd >= result.total : result.docs.length < uiState.limit;

    const footer = el('div', 'rxdbv-grid-footer', [
        el('span', '', formatInteger(skip + 1) + '–' + formatInteger(rangeEnd) + ' of ' + totalText),
        previousButton,
        nextButton,
        selectionCount > 0 ? el('span', 'rxdbv-selection-actions', [
            el('span', 'rxdbv-dim', formatInteger(selectionCount) + ' selected' + (uiState.allMatching ? ' (all matching)' : '')),
            offerAllMatching ? el('button', 'rxdbv-btn rxdbv-btn-small', 'Select all ' + formatInteger(result.total as number) + ' matching', {
                onClick: () => {
                    uiState.allMatching = true;
                    ctx.renderContent();
                }
            }) : null,
            el('button', 'rxdbv-btn rxdbv-btn-small', 'Delete', {
                onClick: () => openDeleteModal(ctx, collectionName, uiState)
            }),
            el('button', 'rxdbv-btn rxdbv-btn-small', 'Export selection', {
                onClick: () => {
                    if (uiState.allMatching) {
                        queryAllMatching(ctx, collectionName, uiState).then(matchingDocs => {
                            downloadJson(ctx.source.databaseName + '-' + collectionName + '-selection.json', matchingDocs);
                        }).catch(err => showViewerError(ctx.root, 'Export failed', err));
                        return;
                    }
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
            ? el('button', 'rxdbv-btn-primary', '+ New document', { title: readOnlyReason(ctx), disabled: 'true' })
            : el('button', 'rxdbv-btn-primary', '+ New document', {
                onClick: () => openNewDocumentDrawer(ctx, collectionName, uiState)
            })
    ]);
    footerHost.appendChild(footer);
}

function renderEmptyCollection(
    ctx: PageContext,
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
            isReadOnlyCollection(ctx, collectionName) ? null : el('div', 'rxdbv-empty-actions', [
                el('button', 'rxdbv-btn-primary', '+ New document', {
                    onClick: () => openNewDocumentDrawer(ctx, collectionName, uiState)
                })
            ])
        ])
    ]));
}

function renderNoMatches(
    ctx: PageContext,
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
    ctx: PageContext,
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
        expanded: new Set(),
        jsonMode: false,
        jsonDraft: null
    };
    ctx.renderContent();
}

function openNewDocumentDrawer(
    ctx: PageContext,
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
        expanded: new Set(),
        jsonMode: false,
        jsonDraft: null
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
    ctx: PageContext,
    collectionName: string,
    primaryPath: string,
    uiState: CollectionUiState,
    rerun: () => void,
    renderDrawer: () => void
): HTMLElement {
    const drawer = uiState.drawer as DrawerState;
    const readOnly = isReadOnlyCollection(ctx, collectionName);
    const collectionInfo = ctx.source.listCollections().find(c => c.name === collectionName);
    const schemaProperties: { [field: string]: any; } = (collectionInfo && collectionInfo.jsonSchema && collectionInfo.jsonSchema.properties) || {};
    const { doc: mergedDoc, changedFields } = buildDrawerDocument(drawer);
    const edited = changedFields.length > 0 || drawer.mode === 'new';

    /**
     * Typing must enable the Apply button and refresh the
     * WILL RUN preview on every keystroke, without re-rendering
     * the drawer (a re-render would steal the input focus).
     */
    let updatePreview: () => void = () => { };
    const fieldDots = new Map<string, HTMLElement>();

    const container = el('div', 'rxdbv-drawer');
    const editedBadge = el('span', 'rxdbv-badge-edited', drawer.mode === 'new' ? 'new' : 'edited');
    editedBadge.style.display = edited ? '' : 'none';
    container.appendChild(el('div', 'rxdbv-drawer-header', [
        el('span', 'rxdbv-mono', drawer.mode === 'new' ? 'new document' : String(drawer.docId), { style: 'font-weight:700;font-size:12px' }),
        editedBadge,
        el('div', 'rxdbv-flex1'),
        el('span', 'rxdbv-close', undefined, {
            html: DBVIEWER_ICON_CLOSE,
            onClick: () => {
                uiState.drawer = null;
                ctx.renderContent();
            }
        })
    ]));

    const DRAWER_INTERNAL_FIELDS = ['_rev', '_meta', '_attachments', '_deleted'];
    const stripDrawerInternals = (doc: any): any => {
        const result: any = {};
        Object.keys(doc || {}).forEach(key => {
            if (!DRAWER_INTERNAL_FIELDS.includes(key)) {
                result[key] = doc[key];
            }
        });
        return result;
    };

    if (!readOnly) {
        container.appendChild(el('div', 'rxdbv-drawer-tabs', [
            buildTabs([
                { value: 'fields', label: 'Fields' },
                { value: 'json', label: 'JSON' }
            ], drawer.jsonMode ? 'json' : 'fields', mode => {
                drawer.jsonMode = mode === 'json';
                if (drawer.jsonMode && drawer.jsonDraft === null) {
                    const { doc: seedDoc } = buildDrawerDocument(drawer);
                    drawer.jsonDraft = JSON.stringify(stripDrawerInternals(seedDoc), null, 2);
                }
                renderDrawer();
            })
        ]));
    }

    if (!readOnly && drawer.jsonMode) {
        const textarea = el('textarea', 'rxdbv-json-edit') as HTMLTextAreaElement;
        textarea.value = drawer.jsonDraft || '';
        textarea.spellcheck = false;
        const errorLine = el('div', 'rxdbv-json-edit-error');
        const originalDoc = stripDrawerInternals(drawer.doc);

        const validateJsonDraft = (): { doc: any; changed: string[]; error: string | null; } => {
            let parsed: any;
            try {
                parsed = JSON.parse(textarea.value);
            } catch (err: any) {
                return { doc: null, changed: [], error: 'invalid JSON: ' + err.message };
            }
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return { doc: null, changed: [], error: 'the document must be a JSON object' };
            }
            parsed = stripDrawerInternals(parsed);
            if (drawer.mode === 'edit') {
                if (String(parsed[primaryPath]) !== String(originalDoc[primaryPath])) {
                    return { doc: null, changed: [], error: 'the primary key (' + primaryPath + ') cannot be changed' };
                }
                const keys = Array.from(new Set(Object.keys(originalDoc).concat(Object.keys(parsed))));
                const changed = keys.filter(key => JSON.stringify(originalDoc[key]) !== JSON.stringify(parsed[key]));
                return { doc: parsed, changed, error: null };
            }
            if (typeof parsed[primaryPath] === 'undefined' || parsed[primaryPath] === '') {
                return { doc: null, changed: [], error: 'the primary key (' + primaryPath + ') is required' };
            }
            return { doc: parsed, changed: Object.keys(parsed), error: null };
        };

        const code = el('div', 'rxdbv-willrun-code');
        const renderJsonWillRun = (currentDoc: any, currentChangedFields: string[]) => {
            const lines = buildViewerWillRun(
                ctx.source.databaseName,
                collectionName,
                currentDoc,
                currentChangedFields,
                drawer.mode === 'new' ? 'insert' : 'patch',
                drawer.docId
            );
            code.innerHTML = '<span class="rxdbv-plain-line"><span class="rxdbv-comment">// applied on save — nothing has run yet</span></span>' +
                lines.map(line => line.changed
                    ? '<span class="rxdbv-changed-line">' + escapeHtml(line.text) + '</span>'
                    : '<span class="rxdbv-plain-line">' + escapeHtml(line.text) + '</span>'
                ).join('');
        };

        const applyJsonButton = el('button', 'rxdbv-btn-primary', 'Apply changes') as HTMLButtonElement;
        const refreshJsonState = () => {
            drawer.jsonDraft = textarea.value;
            const validated = validateJsonDraft();
            errorLine.textContent = validated.error ? '✕ ' + validated.error : '';
            const currentlyEdited = validated.changed.length > 0 || drawer.mode === 'new';
            applyJsonButton.disabled = !!validated.error || !currentlyEdited;
            editedBadge.style.display = !validated.error && currentlyEdited ? '' : 'none';
            if (!validated.error) {
                renderJsonWillRun(validated.doc, validated.changed);
            }
        };
        textarea.addEventListener('input', refreshJsonState);

        applyJsonButton.addEventListener('click', () => {
            const validated = validateJsonDraft();
            if (validated.error || (validated.changed.length === 0 && drawer.mode !== 'new')) {
                return;
            }
            const changedOnly: any = {};
            validated.changed.forEach(field => {
                changedOnly[field] = validated.doc[field];
            });
            const write = drawer.mode === 'new'
                ? ctx.source.insert(collectionName, validated.doc)
                : ctx.source.update(collectionName, drawer.docId as string, changedOnly);
            write.then(() => {
                ctx.viewerWriteTimes.push(Date.now());
                if (drawer.mode === 'new') {
                    uiState.drawer = null;
                    rerun();
                    ctx.renderContent();
                    return;
                }
                return ctx.source.getById(collectionName, drawer.docId as string).then(freshDoc => {
                    if (freshDoc) {
                        drawer.doc = freshDoc;
                    }
                    drawer.staged.clear();
                    drawer.jsonDraft = null;
                    drawer.jsonDraft = JSON.stringify(stripDrawerInternals(drawer.doc), null, 2);
                    rerun();
                    ctx.renderContent();
                });
            }).catch(err => {
                showViewerError(ctx.root, drawer.mode === 'new' ? 'Insert failed' : 'Update failed', err);
            });
        });

        container.appendChild(el('div', '', [textarea, errorLine], { style: 'padding:10px 12px 0' }));
        container.appendChild(el('div', 'rxdbv-drawer-section rxdbv-bordered rxdbv-willrun', 'WILL RUN'));
        container.appendChild(code);
        container.appendChild(el('div', 'rxdbv-drawer-actions', [
            applyJsonButton,
            el('button', 'rxdbv-btn', 'Discard', {
                onClick: () => {
                    if (drawer.mode === 'new') {
                        uiState.drawer = null;
                        ctx.renderContent();
                    } else {
                        drawer.jsonDraft = JSON.stringify(stripDrawerInternals(drawer.doc), null, 2);
                        drawer.staged.clear();
                        renderDrawer();
                    }
                }
            })
        ]));
        refreshJsonState();
        return container;
    }

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
        const currentValue = staged
            ? drawer.staged.get(field) as string
            : (type === 'string' ? String(value) : JSON.stringify(value));
        const fieldSchema = schemaProperties[field];
        const enumValues: any[] | null = fieldSchema && Array.isArray(fieldSchema.enum) ? fieldSchema.enum : null;
        let input: HTMLInputElement | HTMLSelectElement;
        if (enumValues) {
            // an enum field is edited through a select with the allowed values
            const select = el('select', 'rxdbv-field-input rxdbv-field-select' + (staged ? '' : ' rxdbv-clean')) as HTMLSelectElement;
            const optionStrings = enumValues.map(entry => typeof entry === 'string' ? entry : JSON.stringify(entry));
            if (!optionStrings.includes(currentValue)) {
                optionStrings.unshift(currentValue);
            }
            optionStrings.forEach(option => {
                const optionEl = document.createElement('option');
                optionEl.value = option;
                optionEl.textContent = option;
                select.appendChild(optionEl);
            });
            select.value = currentValue;
            select.addEventListener('change', () => {
                drawer.staged.set(field, select.value);
                select.classList.remove('rxdbv-clean');
                updatePreview();
            });
            input = select;
        } else {
            const textInput = el('input', 'rxdbv-field-input' + (staged ? '' : ' rxdbv-clean'), undefined, {
                value: currentValue
            }) as HTMLInputElement;
            textInput.addEventListener('input', () => {
                drawer.staged.set(field, textInput.value);
                textInput.classList.remove('rxdbv-clean');
                updatePreview();
            });
            input = textInput;
        }
        const modifiedDot = el('span', 'rxdbv-modified-dot', undefined, { title: 'modified' });
        modifiedDot.style.display = staged ? '' : 'none';
        fieldDots.set(field, modifiedDot);
        container.appendChild(el('div', 'rxdbv-field-row', [
            el('span', 'rxdbv-field-label', field),
            input,
            modifiedDot,
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
        const renderWillRunContent = (currentDoc: any, currentChangedFields: string[]) => {
            const lines = buildViewerWillRun(
                ctx.source.databaseName,
                collectionName,
                currentDoc,
                currentChangedFields,
                drawer.mode === 'new' ? 'insert' : 'patch',
                drawer.docId
            );
            code.innerHTML = '<span class="rxdbv-plain-line"><span class="rxdbv-comment">// applied on save — nothing has run yet</span></span>' +
                lines.map(line => line.changed
                    ? '<span class="rxdbv-changed-line">' + escapeHtml(line.text) + '</span>'
                    : '<span class="rxdbv-plain-line">' + escapeHtml(line.text) + '</span>'
                ).join('');
        };
        renderWillRunContent(mergedDoc, changedFields);
        container.appendChild(code);
        const applyButton = el('button', 'rxdbv-btn-primary', 'Apply changes', {
            onClick: () => {
                /**
                 * Staged values are read at click time, so edits
                 * typed without leaving the input are included.
                 */
                const { doc: currentDoc, changedFields: currentChangedFields } = buildDrawerDocument(drawer);
                if (currentChangedFields.length === 0 && drawer.mode !== 'new') {
                    return;
                }
                const changedOnly: any = {};
                currentChangedFields.forEach(field => {
                    changedOnly[field] = currentDoc[field];
                });
                const write = drawer.mode === 'new'
                    ? ctx.source.insert(collectionName, currentDoc)
                    : ctx.source.update(collectionName, drawer.docId as string, changedOnly);
                write.then(() => {
                    ctx.viewerWriteTimes.push(Date.now());
                    if (drawer.mode === 'new') {
                        uiState.drawer = null;
                        rerun();
                        ctx.renderContent();
                        return;
                    }
                    /**
                     * The written document becomes the new baseline,
                     * so the inputs show the saved values and the
                     * edited state compares against them.
                     */
                    return ctx.source.getById(collectionName, drawer.docId as string).then(freshDoc => {
                        if (freshDoc) {
                            drawer.doc = freshDoc;
                        }
                        drawer.staged.clear();
                        rerun();
                        ctx.renderContent();
                    });
                }).catch(err => {
                    showViewerError(ctx.root, drawer.mode === 'new' ? 'Insert failed' : 'Update failed', err);
                });
            }
        }) as HTMLButtonElement;
        applyButton.disabled = !edited;
        updatePreview = () => {
            const { doc: currentDoc, changedFields: currentChangedFields } = buildDrawerDocument(drawer);
            const currentlyEdited = currentChangedFields.length > 0 || drawer.mode === 'new';
            applyButton.disabled = !currentlyEdited;
            editedBadge.style.display = currentlyEdited ? '' : 'none';
            renderWillRunContent(currentDoc, currentChangedFields);
            fieldDots.forEach((dot, fieldName) => {
                dot.style.display = drawer.staged.has(fieldName) ? '' : 'none';
            });
        };
        container.appendChild(el('div', 'rxdbv-drawer-actions', [
            applyButton,
            el('button', 'rxdbv-btn', 'Discard', {
                onClick: () => {
                    if (drawer.mode === 'new') {
                        uiState.drawer = null;
                        ctx.renderContent();
                    } else {
                        drawer.staged.clear();
                        renderDrawer();
                    }
                }
            })
        ]));
    }
    return container;
}

function renderDrawerAttachments(
    ctx: PageContext,
    collectionName: string,
    drawer: DrawerState,
    container: HTMLElement
) {
    if (ctx.source.kind !== 'live' || !drawer.docId) {
        return;
    }
    const docId = drawer.docId;
    ctx.source.getAttachments(collectionName, docId).then(attachments => {
        if (ctx.destroyed || attachments.length === 0) {
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
                        ctx.source.getAttachmentData(collectionName, docId, attachment.id).then(data => {
                            if (!data) {
                                return;
                            }
                            const url = URL.createObjectURL(base64ToBlob(data.base64, data.type));
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
                ctx.source.getAttachmentData(collectionName, docId, attachment.id).then(data => {
                    if (!data) {
                        return;
                    }
                    const url = URL.createObjectURL(base64ToBlob(data.base64, data.type));
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

/**
 * Reads every document that matches the applied selector of the
 * current query in pages, for the all-matching bulk actions.
 */
function queryAllMatching(
    ctx: PageContext,
    collectionName: string,
    uiState: CollectionUiState
): Promise<any[]> {
    const pageSize = 500;
    const docs: any[] = [];
    const readPage = (skip: number): Promise<any[]> =>
        ctx.source.query(collectionName, uiState.appliedSelector, skip, pageSize).then(result => {
            docs.push(...result.docs);
            if (result.docs.length === pageSize) {
                return readPage(skip + pageSize);
            }
            return docs;
        });
    return readPage(0);
}

function openDeleteModal(
    ctx: PageContext,
    collectionName: string,
    uiState: CollectionUiState
) {
    const total = uiState.lastResult && uiState.lastResult.total !== null
        ? uiState.lastResult.total
        : null;
    const count = uiState.allMatching && total !== null ? total : uiState.selection.size;
    const totalText = total === null ? '?' : formatInteger(total);
    const hasReplication = !!ctx.events && ctx.events.replications.some(r => r.collectionName === collectionName);

    const deleteButton = el('button', 'rxdbv-btn-danger-solid', 'Delete ' + formatInteger(count) + ' documents') as HTMLButtonElement;

    const backdrop = el('div', 'rxdbv-modal-backdrop');
    const close = () => backdrop.remove();
    const collectIds = (): Promise<string[]> => {
        if (!uiState.allMatching) {
            return Promise.resolve(Array.from(uiState.selection));
        }
        const info = ctx.source.listCollections().find(c => c.name === collectionName);
        const primaryPath = info ? info.primaryPath : 'id';
        return queryAllMatching(ctx, collectionName, uiState)
            .then(docs => docs.map(doc => String(doc[primaryPath])));
    };
    deleteButton.addEventListener('click', () => {
        deleteButton.disabled = true;
        collectIds().then(ids => {
            const chunkSize = 500;
            const removeChunk = (index: number): Promise<void> => {
                if (index >= ids.length) {
                    return Promise.resolve();
                }
                return ctx.source.removeByIds(collectionName, ids.slice(index, index + chunkSize))
                    .then(() => removeChunk(index + chunkSize));
            };
            return removeChunk(0);
        }).then(() => {
            uiState.selection.clear();
            uiState.allMatching = false;
            ctx.viewerWriteTimes.push(Date.now());
            close();
            ctx.renderContent();
        }).catch(err => {
            close();
            showViewerError(ctx.root, 'Delete failed', err);
        });
    });

    backdrop.appendChild(el('div', 'rxdbv-modal', [
        el('div', 'rxdbv-modal-title', 'Delete ' + formatInteger(count) + ' documents?'),
        el('div', 'rxdbv-modal-body', [
            'This removes ' + formatInteger(count) + ' selected of ' + totalText + ' documents in ',
            el('code', '', collectionName),
            '. ',
            hasReplication ? 'Deletes replicate to all connected peers. ' : '',
            'Tombstones remain until cleanup.'
        ]),
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
    deleteButton.focus();
}
