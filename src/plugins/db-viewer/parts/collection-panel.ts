import type { Subscription } from 'rxjs';
import type { RxCollection, RxDocumentData } from '../../../types/index.d.ts';
import {
    button,
    clear,
    el,
    gridHead,
    gridRow,
    primaryButton,
    spacer
} from '../dom.ts';
import {
    formatAge,
    formatBytes,
    formatNumber,
    getByPath,
    highlightJson,
    parseCellInput,
    parseSelector,
    previewValue,
    setByPath,
    shortRevision,
    valueType
} from '../format.ts';
import { DB_VIEWER_COLORS } from '../theme.ts';
import { pickGridColumns } from '../grid-columns.ts';
import type { GridColumn } from '../grid-columns.ts';
import type { PanelContext } from './context.ts';
import { downloadJson } from './context.ts';

const INTERNAL_FIELDS = ['_rev', '_deleted', '_meta', '_attachments'];
/**
 * How long a document keeps the "updated" highlight in the JSON view
 * after it changed while observing.
 */
const FRESH_HIGHLIGHT_MS = 30000;

/**
 * Everything scoped to one collection: the content toolbar, the query bar,
 * the grid or JSON result, the document drawer and the destructive
 * confirmation that guards a bulk delete.
 */
export class CollectionPanel {
    public readonly element: HTMLElement = el('div', { class: 'rxdbv-main' });

    private documents: RxDocumentData<any>[] = [];
    private matchCount = 0;
    private totalCount = 0;
    private loading = true;
    private loadToken = 0;
    private subscription: Subscription | null = null;
    /**
     * Document id to the time it last changed while observing,
     * drives the "← updated 2s ago" highlight in the JSON view.
     */
    private freshDocuments = new Map<string, number>();

    constructor(
        private readonly context: PanelContext,
        private readonly collectionName: string
    ) {
        this.load();
    }

    private get collection(): RxCollection {
        return this.context.store.database.collections[this.collectionName];
    }

    private get view() {
        return this.context.store.getView(this.collectionName);
    }

    public destroy(): void {
        this.subscription?.unsubscribe();
        this.subscription = null;
    }

    private buildQuery() {
        const view = this.view;
        return {
            selector: view.selector,
            sort: [{ [view.sort.field]: view.sort.direction } as any],
            skip: view.page * this.context.store.pageSize,
            limit: this.context.store.pageSize
        };
    }

    public async load(): Promise<void> {
        const token = ++this.loadToken;
        this.loading = true;
        this.subscription?.unsubscribe();
        this.subscription = null;
        const collection = this.collection;
        if (!collection) {
            return;
        }
        const view = this.view;
        try {
            const [total, matches] = await Promise.all([
                collection.count().exec(),
                collection.count({ selector: view.selector }).exec()
            ]);
            if (token !== this.loadToken) {
                return;
            }
            this.totalCount = total;
            this.matchCount = matches;
            const query = collection.find(this.buildQuery());
            if (view.observe) {
                this.subscription = query.$.subscribe(documents => {
                    if (token !== this.loadToken) {
                        return;
                    }
                    const now = Date.now();
                    documents.forEach(rxDocument => {
                        const previous = this.documents.find(
                            candidate => candidate[collection.schema.primaryPath] === rxDocument.primary
                        );
                        if (previous && previous._rev !== rxDocument.toJSON(true)._rev) {
                            this.freshDocuments.set(rxDocument.primary, now);
                        }
                    });
                    this.documents = documents.map(rxDocument => rxDocument.toJSON(true) as RxDocumentData<any>);
                    this.loading = false;
                    this.context.render();
                });
            } else {
                const documents = await query.exec();
                if (token !== this.loadToken) {
                    return;
                }
                this.documents = documents.map(rxDocument => rxDocument.toJSON(true) as RxDocumentData<any>);
            }
        } catch (error) {
            if (token !== this.loadToken) {
                return;
            }
            this.view.queryError = { message: (error as Error).message, position: 0 };
        }
        this.loading = false;
        this.context.render();
    }

    private get columns(): GridColumn[] {
        return pickGridColumns(
            this.collection.schema.jsonSchema,
            this.collection.schema.primaryPath as string
        );
    }

    private get gridTemplate(): string {
        return '32px ' + this.columns.map(column => column.width).join(' ');
    }

    public render(): HTMLElement {
        clear(this.element);
        const collection = this.collection;
        if (!collection) {
            this.element.appendChild(this.renderEmptyDatabase());
            return this.element;
        }
        this.element.appendChild(this.renderToolbar());
        this.element.appendChild(this.renderQueryBar());
        const view = this.view;
        if (view.queryError) {
            this.element.appendChild(this.renderQueryError(view.queryError));
        }
        if (this.totalCount === 0 && !this.loading) {
            this.element.appendChild(this.renderEmptyCollection());
        } else if (this.matchCount === 0 && !this.loading) {
            this.element.appendChild(this.renderNoMatches());
        } else if (view.view === 'json') {
            this.element.appendChild(this.renderJson());
        } else {
            this.element.appendChild(this.renderGrid());
        }
        this.element.appendChild(this.renderFooter());
        return this.element;
    }

