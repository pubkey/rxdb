import { useCallback, useEffect, useRef, useState } from 'react';
import {
    formatAge,
    formatNumber,
    getByPath,
    parseCellInput,
    parseSelector,
    previewValue,
    setByPath,
    shortRevision,
    valueType
} from '../format.ts';
import { pickGridColumns } from '../grid-columns.ts';
import { DB_VIEWER_COLORS } from '../theme.ts';
import { HighlightedJson } from './json.tsx';
import { ConfirmDeleteModal } from './modals.tsx';
import { GridHead, GridRow } from './grid.tsx';
import { downloadJson } from './settings-panel.tsx';
import type { PanelProps } from '../app.tsx';

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
export function CollectionPanel(props: PanelProps & { collectionName: string; }) {
    const { store, snapshot, client, notify, collectionName } = props;
    const collection = store.getCollection(collectionName);
    const view = store.getView(collectionName);

    const [documents, setDocuments] = useState<any[]>([]);
    const [matchCount, setMatchCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string[] | null>(null);
    const loadToken = useRef(0);
    const freshDocuments = useRef(new Map<string, number>());

    const totalCount = store.counts[collectionName] ?? 0;
    const primaryPath = collection ? collection.primaryPath : 'id';
    const idOf = (documentData: any) => String(documentData[primaryPath]);

    const load = useCallback(async () => {
        const token = ++loadToken.current;
        setLoading(true);
        try {
            const result = await client.call('documents', {
                collectionName,
                selector: view.selector,
                sort: view.sort,
                skip: view.page * snapshot.pageSize,
                limit: snapshot.pageSize
            });
            if (token !== loadToken.current) {
                return;
            }
            const now = Date.now();
            setDocuments(previous => {
                result.documents.forEach(next => {
                    const before = previous.find(candidate => idOf(candidate) === idOf(next));
                    if (before && before._rev !== next._rev) {
                        freshDocuments.current.set(idOf(next), now);
                    }
                });
                return result.documents;
            });
            setMatchCount(result.total);
        } catch (error) {
            if (token === loadToken.current) {
                view.queryError = { message: (error as Error).message, position: 0 };
            }
        }
        if (token === loadToken.current) {
            setLoading(false);
        }
    }, [collectionName, view.page, view.sort.field, view.sort.direction, snapshot.pageSize]);

    useEffect(() => {
        void load();
    }, [load]);

    /**
     * RxQuery lives in the host page and its `$` cannot cross the iframe, so
     * observing means re-running the query whenever the host reports a write
     * to this collection.
     */
    useEffect(() => {
        if (!view.observe) {
            return;
        }
        return client.on('change', record => {
            if (record.collectionName === collectionName) {
                void load();
            }
        });
    }, [view.observe, collectionName, load]);

    if (!collection) {
        return <EmptyDatabase />;
    }

    const runQuery = () => {
        const parsed = parseSelector(view.queryInput);
        if (!parsed.ok) {
            view.queryError = parsed.error;
            store.emit();
            return;
        }
        view.queryError = null;
        view.selector = parsed.value;
        view.page = 0;
        view.historyOpen = false;
        view.selection.clear();
        store.rememberQuery(view.queryInput.trim() === '' ? '{}' : view.queryInput.trim());
        store.emit();
        void load();
    };

    const writeDocument = async (documentId: string, patch: any) => {
        try {
            await client.call('patch', { collectionName, documentId, patch });
        } catch (error) {
            notify((error as Error).message);
        }
        await load();
    };

    const columns = pickGridColumns(collection.jsonSchema, primaryPath);
    const template = '32px ' + columns.map(column => column.width).join(' ');

    return (
        <div className="rxdbv-main">
            <Toolbar {...props} onReload={load} freshDocuments={freshDocuments.current} />
            <QueryBar {...props} onRun={runQuery} />
            {view.queryError && <QueryError store={store} error={view.queryError} />}

            {totalCount === 0 && !loading
                ? <EmptyCollection collectionName={collectionName} />
                : matchCount === 0 && !loading
                    ? <NoMatches store={store} collectionName={collectionName} onRun={runQuery} />
                    : view.view === 'json'
                        ? <JsonView documents={documents} idOf={idOf} fresh={freshDocuments.current} />
                        : (
                            <Grid
                                {...props}
                                documents={documents}
                                columns={columns}
                                template={template}
                                loading={loading}
                                idOf={idOf}
                                primaryPath={primaryPath}
                                onReload={load}
                                onWrite={writeDocument}
                            />
                        )}

            <Footer
                {...props}
                matchCount={matchCount}
                onReload={load}
                onDelete={ids => setDeleting(ids)}
                documents={documents}
            />

            {view.openDocumentId && (
                <Drawer
                    {...props}
                    documents={documents}
                    idOf={idOf}
                    primaryPath={primaryPath}
                    onReload={load}
                />
            )}

            {deleting && (
                <ConfirmDeleteModal
                    collectionName={collectionName}
                    matching={deleting.length}
                    total={totalCount}
                    onCancel={() => setDeleting(null)}
                    onConfirm={async () => {
                        try {
                            await client.call('remove', { collectionName, documentIds: deleting });
                            view.selection.clear();
                        } catch (error) {
                            notify((error as Error).message);
                        }
                        setDeleting(null);
                        await load();
                    }}
                />
            )}
        </div>
    );
}

function Toolbar({ store, snapshot, client, collectionName, notify, freshDocuments }: PanelProps & {
    collectionName: string;
    onReload: () => Promise<void>;
    freshDocuments: Map<string, number>;
}) {
    const view = store.getView(collectionName);
    const observeDisabled = Boolean(snapshot.dump);
    const segment = (label: string, value: 'table' | 'json') => (
        <div
            className={view.view === value ? 'rxdbv-active' : ''}
            onClick={() => {
                view.view = value;
                store.emit();
            }}
        >{label}</div>
    );
    return (
        <div className="rxdbv-toolbar">
            <span className="rxdbv-panel-title rxdbv-mono">{collectionName}</span>
            <div className="rxdbv-seg">{segment('Table', 'table')}{segment('JSON', 'json')}</div>
            <div
                className={'rxdbv-toggle' + (view.observe ? ' rxdbv-on' : '')}
                title={observeDisabled ? 'not available on a dump' : 'Follow the current query'}
                style={observeDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                onClick={() => {
                    if (observeDisabled) {
                        return;
                    }
                    view.observe = !view.observe;
                    freshDocuments.clear();
                    store.emit();
                }}
            >
                <span className="rxdbv-dot" />
                {view.observe ? 'Observing' : 'Observe'}
            </div>
            {view.observe && (
                <span className="rxdbv-dim" style={{ fontSize: '10px' }}>
                    live — the list updates as documents change
                </span>
            )}
            <div className="rxdbv-grow" />
            <button
                className="rxdbv-btn"
                onClick={async () => {
                    try {
                        const result = await client.call('documents', {
                            collectionName,
                            selector: view.selector,
                            sort: view.sort,
                            skip: 0,
                            limit: 100000
                        });
                        downloadJson(collectionName + '.json', result.documents);
                    } catch (error) {
                        notify((error as Error).message);
                    }
                }}
            >Export</button>
        </div>
    );
}

function QueryBar({ store, collectionName, onRun }: PanelProps & {
    collectionName: string;
    onRun: () => void;
}) {
    const view = store.getView(collectionName);
    const [focused, setFocused] = useState(false);
    return (
        <div className="rxdbv-querybar">
            <div className={
                'rxdbv-query-input-wrap' +
                (view.queryError ? ' rxdbv-invalid' : '') +
                (focused ? ' rxdbv-focus' : '')
            }>
                <span className="rxdbv-dim">find</span>
                <input
                    className="rxdbv-query-input"
                    aria-label="Mango selector"
                    spellCheck={false}
                    value={view.queryInput}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onChange={event => {
                        view.queryInput = event.target.value;
                        store.emit();
                    }}
                    onKeyDown={event => {
                        if (event.key === 'Enter') {
                            onRun();
                        } else if (event.key === 'Escape' && view.historyOpen) {
                            view.historyOpen = false;
                            store.emit();
                        } else if (event.key === 's' && (event.metaKey || event.ctrlKey)) {
                            event.preventDefault();
                            store.toggleFavourite(view.queryInput);
                        }
                    }}
                />
                <span
                    className="rxdbv-history-btn"
                    onClick={() => {
                        view.historyOpen = !view.historyOpen;
                        store.emit();
                    }}
                >history ▾</span>
            </div>
            <button className="rxdbv-btn" onClick={() => {
                onRun();
                store.navigate({ kind: 'tool', tool: 'querylab' });
            }}>Explain</button>
            <button
                className="rxdbv-btn rxdbv-btn-primary"
                disabled={Boolean(view.queryError)}
                onClick={onRun}
            >Run</button>
            {view.historyOpen && (
                <HistoryDropdown store={store} collectionName={collectionName} onRun={onRun} />
            )}
        </div>
    );
}

function HistoryDropdown({ store, collectionName, onRun }: {
    store: PanelProps['store'];
    collectionName: string;
    onRun: () => void;
}) {
    const view = store.getView(collectionName);
    const favourites = store.queryHistory.filter(entry => entry.favourite);
    const recent = store.queryHistory
        .filter(entry => !entry.favourite)
        .sort((a, b) => b.usedAt - a.usedAt);
    const apply = (selector: string) => {
        view.queryInput = selector;
        view.historyOpen = false;
        onRun();
    };
    return (
        <div className="rxdbv-dropdown">
            {favourites.length > 0 && <div className="rxdbv-dropdown-head">FAVOURITES</div>}
            {favourites.map(entry => (
                <div
                    key={'f' + entry.selector}
                    className="rxdbv-dropdown-row rxdbv-fav"
                    onClick={() => apply(entry.selector)}
                >
                    <span style={{ color: DB_VIEWER_COLORS.pink }}>★</span>
                    <span className="rxdbv-dropdown-name">{entry.name ?? entry.selector}</span>
                    <span className="rxdbv-mono">{entry.selector}</span>
                </div>
            ))}
            {recent.length > 0 && <div className="rxdbv-dropdown-head">RECENT</div>}
            {recent.map(entry => (
                <div
                    key={'r' + entry.selector}
                    className="rxdbv-dropdown-row"
                    onClick={() => apply(entry.selector)}
                >
                    <span className="rxdbv-dim">↺</span>
                    <span className="rxdbv-mono">{entry.selector}</span>
                </div>
            ))}
            {favourites.length === 0 && recent.length === 0 && (
                <div className="rxdbv-dropdown-row rxdbv-dim">No queries yet. Run one to see it here.</div>
            )}
            <div className="rxdbv-dropdown-foot">↑↓ navigate · ↵ run · ⌘S save as favourite</div>
        </div>
    );
}

function QueryError({ store, error }: {
    store: PanelProps['store'];
    error: { message: string; position: number; };
}) {
    const view = store.getView(store.scopedCollectionName);
    const caret = ' '.repeat(Math.max(0, error.position)) + '^';
    return (
        <div className="rxdbv-query-error">
            <div className="rxdbv-mono" style={{ fontSize: '11px', color: DB_VIEWER_COLORS.danger }}>
                {'✕ ' + error.message}
            </div>
            <div
                className="rxdbv-mono rxdbv-dim"
                style={{ fontSize: '11px', whiteSpace: 'pre', marginTop: '4px' }}
            >
                {view.queryInput + '\n'}
                <span style={{ color: DB_VIEWER_COLORS.danger }}>{caret}</span>
            </div>
            <div className="rxdbv-muted" style={{ fontSize: '11px', marginTop: '10px', lineHeight: 1.55 }}>
                {'Quote strings, use lowercase '}
                <span className="rxdbv-mono" style={{ color: DB_VIEWER_COLORS.fg }}>true</span>/
                <span className="rxdbv-mono" style={{ color: DB_VIEWER_COLORS.fg }}>false</span>
                {', and prefix Mango operators with '}
                <span className="rxdbv-mono" style={{ color: DB_VIEWER_COLORS.fg }}>$</span>
                {'. The previous results stay visible below.'}
            </div>
        </div>
    );
}

function Grid({ store, collectionName, documents, columns, template, loading, idOf, primaryPath, onWrite }: PanelProps & {
    collectionName: string;
    documents: any[];
    columns: { path: string; label: string; width: string; }[];
    template: string;
    loading: boolean;
    idOf: (documentData: any) => string;
    primaryPath: string;
    onReload: () => Promise<void>;
    onWrite: (documentId: string, patch: any) => Promise<void>;
}) {
    const view = store.getView(collectionName);
    const allSelected = documents.length > 0 &&
        documents.every(documentData => view.selection.has(idOf(documentData)));

    return (
        <div className="rxdbv-scroll">
            <GridHead
                columns={template}
                cells={[
                    <input
                        type="checkbox"
                        className="rxdbv-check"
                        checked={allSelected}
                        onChange={event => {
                            documents.forEach(documentData => {
                                if (event.target.checked) {
                                    view.selection.add(idOf(documentData));
                                } else {
                                    view.selection.delete(idOf(documentData));
                                }
                            });
                            store.emit();
                        }}
                    />,
                    ...columns.map(column => {
                        const sorted = view.sort.field === column.path;
                        return (
                            <span
                                className={'rxdbv-th-click' + (sorted ? ' rxdbv-sorted' : '')}
                                style={sorted ? { color: DB_VIEWER_COLORS.fg } : undefined}
                                onClick={() => {
                                    if (sorted) {
                                        view.sort = {
                                            field: column.path,
                                            direction: view.sort.direction === 'desc' ? 'asc' : 'desc'
                                        };
                                    } else {
                                        view.sort = { field: column.path, direction: 'asc' };
                                    }
                                    store.emit();
                                }}
                            >
                                {column.label + (sorted ? (view.sort.direction === 'desc' ? ' ↓' : ' ↑') : '')}
                            </span>
                        );
                    })
                ]}
            />

            {documents.map(documentData => {
                const documentId = idOf(documentData);
                return (
                    <GridRow
                        key={documentId}
                        className={'rxdbv-tr' + (view.openDocumentId === documentId ? ' rxdbv-selected' : '')}
                        columns={template}
                        onClick={() => {
                            view.openDocumentId = documentId;
                            view.stagedEdits = {};
                            store.emit();
                        }}
                        cells={[
                            <input
                                type="checkbox"
                                className="rxdbv-check"
                                checked={view.selection.has(documentId)}
                                onClick={event => event.stopPropagation()}
                                onChange={() => {
                                    if (view.selection.has(documentId)) {
                                        view.selection.delete(documentId);
                                    } else {
                                        view.selection.add(documentId);
                                    }
                                    store.emit();
                                }}
                            />,
                            ...columns.map(column => (
                                <Cell
                                    store={store}
                                    collectionName={collectionName}
                                    documentData={documentData}
                                    documentId={documentId}
                                    path={column.path}
                                    primaryPath={primaryPath}
                                    onWrite={onWrite}
                                />
                            ))
                        ]}
                    />
                );
            })}

            {loading && documents.length === 0 && (
                <div className="rxdbv-dim rxdbv-mono" style={{ padding: '8px 12px', fontSize: '10px' }}>
                    loading…
                </div>
            )}
        </div>
    );
}

function Cell({ store, collectionName, documentData, documentId, path, primaryPath, onWrite }: {
    store: PanelProps['store'];
    collectionName: string;
    documentData: any;
    documentId: string;
    path: string;
    primaryPath: string;
    onWrite: (documentId: string, patch: any) => Promise<void>;
}) {
    const view = store.getView(collectionName);
    const raw = getByPath(documentData, path);

    if (path === '_rev') {
        return <span className="rxdbv-mono rxdbv-dim">{shortRevision(raw)}</span>;
    }
    if (path === '_meta.lwt') {
        return <span className="rxdbv-muted">{raw ? formatAge(raw) : ''}</span>;
    }

    const editable = !store.readOnly && path !== primaryPath && !path.startsWith('_');
    const isEditing = view.editingCell &&
        view.editingCell.documentId === documentId &&
        view.editingCell.field === path;

    const commit = async (input: string) => {
        view.editingCell = null;
        const next = parseCellInput(input, raw);
        if (next === raw) {
            store.emit();
            return;
        }
        const patch: any = {};
        setByPath(patch, path, next);
        await onWrite(documentId, patch);
    };

    if (isEditing) {
        return (
            <input
                className="rxdbv-cell-input"
                autoFocus
                defaultValue={typeof raw === 'string' ? raw : JSON.stringify(raw ?? null)}
                onClick={event => event.stopPropagation()}
                onKeyDown={event => {
                    if (event.key === 'Enter') {
                        void commit((event.target as HTMLInputElement).value);
                    } else if (event.key === 'Escape') {
                        view.editingCell = null;
                        store.emit();
                    }
                }}
                onBlur={event => void commit(event.target.value)}
            />
        );
    }

    const type = valueType(raw);
    const color = path === primaryPath
        ? DB_VIEWER_COLORS.fgMuted
        : (type === 'boolean' ? (raw ? DB_VIEWER_COLORS.success : DB_VIEWER_COLORS.fgMuted) : undefined);

    return (
        <span
            className={type === 'string' && path !== primaryPath ? '' : 'rxdbv-mono'}
            style={color ? { color } : undefined}
            title={editable ? 'double-click to edit' : undefined}
            onDoubleClick={editable
                ? event => {
                    event.stopPropagation();
                    view.editingCell = { documentId, field: path };
                    store.emit();
                }
                : undefined}
        >{previewValue(raw)}</span>
    );
}

function JsonView({ documents, idOf, fresh }: {
    documents: any[];
    idOf: (documentData: any) => string;
    fresh: Map<string, number>;
}) {
    if (documents.length === 0) {
        return <div className="rxdbv-json"><span className="rxdbv-dim">[]</span></div>;
    }
    const now = Date.now();
    return (
        <div className="rxdbv-json">
            {'[\n'}
            {documents.map((documentData, index) => {
                const freshAt = fresh.get(idOf(documentData));
                const isFresh = freshAt !== undefined && (now - freshAt) < FRESH_HIGHLIGHT_MS;
                return (
                    <span
                        key={idOf(documentData)}
                        className={'rxdbv-json-doc' + (isFresh ? ' rxdbv-json-fresh' : '')}
                    >
                        <HighlightedJson value={documentData} />
                        {index === documents.length - 1 ? '' : ','}
                        {isFresh && (
                            <span className="rxdbv-json-string">
                                {'  ← updated ' + formatAge(freshAt as number, now)}
                            </span>
                        )}
                    </span>
                );
            })}
            {']'}
        </div>
    );
}

function Footer({ store, snapshot, client, collectionName, notify, matchCount, onReload, onDelete, documents }: PanelProps & {
    collectionName: string;
    matchCount: number;
    onReload: () => Promise<void>;
    onDelete: (ids: string[]) => void;
    documents: any[];
}) {
    const view = store.getView(collectionName);
    const collection = store.getCollection(collectionName);
    const from = matchCount === 0 ? 0 : (view.page * snapshot.pageSize) + 1;
    const to = Math.min(matchCount, (view.page + 1) * snapshot.pageSize);
    const lastPage = Math.max(0, Math.ceil(matchCount / snapshot.pageSize) - 1);

    const createDocument = async () => {
        if (!collection) {
            return;
        }
        const primaryPath = collection.primaryPath;
        const properties: any = collection.jsonSchema.properties ?? {};
        const draft: any = {};
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
            await client.call('upsert', { collectionName, document: draft });
            view.openDocumentId = draft[primaryPath];
            view.stagedEdits = {};
        } catch (error) {
            notify((error as Error).message);
        }
        await onReload();
    };

    return (
        <div className="rxdbv-footer">
            <span>
                {formatNumber(from) + '–' + formatNumber(to) + ' of ' + formatNumber(matchCount)}
            </span>
            <button
                className="rxdbv-pager"
                disabled={view.page === 0}
                onClick={() => {
                    view.page--;
                    store.emit();
                }}
            >‹</button>
            <button
                className="rxdbv-pager"
                disabled={view.page >= lastPage}
                onClick={() => {
                    view.page++;
                    store.emit();
                }}
            >›</button>
            {view.selection.size > 0 && (
                <span className="rxdbv-dim">
                    {formatNumber(view.selection.size) + ' selected · '}
                    <a onClick={() => onDelete(Array.from(view.selection))}>Delete</a>
                    {' · '}
                    <a onClick={() => downloadJson(
                        collectionName + '-selection.json',
                        documents.filter(documentData => collection
                            ? view.selection.has(String(documentData[collection.primaryPath]))
                            : false)
                    )}>Export selection</a>
                </span>
            )}
            <div className="rxdbv-grow" />
            <button
                className="rxdbv-btn rxdbv-btn-primary"
                disabled={store.readOnly || !collection}
                title={store.readOnly
                    ? (snapshot.dump ? 'not available on a dump' : 'the remote connection is read-only')
                    : undefined}
                onClick={() => void createDocument()}
            >+ New document</button>
        </div>
    );
}

function Drawer({ store, snapshot, client, collectionName, notify, documents, idOf, primaryPath, onReload }: PanelProps & {
    collectionName: string;
    documents: any[];
    idOf: (documentData: any) => string;
    primaryPath: string;
    onReload: () => Promise<void>;
}) {
    const view = store.getView(collectionName);
    const documentData = documents.find(candidate => idOf(candidate) === view.openDocumentId);
    if (!documentData) {
        return null;
    }
    const edited = Object.keys(view.stagedEdits).length > 0;
    const fields = Object.keys(documentData).filter(field => !INTERNAL_FIELDS.includes(field));
    const merged: any = {};
    fields.forEach(field => {
        merged[field] = field in view.stagedEdits ? view.stagedEdits[field] : documentData[field];
    });

    const apply = async () => {
        try {
            /**
             * Exactly the fields the WILL RUN block above lists. The internal
             * fields are deliberately not sent: a stale `_rev` would make the
             * write fail as a conflict.
             */
            await client.call('upsert', { collectionName, document: merged });
            view.stagedEdits = {};
        } catch (error) {
            notify((error as Error).message);
        }
        await onReload();
    };

    const lwt = getByPath(documentData, '_meta.lwt');

    return (
        <div className="rxdbv-drawer">
            <div className="rxdbv-drawer-head">
                <span className="rxdbv-mono" style={{ fontWeight: 700, fontSize: '12px' }}>
                    {view.openDocumentId}
                </span>
                {edited && <span className="rxdbv-badge">edited</span>}
                <div className="rxdbv-grow" />
                <span
                    className="rxdbv-close"
                    onClick={() => {
                        view.openDocumentId = null;
                        view.stagedEdits = {};
                        store.emit();
                    }}
                >×</span>
            </div>

            <div className="rxdbv-drawer-group rxdbv-drawer-group-first">FIELDS</div>
            {fields.map(field => (
                <DrawerField
                    key={field}
                    store={store}
                    collectionName={collectionName}
                    documentData={documentData}
                    field={field}
                    isPrimary={field === primaryPath}
                />
            ))}

            <div className="rxdbv-drawer-group">INTERNALS</div>
            <div className="rxdbv-field rxdbv-mono">
                <span className="rxdbv-field-label">_rev</span>
                <span className="rxdbv-field-value">{shortRevision(documentData._rev)}</span>
            </div>
            <div className="rxdbv-field rxdbv-mono">
                <span className="rxdbv-field-label">_deleted</span>
                <span className="rxdbv-field-value">{String(Boolean(documentData._deleted))}</span>
            </div>
            <div className="rxdbv-field rxdbv-mono">
                <span className="rxdbv-field-label">_meta.lwt</span>
                <span className="rxdbv-field-value">{String(lwt ?? '')}</span>
                {lwt && <span className="rxdbv-dim">{formatAge(lwt)}</span>}
            </div>

            {!store.readOnly && (
                <>
                    <div className="rxdbv-drawer-group rxdbv-drawer-group-run">WILL RUN</div>
                    <div className="rxdbv-will-run">
                        <span className="rxdbv-dim">{'// applied on save — nothing has run yet\n'}</span>
                        {'await ' + snapshot.databaseName + '.' + collectionName + '.upsert({\n'}
                        {fields.map((field, index) => {
                            const line = '  ' + JSON.stringify(field) + ': ' +
                                JSON.stringify(merged[field]) +
                                (index === fields.length - 1 ? '' : ',') + '\n';
                            return field in view.stagedEdits
                                ? <span key={field} className="rxdbv-will-run-changed">{line}</span>
                                : <span key={field}>{line}</span>;
                        })}
                        {'})'}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', padding: '8px 12px 14px' }}>
                        <button
                            className="rxdbv-btn rxdbv-btn-primary"
                            disabled={!edited}
                            onClick={() => void apply()}
                        >Apply changes</button>
                        <button
                            className="rxdbv-btn"
                            disabled={!edited}
                            onClick={() => {
                                view.stagedEdits = {};
                                store.emit();
                            }}
                        >Discard</button>
                    </div>
                </>
            )}
        </div>
    );
}

function DrawerField({ store, collectionName, documentData, field, isPrimary }: {
    store: PanelProps['store'];
    collectionName: string;
    documentData: any;
    field: string;
    isPrimary: boolean;
}) {
    const view = store.getView(collectionName);
    const raw = field in view.stagedEdits ? view.stagedEdits[field] : documentData[field];
    const type = valueType(raw);
    const isContainer = type === 'object' || type === 'array';
    const readOnly = store.readOnly || isPrimary;

    if (isContainer) {
        const expanded = view.expandedFields.has(field);
        return (
            <>
                <div className="rxdbv-field">
                    <span
                        className="rxdbv-field-label"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                            if (expanded) {
                                view.expandedFields.delete(field);
                            } else {
                                view.expandedFields.add(field);
                            }
                            store.emit();
                        }}
                    >{(expanded ? '▾ ' : '▸ ') + field}</span>
                    <span className="rxdbv-field-value rxdbv-dim">{previewValue(raw)}</span>
                </div>
                {expanded && (
                    <div className="rxdbv-field-nested rxdbv-mono">
                        <HighlightedJson value={raw} />
                    </div>
                )}
            </>
        );
    }

    return (
        <div className="rxdbv-field">
            <span className="rxdbv-field-label">{field}</span>
            {readOnly ? (
                <span className="rxdbv-field-value rxdbv-mono">{previewValue(raw)}</span>
            ) : (
                <input
                    className="rxdbv-field-input"
                    value={typeof raw === 'string' ? raw : JSON.stringify(raw ?? null)}
                    onChange={event => {
                        view.stagedEdits[field] = parseCellInput(event.target.value, documentData[field]);
                        store.emit();
                    }}
                />
            )}
        </div>
    );
}

