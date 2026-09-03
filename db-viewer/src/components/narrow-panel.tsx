import { useEffect, useState } from 'react';
import { formatAge, formatNumber, previewValue, shortRevision } from '../format.ts';
import { DB_VIEWER_COLORS } from '../theme.ts';
import { replicationGlyph, refresh } from '../app.tsx';
import { HighlightedJson } from './json.tsx';
import type { PanelProps } from '../app.tsx';

type NarrowScreen =
    | { kind: 'collections'; }
    | { kind: 'documents'; collectionName: string; }
    | { kind: 'document'; collectionName: string; documentId: string; };

/**
 * Below 640px the rail and the tool panels do not fit, so the database
 * viewer becomes three stacked read-only screens with back navigation.
 * Every touch row is at least 44px tall.
 */
export function NarrowPanel(props: PanelProps) {
    const [screen, setScreen] = useState<NarrowScreen>({ kind: 'collections' });
    if (screen.kind === 'collections') {
        return <Collections {...props} onOpen={setScreen} />;
    }
    if (screen.kind === 'documents') {
        return (
            <Documents
                {...props}
                collectionName={screen.collectionName}
                onOpen={setScreen}
                onBack={() => setScreen({ kind: 'collections' })}
            />
        );
    }
    return (
        <Document
            {...props}
            collectionName={screen.collectionName}
            documentId={screen.documentId}
            onBack={() => setScreen({ kind: 'documents', collectionName: screen.collectionName })}
        />
    );
}

function Header({ children }: { children: React.ReactNode; }) {
    return <div className="rxdbv-narrow-header">{children}</div>;
}

function Collections({ store, snapshot, client, onOpen }: PanelProps & {
    onOpen: (screen: NarrowScreen) => void;
}) {
    return (
        <div className="rxdbv-narrow">
            <Header>
                <div className="rxdbv-logo" />
                <span className="rxdbv-wordmark">RxDB</span>
                <span className="rxdbv-mono rxdbv-muted" style={{ fontSize: '11px' }}>
                    {snapshot.databaseName + ' / ' + snapshot.storageName}
                </span>
                <div className="rxdbv-grow" />
                <span
                    className="rxdbv-muted"
                    style={{ fontSize: '12px', cursor: 'pointer' }}
                    onClick={() => void refresh(store, client)}
                >Refresh</span>
            </Header>
            <div className="rxdbv-narrow-note">
                Read-only on a narrow screen. Open the viewer on a wider one to edit.
            </div>
            {store.collectionNames.map(name => {
                const glyph = replicationGlyph(store, name);
                return (
                    <div
                        key={name}
                        className="rxdbv-narrow-row"
                        onClick={() => onOpen({ kind: 'documents', collectionName: name })}
                    >
                        <span className="rxdbv-mono">{name}</span>
                        <div className="rxdbv-grow" />
                        <span className="rxdbv-mono rxdbv-dim">
                            {formatNumber(store.counts[name] ?? 0)}
                        </span>
                        <span style={{ color: glyph.color, fontSize: '10px' }} title={glyph.state}>
                            {glyph.glyph}
                        </span>
                        <span className="rxdbv-dim">›</span>
                    </div>
                );
            })}
        </div>
    );
}

function Documents({ store, snapshot, client, notify, collectionName, onOpen, onBack }: PanelProps & {
    collectionName: string;
    onOpen: (screen: NarrowScreen) => void;
    onBack: () => void;
}) {
    const collection = store.getCollection(collectionName);
    const primaryPath = collection ? collection.primaryPath : 'id';
    const [documents, setDocuments] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);

    useEffect(() => {
        let cancelled = false;
        client.call('documents', {
            collectionName,
            selector: {},
            sort: { field: '_meta.lwt', direction: 'desc' },
            skip: page * snapshot.pageSize,
            limit: snapshot.pageSize
        }).then(result => {
            if (!cancelled) {
                setDocuments(result.documents);
                setTotal(result.total);
            }
        }).catch(error => {
            if (!cancelled) {
                notify((error as Error).message);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [collectionName, page]);

    const lastPage = Math.max(0, Math.ceil(total / snapshot.pageSize) - 1);

    return (
        <div className="rxdbv-narrow">
            <Header>
                <span className="rxdbv-close" onClick={onBack}>‹</span>
                <span className="rxdbv-mono" style={{ fontWeight: 700 }}>{collectionName}</span>
                <div className="rxdbv-grow" />
                <span className="rxdbv-mono rxdbv-dim">{formatNumber(total)}</span>
            </Header>
            {documents.map(documentData => (
                <div
                    key={String(documentData[primaryPath])}
                    className="rxdbv-narrow-row"
                    onClick={() => onOpen({
                        kind: 'document',
                        collectionName,
                        documentId: String(documentData[primaryPath])
                    })}
                >
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="rxdbv-mono" style={{ fontSize: '11.5px' }}>
                            {String(documentData[primaryPath])}
                        </div>
                        <div className="rxdbv-dim" style={{ fontSize: '10px', marginTop: '2px' }}>
                            {shortRevision(documentData._rev) + ' · ' +
                                (documentData._meta?.lwt ? formatAge(documentData._meta.lwt) : '')}
                        </div>
                    </div>
                    <span className="rxdbv-dim">›</span>
                </div>
            ))}
            <div className="rxdbv-footer">
                <button className="rxdbv-pager" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button>
                <span className="rxdbv-dim">{'page ' + (page + 1) + ' of ' + (lastPage + 1)}</span>
                <button
                    className="rxdbv-pager"
                    disabled={page >= lastPage}
                    onClick={() => setPage(page + 1)}
                >›</button>
            </div>
        </div>
    );
}

function Document({ store, client, notify, collectionName, documentId, onBack }: PanelProps & {
    collectionName: string;
    documentId: string;
    onBack: () => void;
}) {
    const collection = store.getCollection(collectionName);
    const primaryPath = collection ? collection.primaryPath : 'id';
    const [documentData, setDocumentData] = useState<any>(null);

    useEffect(() => {
        let cancelled = false;
        client.call('documents', {
            collectionName,
            selector: { [primaryPath]: documentId } as any,
            sort: { field: primaryPath, direction: 'asc' },
            skip: 0,
            limit: 1
        }).then(result => {
            if (!cancelled) {
                setDocumentData(result.documents[0] ?? null);
            }
        }).catch(error => {
            if (!cancelled) {
                notify((error as Error).message);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [collectionName, documentId]);

    return (
        <div className="rxdbv-narrow">
            <Header>
                <span className="rxdbv-close" onClick={onBack}>‹</span>
                <span className="rxdbv-mono" style={{ fontWeight: 700 }}>{documentId}</span>
            </Header>
            {documentData === null ? (
                <div className="rxdbv-dim" style={{ padding: '12px' }}>loading…</div>
            ) : (
                <>
                    {Object.keys(documentData)
                        .filter(field => !field.startsWith('_'))
                        .map(field => (
                            <div key={field} className="rxdbv-narrow-field">
                                <span className="rxdbv-dim" style={{ fontSize: '10px' }}>{field}</span>
                                <span className="rxdbv-mono" style={{ fontSize: '12px' }}>
                                    {previewValue(documentData[field])}
                                </span>
                            </div>
                        ))}
                    <div
                        className="rxdbv-section-label"
                        style={{ padding: '12px 12px 4px', color: DB_VIEWER_COLORS.fgDim }}
                    >RAW</div>
                    <div className="rxdbv-json" style={{ fontSize: '10.5px' }}>
                        <HighlightedJson value={documentData} />
                    </div>
                </>
            )}
        </div>
    );
}