    /**
     * Row 1 of the content toolbar. Everything here is scoped to the
     * current collection, never to the database.
     */
    private renderToolbar(): HTMLElement {
        const view = this.view;
        const store = this.context.store;
        const segment = (label: string, value: 'table' | 'json') => el('div', {
            class: view.view === value ? 'rxdbv-active' : '',
            text: label,
            onClick: () => {
                view.view = value;
                this.context.render();
            }
        });
        const observeDisabled = Boolean(store.dump);
        return el('div', { class: 'rxdbv-toolbar' }, [
            el('span', { class: 'rxdbv-panel-title rxdbv-mono', text: this.collectionName }),
            el('div', { class: 'rxdbv-seg' }, [segment('Table', 'table'), segment('JSON', 'json')]),
            el('div', {
                class: 'rxdbv-toggle' + (view.observe ? ' rxdbv-on' : ''),
                title: observeDisabled ? 'not available on a dump' : 'Subscribe to the current query',
                style: observeDisabled ? { opacity: '0.5', cursor: 'not-allowed' } : {},
                onClick: () => {
                    if (observeDisabled) {
                        return;
                    }
                    view.observe = !view.observe;
                    this.freshDocuments.clear();
                    this.load();
                }
            }, [
                el('span', { class: 'rxdbv-dot' }),
                document.createTextNode(view.observe ? 'Observing' : 'Observe')
            ]),
            view.observe && el('span', {
                class: 'rxdbv-dim',
                style: { fontSize: '10px' },
                text: 'live — the list updates as documents change'
            }),
            spacer(),
            button('Export', () => this.exportCollection())
        ]);
    }

    /**
     * Row 2 of the content toolbar: the Mango selector.
     */
    private renderQueryBar(): HTMLElement {
        const view = this.view;
        const input = el('input', {
            class: 'rxdbv-query-input',
            value: view.queryInput,
            spellcheck: 'false',
            'aria-label': 'Mango selector',
            onInput: event => {
                view.queryInput = (event.target as HTMLInputElement).value;
            },
            onKeyDown: event => {
                if (event.key === 'Enter') {
                    this.runQuery();
                } else if (event.key === 'Escape' && view.historyOpen) {
                    view.historyOpen = false;
                    this.context.render();
                } else if (event.key === 's' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    this.context.store.toggleFavourite(view.queryInput);
                }
            },
            onFocus: () => wrap.classList.add('rxdbv-focus'),
            onBlur: () => wrap.classList.remove('rxdbv-focus')
        });
        const wrap = el('div', {
            class: 'rxdbv-query-input-wrap' + (view.queryError ? ' rxdbv-invalid' : '')
        }, [
            el('span', { class: 'rxdbv-dim', text: 'find' }),
            input,
            el('span', {
                class: 'rxdbv-history-btn',
                text: 'history ▾',
                onClick: () => {
                    view.historyOpen = !view.historyOpen;
                    this.context.render();
                }
            })
        ]);
        const bar = el('div', { class: 'rxdbv-querybar' }, [
            wrap,
            button('Explain', () => {
                this.runQuery();
                this.context.navigate({ kind: 'tool', tool: 'querylab' });
            }),
            primaryButton('Run', () => this.runQuery(), { disabled: Boolean(view.queryError) })
        ]);
        if (view.historyOpen) {
            bar.appendChild(this.renderHistoryDropdown());
        }
        return bar;
    }

    private renderHistoryDropdown(): HTMLElement {
        const view = this.view;
        const history = this.context.store.queryHistory;
        const favourites = history.filter(entry => entry.favourite);
        const recent = history.filter(entry => !entry.favourite)
            .sort((a, b) => b.usedAt - a.usedAt);
        const dropdown = el('div', { class: 'rxdbv-dropdown' });
        const applyEntry = (selector: string) => {
            view.queryInput = selector;
            view.historyOpen = false;
            this.runQuery();
        };
        if (favourites.length > 0) {
            dropdown.appendChild(el('div', { class: 'rxdbv-dropdown-head', text: 'FAVOURITES' }));
            favourites.forEach(entry => {
                dropdown.appendChild(el('div', {
                    class: 'rxdbv-dropdown-row rxdbv-fav',
                    onClick: () => applyEntry(entry.selector)
                }, [
                    el('span', { style: { color: DB_VIEWER_COLORS.pink }, text: '★' }),
                    el('span', { class: 'rxdbv-dropdown-name', text: entry.name ?? entry.selector }),
                    el('span', { class: 'rxdbv-mono', text: entry.selector })
                ]));
            });
        }
        if (recent.length > 0) {
            dropdown.appendChild(el('div', { class: 'rxdbv-dropdown-head', text: 'RECENT' }));
            recent.forEach(entry => {
                dropdown.appendChild(el('div', {
                    class: 'rxdbv-dropdown-row',
                    onClick: () => applyEntry(entry.selector)
                }, [
                    el('span', { class: 'rxdbv-dim', text: '↺' }),
                    el('span', { class: 'rxdbv-mono', text: entry.selector })
                ]));
            });
        }
        if (favourites.length === 0 && recent.length === 0) {
            dropdown.appendChild(el('div', {
                class: 'rxdbv-dropdown-row rxdbv-dim',
                text: 'No queries yet. Run one to see it here.'
            }));
        }
        dropdown.appendChild(el('div', {
            class: 'rxdbv-dropdown-foot',
            text: '↑↓ navigate · ↵ run · ⌘S save as favourite'
        }));
        return dropdown;
    }