function EmptyDatabase() {
    return (
        <div className="rxdbv-center">
            <div className="rxdbv-center-inner">
                <div className="rxdbv-center-title">This collection is gone</div>
                <div className="rxdbv-center-body">
                    It was removed from the database while the viewer was open.
                </div>
            </div>
        </div>
    );
}

function EmptyCollection({ collectionName }: { collectionName: string; }) {
    return (
        <div className="rxdbv-center">
            <div className="rxdbv-center-inner">
                <div className="rxdbv-center-title">
                    {collectionName + ' has no documents yet'}
                </div>
                <div className="rxdbv-center-body">
                    Insert one from your app, or create one with the button below.
                </div>
            </div>
        </div>
    );
}

function NoMatches({ store, collectionName, onRun }: {
    store: PanelProps['store'];
    collectionName: string;
    onRun: () => void;
}) {
    const view = store.getView(collectionName);
    return (
        <div className="rxdbv-center">
            <div className="rxdbv-center-inner">
                <div className="rxdbv-center-title">No document matches this selector</div>
                <div className="rxdbv-center-body">
                    <span className="rxdbv-mono">{view.queryInput}</span>
                </div>
                <div style={{ marginTop: '12px' }}>
                    <button
                        className="rxdbv-btn"
                        onClick={() => {
                            view.queryInput = '{}';
                            onRun();
                        }}
                    >Clear the selector</button>
                </div>
            </div>
        </div>
    );
}