    private renderQueryError(error: { message: string; position: number; }): HTMLElement {
        const view = this.view;
        const caret = ' '.repeat(Math.max(0, error.position)) + '^';
        return el('div', { class: 'rxdbv-query-error' }, [
            el('div', {
                class: 'rxdbv-mono',
                style: { fontSize: '11px', color: DB_VIEWER_COLORS.danger },
                text: '✕ ' + error.message
            }),
            el('div', {
                class: 'rxdbv-mono rxdbv-dim',
                style: { fontSize: '11px', whiteSpace: 'pre', marginTop: '4px' }
            }, [
                document.createTextNode(view.queryInput + '\n'),
                el('span', { style: { color: DB_VIEWER_COLORS.danger }, text: caret })
            ]),
            el('div', {
                class: 'rxdbv-muted',
                style: { fontSize: '11px', marginTop: '10px', lineHeight: '1.55' }
            }, [
                document.createTextNode('Quote strings, use lowercase '),
                el('span', { class: 'rxdbv-mono', style: { color: DB_VIEWER_COLORS.fg }, text: 'true' }),
                document.createTextNode('/'),
                el('span', { class: 'rxdbv-mono', style: { color: DB_VIEWER_COLORS.fg }, text: 'false' }),
                document.createTextNode(', and prefix Mango operators with '),
                el('span', { class: 'rxdbv-mono', style: { color: DB_VIEWER_COLORS.fg }, text: '$' }),
                document.createTextNode('. The previous results stay visible below.')
            ])
        ]);
    }

    private runQuery(): void {
        const view = this.view;
        const parsed = parseSelector(view.queryInput);
        if (!parsed.ok) {
            view.queryError = parsed.error;
            this.context.render();
            return;
        }
        view.queryError = null;
        view.selector = parsed.value;
        view.page = 0;
        view.historyOpen = false;
        view.selection.clear();
        this.context.store.rememberQuery(view.queryInput.trim() === '' ? '{}' : view.queryInput.trim());
        this.load();
    }

    private renderGrid(): HTMLElement {
        const view = this.view;
        const columns = this.columns;
        const template = this.gridTemplate;
        const container = el('div', { class: 'rxdbv-scroll' });

        const allSelected = this.documents.length > 0 &&
            this.documents.every(documentData => view.selection.has(this.idOf(documentData)));
        const headCells: (Node | string)[] = [
            el('input', {
                type: 'checkbox',
                class: 'rxdbv-check',
                checked: allSelected,
                onChange: (event: Event) => {
                    const checked = (event.target as HTMLInputElement).checked;
                    this.documents.forEach(documentData => {
                        if (checked) {
                            view.selection.add(this.idOf(documentData));
                        } else {
                            view.selection.delete(this.idOf(documentData));
                        }
                    });
                    this.context.render();
                }
            })
        ];
        columns.forEach(column => {
            const sorted = view.sort.field === column.path;
            headCells.push(el('span', {
                class: 'rxdbv-th-click' + (sorted ? ' rxdbv-sorted' : ''),
                style: sorted ? { color: DB_VIEWER_COLORS.fg } : {},
                text: column.label + (sorted ? (view.sort.direction === 'desc' ? ' ↓' : ' ↑') : ''),
                onClick: () => {
                    if (sorted) {
                        view.sort.direction = view.sort.direction === 'desc' ? 'asc' : 'desc';
                    } else {
                        view.sort = { field: column.path, direction: 'asc' };
                    }
                    this.load();
                }
            }));
        });
        container.appendChild(gridHead(template, headCells));

        this.documents.forEach(documentData => {
            const documentId = this.idOf(documentData);
            const selected = view.selection.has(documentId);
            const cells: (Node | string)[] = [
                el('input', {
                    type: 'checkbox',
                    class: 'rxdbv-check',
                    checked: selected,
                    onClick: (event: MouseEvent) => {
                        event.stopPropagation();
                        if (view.selection.has(documentId)) {
                            view.selection.delete(documentId);
                        } else {
                            view.selection.add(documentId);
                        }
                        this.context.render();
                    }
                })
            ];
            columns.forEach(column => {
                cells.push(this.renderCell(documentData, column.path));
            });
            const row = gridRow(template, cells, {
                class: 'rxdbv-tr' + (view.openDocumentId === documentId ? ' rxdbv-selected' : ''),
                onClick: () => {
                    view.openDocumentId = documentId;
                    view.stagedEdits = {};
                    this.context.render();
                }
            });
            container.appendChild(row);
        });
        if (this.loading && this.documents.length === 0) {
            container.appendChild(el('div', {
                class: 'rxdbv-dim rxdbv-mono',
                style: { padding: '8px 12px', fontSize: '10px' },
                text: 'loading…'
            }));
        }
        return container;
    }

    private renderCell(documentData: RxDocumentData<any>, path: string): Node {
        const view = this.view;
        const documentId = this.idOf(documentData);
        const raw = getByPath(documentData, path);
        if (path === '_rev') {
            return el('span', { class: 'rxdbv-mono rxdbv-dim', text: shortRevision(raw) });
        }
        if (path === '_meta.lwt') {
            return el('span', { class: 'rxdbv-muted', text: raw ? formatAge(raw) : '' });
        }
        const editable = !this.context.store.readOnly &&
            path !== this.collection.schema.primaryPath &&
            !path.startsWith('_');
        const isEditing = view.editingCell &&
            view.editingCell.documentId === documentId &&
            view.editingCell.field === path;
        if (isEditing) {
            const input = el('input', {
                class: 'rxdbv-cell-input',
                value: typeof raw === 'string' ? raw : JSON.stringify(raw ?? null),
                onClick: (event: MouseEvent) => event.stopPropagation(),
                onKeyDown: (event: KeyboardEvent) => {
                    if (event.key === 'Enter') {
                        this.applyCellEdit(documentData, path, (event.target as HTMLInputElement).value);
                    } else if (event.key === 'Escape') {
                        view.editingCell = null;
                        this.context.render();
                    }
                },
                onBlur: (event: FocusEvent) => {
                    this.applyCellEdit(documentData, path, (event.target as HTMLInputElement).value);
                }
            });
            setTimeout(() => input.focus(), 0);
            return input;
        }
        const type = valueType(raw);
        const color = path === this.collection.schema.primaryPath
            ? DB_VIEWER_COLORS.fgMuted
            : (type === 'boolean' ? (raw ? DB_VIEWER_COLORS.success : DB_VIEWER_COLORS.fgMuted) : undefined);
        return el('span', {
            class: type === 'string' && path !== this.collection.schema.primaryPath ? '' : 'rxdbv-mono',
            style: color ? { color } : {},
            title: editable ? 'double-click to edit' : undefined,
            onDblClick: editable
                ? (event: MouseEvent) => {
                    event.stopPropagation();
                    view.editingCell = { documentId, field: path };
                    this.context.render();
                }
                : undefined,
            text: previewValue(raw)
        });
    }

    private async applyCellEdit(documentData: RxDocumentData<any>, path: string, input: string): Promise<void> {
        const view = this.view;
        view.editingCell = null;
        const previous = getByPath(documentData, path);
        const next = parseCellInput(input, previous);
        if (next === previous) {
            this.context.render();
            return;
        }
        const patch: any = {};
        setByPath(patch, path, next);
        await this.writeDocument(this.idOf(documentData), patch);
    }

    private renderJson(): HTMLElement {
        const container = el('div', { class: 'rxdbv-json' });
        if (this.documents.length === 0) {
            container.appendChild(el('span', { class: 'rxdbv-dim', text: '[]' }));
            return container;
        }
        const now = Date.now();
        container.appendChild(document.createTextNode('[\n'));
        this.documents.forEach((documentData, index) => {
            const freshAt = this.freshDocuments.get(this.idOf(documentData));
            const isFresh = freshAt !== undefined && (now - freshAt) < FRESH_HIGHLIGHT_MS;
            const block = el('span', {
                class: 'rxdbv-json-doc' + (isFresh ? ' rxdbv-json-fresh' : '')
            });
            block.appendChild(highlightJson(documentData, 2));
            block.appendChild(document.createTextNode(
                index === this.documents.length - 1 ? '' : ','
            ));
            if (isFresh) {
                block.appendChild(el('span', {
                    class: 'rxdbv-json-string',
                    text: '  ← updated ' + formatAge(freshAt as number, now)
                }));
            }
            container.appendChild(block);
        });
        container.appendChild(document.createTextNode(']'));
        return container;
    }

    private renderFooter(): HTMLElement {
        const view = this.view;
        const store = this.context.store;
        const from = this.matchCount === 0 ? 0 : (view.page * store.pageSize) + 1;
        const to = Math.min(this.matchCount, (view.page + 1) * store.pageSize);
        const lastPage = Math.max(0, Math.ceil(this.matchCount / store.pageSize) - 1);
        const selectionSize = view.selection.size;

        const footer = el('div', { class: 'rxdbv-footer' }, [
            el('span', { text: formatNumber(from) + '–' + formatNumber(to) + ' of ' + formatNumber(this.matchCount) }),
            el('button', {
                class: 'rxdbv-pager',
                text: '‹',
                disabled: view.page === 0,
                onClick: () => {
                    view.page--;
                    this.load();
                }
            }),
            el('button', {
                class: 'rxdbv-pager',
                text: '›',
                disabled: view.page >= lastPage,
                onClick: () => {
                    view.page++;
                    this.load();
                }
            })
        ]);
        if (selectionSize > 0) {
            footer.appendChild(el('span', { class: 'rxdbv-dim' }, [
                document.createTextNode(formatNumber(selectionSize) + ' selected · '),
                el('a', {
                    text: 'Delete',
                    onClick: () => this.confirmDelete(Array.from(view.selection))
                }),
                document.createTextNode(' · '),
                el('a', {
                    text: 'Export selection',
                    onClick: () => this.exportSelection()
                })
            ]));
        }
        footer.appendChild(spacer());
        if (!store.readOnly) {
            footer.appendChild(primaryButton('+ New document', () => this.createDocument()));
        } else {
            footer.appendChild(button('+ New document', () => undefined, {
                disabled: true,
                title: store.dump ? 'not available on a dump' : 'the remote connection is read-only'
            }));
        }
        return footer;
    }

    private renderEmptyDatabase(): HTMLElement {
        return el('div', { class: 'rxdbv-center' }, [
            el('div', { class: 'rxdbv-center-inner' }, [
                el('div', { class: 'rxdbv-center-title', text: 'No collections yet' }),
                el('div', { class: 'rxdbv-center-body' }, [
                    el('span', { class: 'rxdbv-mono', style: { color: DB_VIEWER_COLORS.fg }, text: this.context.store.database.name }),
                    document.createTextNode(' is reachable but empty. Collections are declared in your app code:')
                ]),
                el('div', {
                    class: 'rxdbv-code',
                    style: { marginTop: '10px', textAlign: 'left' },
                    text: 'await db.addCollections({\n  todos: { schema: todoSchema }\n})'
                }),
                el('div', { style: { marginTop: '10px', fontSize: '11px' } }, [
                    el('a', {
                        href: 'https://rxdb.info/rx-schema.html',
                        target: '_blank',
                        rel: 'noopener',
                        text: 'Schema documentation'
                    })
                ])
            ])
        ]);
    }

    private renderEmptyCollection(): HTMLElement {
        const store = this.context.store;
        return el('div', { class: 'rxdbv-center' }, [
            el('div', { class: 'rxdbv-center-inner' }, [
                el('div', { class: 'rxdbv-center-title' }, [
                    el('span', { class: 'rxdbv-mono', text: this.collectionName }),
                    document.createTextNode(' has no documents')
                ]),
                el('div', { class: 'rxdbv-center-body' }, [
                    document.createTextNode('Create the first one here, or insert from the app with '),
                    el('span', {
                        class: 'rxdbv-code-inline',
                        text: 'db.' + this.collectionName + '.insert({ … })'
                    })
                ]),
                !store.readOnly && el('div', { class: 'rxdbv-center-actions' }, [
                    primaryButton('+ New document', () => this.createDocument())
                ])
            ])
        ]);
    }

    private renderNoMatches(): HTMLElement {
        const view = this.view;
        const firstField = Object.keys(view.selector)[0];
        return el('div', { class: 'rxdbv-center' }, [
            el('div', { class: 'rxdbv-center-inner' }, [
                el('div', {
                    class: 'rxdbv-center-title',
                    text: '0 of ' + formatNumber(this.totalCount) + ' documents match'
                }),
                el('div', { class: 'rxdbv-center-body' }, [
                    document.createTextNode('Values compare case-sensitively and matching is exact'),
                    firstField
                        ? document.createTextNode(' — the value you asked for may not exist in ' + firstField + '.')
                        : document.createTextNode('.')
                ]),
                el('div', { class: 'rxdbv-center-actions' }, [
                    button('Clear query', () => {
                        view.queryInput = '{}';
                        this.runQuery();
                    }),
                    firstField && button('Browse ' + firstField + ' values', () => {
                        view.queryInput = JSON.stringify({ [firstField]: { $exists: true } });
                        this.runQuery();
                    })
                ])
            ])
        ]);
    }

    /**
     * The document drawer. It stages every edit and previews the exact
     * write in the WILL RUN block before anything runs.
     */
    public renderDrawer(): HTMLElement | null {
        const view = this.view;
        if (!view.openDocumentId) {
            return null;
        }
        const documentData = this.documents.find(
            candidate => this.idOf(candidate) === view.openDocumentId
        );
        if (!documentData) {
            return null;
        }
        const collection = this.collection;
        const primaryPath = collection.schema.primaryPath as string;
        const edited = Object.keys(view.stagedEdits).length > 0;
        const drawer = el('div', { class: 'rxdbv-drawer' }, [
            el('div', { class: 'rxdbv-drawer-head' }, [
                el('span', {
                    class: 'rxdbv-mono',
                    style: { fontWeight: '700', fontSize: '12px' },
                    text: view.openDocumentId
                }),
                edited && el('span', { class: 'rxdbv-badge', text: 'edited' }),
                spacer(),
                el('span', {
                    class: 'rxdbv-close',
                    text: '×',
                    onClick: () => {
                        view.openDocumentId = null;
                        view.stagedEdits = {};
                        this.context.render();
                    }
                })
            ]),
            el('div', { class: 'rxdbv-drawer-group rxdbv-drawer-group-first', text: 'FIELDS' })
        ]);

        Object.keys(documentData)
            .filter(field => !INTERNAL_FIELDS.includes(field))
            .forEach(field => {
                this.appendDrawerField(drawer, documentData, field, field === primaryPath);
            });

        drawer.appendChild(el('div', { class: 'rxdbv-drawer-group', text: 'INTERNALS' }));
        [
            ['_rev', shortRevision(documentData._rev)],
            ['_deleted', String(Boolean(documentData._deleted))],
            ['_meta.lwt', String(getByPath(documentData, '_meta.lwt') ?? '')]
        ].forEach(([label, value]) => {
            const lwt = getByPath(documentData, '_meta.lwt');
            drawer.appendChild(el('div', { class: 'rxdbv-field rxdbv-mono' }, [
                el('span', { class: 'rxdbv-field-label', text: label }),
                el('span', { class: 'rxdbv-field-value', text: value }),
                label === '_meta.lwt' && lwt
                    ? el('span', { class: 'rxdbv-dim', text: formatAge(lwt) })
                    : null
            ]));
        });

        const attachments = (documentData as any)._attachments ?? {};
        const attachmentIds = Object.keys(attachments);
        if (attachmentIds.length > 0) {
            drawer.appendChild(el('div', {
                class: 'rxdbv-drawer-group',
                text: 'ATTACHMENTS · ' + attachmentIds.length
            }));
            attachmentIds.forEach(attachmentId => {
                drawer.appendChild(this.renderAttachment(attachmentId, attachments[attachmentId]));
            });
        }

        if (!this.context.store.readOnly) {
            drawer.appendChild(el('div', {
                class: 'rxdbv-drawer-group rxdbv-drawer-group-run',
                text: 'WILL RUN'
            }));
            drawer.appendChild(this.renderWillRun(documentData));
            drawer.appendChild(el('div', { style: { display: 'flex', gap: '8px', padding: '8px 12px 14px' } }, [
                primaryButton('Apply changes', () => this.applyStagedEdits(documentData), { disabled: !edited }),
                button('Discard', () => {
                    view.stagedEdits = {};
                    this.context.render();
                }, { disabled: !edited })
            ]));
        }
        return drawer;
    }

    private appendDrawerField(
        drawer: HTMLElement,
        documentData: RxDocumentData<any>,
        field: string,
        isPrimary: boolean
    ): void {
        const view = this.view;
        const raw = field in view.stagedEdits ? view.stagedEdits[field] : (documentData as any)[field];
        const type = valueType(raw);
        const isContainer = type === 'object' || type === 'array';

        if (isContainer) {
            const expanded = view.expandedFields.has(field);
            drawer.appendChild(el('div', { class: 'rxdbv-field' }, [
                el('span', {
                    class: 'rxdbv-field-label rxdbv-expandable',
                    text: (expanded ? '▾ ' : '▸ ') + field,
                    onClick: () => {
                        if (expanded) {
                            view.expandedFields.delete(field);
                        } else {
                            view.expandedFields.add(field);
                        }
                        this.context.render();
                    }
                }),
                el('span', { class: 'rxdbv-dim', text: previewValue(raw) })
            ]));
            if (expanded) {
                Object.keys(raw).forEach(key => {
                    const childValue = raw[key];
                    drawer.appendChild(el('div', { class: 'rxdbv-field-child' }, [
                        el('span', { text: key }),
                        el('span', {
                            style: { color: valueType(childValue) === 'string' ? DB_VIEWER_COLORS.success : DB_VIEWER_COLORS.fgMuted },
                            text: JSON.stringify(childValue)
                        })
                    ]));
                });
            }
            return;
        }

        if (isPrimary || this.context.store.readOnly) {
            drawer.appendChild(el('div', { class: 'rxdbv-field' }, [
                el('span', { class: 'rxdbv-field-label', text: field }),
                el('span', { class: 'rxdbv-field-value', text: previewValue(raw) }),
                isPrimary && el('span', { class: 'rxdbv-badge-neutral', text: 'primary' })
            ]));
            return;
        }

        const isEdited = field in view.stagedEdits;
        drawer.appendChild(el('div', { class: 'rxdbv-field' }, [
            el('span', { class: 'rxdbv-field-label', text: field }),
            el('input', {
                class: 'rxdbv-field-input' + (isEdited ? ' rxdbv-edited' : ''),
                value: typeof raw === 'string' ? raw : JSON.stringify(raw ?? null),
                onChange: (event: Event) => {
                    const nextValue = parseCellInput(
                        (event.target as HTMLInputElement).value,
                        (documentData as any)[field]
                    );
                    if (JSON.stringify(nextValue) === JSON.stringify((documentData as any)[field])) {
                        delete view.stagedEdits[field];
                    } else {
                        view.stagedEdits[field] = nextValue;
                    }
                    this.context.render();
                }
            }),
            isEdited && el('span', { class: 'rxdbv-edited-dot', title: 'modified' })
        ]));
    }

    private renderAttachment(attachmentId: string, meta: any): HTMLElement {
        const wrapper = el('div', { class: 'rxdbv-attachment' }, [
            el('div', { class: 'rxdbv-attachment-head' }, [
                el('span', { class: 'rxdbv-mono', text: attachmentId }),
                el('span', {
                    class: 'rxdbv-dim',
                    text: (meta.type ?? 'unknown') + ' · ' + formatBytes(meta.length ?? 0)
                }),
                spacer(),
                el('a', {
                    text: 'download',
                    style: { fontSize: '10px' },
                    onClick: () => this.downloadAttachment(attachmentId)
                })
            ])
        ]);
        if (typeof meta.type === 'string' && meta.type.startsWith('image/')) {
            const image = el('img', { class: 'rxdbv-attachment-preview', alt: attachmentId });
            wrapper.appendChild(image);
            this.readAttachment(attachmentId).then(blob => {
                if (blob) {
                    image.src = URL.createObjectURL(blob);
                }
            }).catch(() => {
                wrapper.removeChild(image);
            });
        }
        return wrapper;
    }

    private async readAttachment(attachmentId: string): Promise<Blob | null> {
        const view = this.view;
        if (!view.openDocumentId) {
            return null;
        }
        const rxDocument = await this.collection.findOne(view.openDocumentId).exec();
        if (!rxDocument || typeof (rxDocument as any).getAttachment !== 'function') {
            return null;
        }
        const attachment = (rxDocument as any).getAttachment(attachmentId);
        return attachment ? attachment.getData() : null;
    }

    private async downloadAttachment(attachmentId: string): Promise<void> {
        const blob = await this.readAttachment(attachmentId);
        if (!blob) {
            return;
        }
        const url = URL.createObjectURL(blob);
        const anchor = el('a', { href: url, download: attachmentId });
        anchor.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Shows the exact upsert that runs on Apply, with the changed
     * lines highlighted. Nothing has run when this is drawn.
     */
    private renderWillRun(documentData: RxDocumentData<any>): HTMLElement {
        const view = this.view;
        const merged: any = {};
        Object.keys(documentData)
            .filter(field => !INTERNAL_FIELDS.includes(field))
            .forEach(field => {
                merged[field] = field in view.stagedEdits
                    ? view.stagedEdits[field]
                    : (documentData as any)[field];
            });
        const block = el('div', { class: 'rxdbv-will-run' }, [
            el('span', { class: 'rxdbv-dim', text: '// applied on save — nothing has run yet\n' }),
            document.createTextNode(
                'await ' + this.context.store.database.name + '.' + this.collectionName + '.upsert({\n'
            )
        ]);
        const fields = Object.keys(merged);
        fields.forEach((field, index) => {
            const line = '  ' + JSON.stringify(field) + ': ' + JSON.stringify(merged[field]) +
                (index === fields.length - 1 ? '' : ',') + '\n';
            if (field in view.stagedEdits) {
                block.appendChild(el('span', { class: 'rxdbv-will-run-changed', text: line }));
            } else {
                block.appendChild(document.createTextNode(line));
            }
        });
        block.appendChild(document.createTextNode('})'));
        return block;
    }

    private async applyStagedEdits(documentData: RxDocumentData<any>): Promise<void> {
        const view = this.view;
        const patch = { ...view.stagedEdits };
        view.stagedEdits = {};
        await this.writeDocument(this.idOf(documentData), patch);
    }

    private async writeDocument(documentId: string, patch: any): Promise<void> {
        const collection = this.collection;
        try {
            const rxDocument = await collection.findOne(documentId).exec();
            if (!rxDocument) {
                return;
            }
            this.context.store.markDbViewerWrite(this.collectionName, documentId);
            await rxDocument.incrementalPatch(patch);
        } catch (error) {
            this.context.notify((error as Error).message);
        }
        await this.load();
    }

    private async createDocument(): Promise<void> {
        const collection = this.collection;
        const primaryPath = collection.schema.primaryPath as string;
        const draft: any = {};
        const properties: any = collection.schema.jsonSchema.properties ?? {};
        Object.keys(properties).forEach(field => {
            if (INTERNAL_FIELDS.includes(field)) {
                return;
            }
            const type = properties[field].type;
            if (field === primaryPath) {
                draft[field] = 'doc_' + Math.random().toString(36).slice(2, 10);
            } else if (type === 'string') {
                draft[field] = '';
            } else if (type === 'number' || type === 'integer') {
                draft[field] = 0;
            } else if (type === 'boolean') {
                draft[field] = false;
            } else if (type === 'array') {
                draft[field] = [];
            } else if (type === 'object') {
                draft[field] = {};
            }
        });
        try {
            this.context.store.markDbViewerWrite(this.collectionName, draft[primaryPath]);
            await collection.insert(draft);
            this.view.openDocumentId = draft[primaryPath];
            this.view.stagedEdits = {};
        } catch (error) {
            this.context.notify((error as Error).message);
        }
        await this.load();
    }

    /**
     * Deleting many documents at once states the blast radius and
     * requires the collection name to be typed before it is enabled.
     */
    private confirmDelete(documentIds: string[]): void {
        const collection = this.collection;
        const confirmInput = el('input', {
            class: 'rxdbv-modal-input',
            placeholder: this.collectionName,
            spellcheck: 'false',
            onInput: (event: Event) => {
                deleteButton.disabled = (event.target as HTMLInputElement).value.trim() !== this.collectionName;
            }
        });
        const deleteButton = button(
            'Delete ' + formatNumber(documentIds.length) + ' documents',
            async () => {
                this.context.setOverlay(null);
                try {
                    documentIds.forEach(id => this.context.store.markDbViewerWrite(this.collectionName, id));
                    await collection.bulkRemove(documentIds);
                } catch (error) {
                    this.context.notify((error as Error).message);
                }
                this.view.selection.clear();
                this.view.openDocumentId = null;
                await this.load();
            },
            { variant: 'dangerSolid', disabled: true }
        );
        const modal = el('div', { class: 'rxdbv-modal-backdrop' }, [
            el('div', { class: 'rxdbv-modal' }, [
                el('div', {
                    class: 'rxdbv-modal-title',
                    text: 'Delete ' + formatNumber(documentIds.length) + ' documents?'
                }),
                el('div', { class: 'rxdbv-modal-body' }, [
                    document.createTextNode('This removes every selected document in '),
                    el('span', { class: 'rxdbv-mono', style: { color: DB_VIEWER_COLORS.fg }, text: this.collectionName }),
                    document.createTextNode(
                        ' — ' + formatNumber(documentIds.length) + ' of ' + formatNumber(this.totalCount) +
                        '. Deletes replicate to all connected peers. Tombstones remain until cleanup.'
                    )
                ]),
                el('div', {
                    class: 'rxdbv-dim',
                    style: { marginTop: '12px', fontSize: '11px' },
                    text: 'Type the collection name to confirm:'
                }),
                confirmInput,
                el('div', { class: 'rxdbv-modal-actions' }, [
                    button('Cancel', () => this.context.setOverlay(null)),
                    deleteButton
                ])
            ])
        ]);
        this.context.setOverlay(modal);
        setTimeout(() => confirmInput.focus(), 0);
    }

    private async exportCollection(): Promise<void> {
        const database = this.context.store.database;
        try {
            if (typeof database.exportJSON === 'function') {
                const dump = await database.exportJSON([this.collectionName] as any);
                downloadJson(database.name + '-' + this.collectionName + '.json', dump);
                return;
            }
        } catch (error) {
            this.context.notify('exportJSON needs the json-dump plugin, exporting the current page instead.');
        }
        downloadJson(database.name + '-' + this.collectionName + '.json', this.documents);
    }

    private exportSelection(): void {
        const view = this.view;
        const selected = this.documents.filter(
            documentData => view.selection.has(this.idOf(documentData))
        );
        downloadJson(this.collectionName + '-selection.json', selected);
    }

    private idOf(documentData: RxDocumentData<any>): string {
        return String((documentData as any)[this.collection.schema.primaryPath as string]);
    }
}
