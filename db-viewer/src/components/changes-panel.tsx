import { diffJson, formatClock, formatNumber, shortRevision } from '../format.ts';
import { DB_VIEWER_COLORS } from '../theme.ts';
import { DiffView } from './json.tsx';
import { GridHead, GridRow } from './grid.tsx';
import type { PanelProps } from '../app.tsx';
import type { DbViewerChangeRecord } from '../../../src/types/index.d.ts';

const COLUMNS = '100px 70px 80px 80px 1fr';

const OPERATION_COLORS: { [operation: string]: string; } = {
    INSERT: DB_VIEWER_COLORS.success,
    UPDATE: DB_VIEWER_COLORS.warning,
    DELETE: DB_VIEWER_COLORS.danger
};

/**
 * A network-tab style list of every write in this session,
 * with the unified diff of the selected change next to it.
 */
export function ChangesPanel({ store }: PanelProps) {
    const filter = store.changesFilter.trim().toLowerCase();
    const records = filter === ''
        ? store.changes
        : store.changes.filter(record =>
            record.collectionName.toLowerCase().includes(filter) ||
            record.documentId.toLowerCase().includes(filter)
        );
    const selected = records[store.selectedChangeIndex];

    return (
        <div className="rxdbv-main">
            <div className="rxdbv-toolbar">
                <span className="rxdbv-panel-title">Changes</span>
                <span
                    className="rxdbv-dot"
                    style={{
                        background: store.changesPaused
                            ? DB_VIEWER_COLORS.fgDim
                            : DB_VIEWER_COLORS.success
                    }}
                />
                <span className="rxdbv-dim" style={{ fontSize: '10px' }}>
                    {(store.changesPaused ? 'paused' : 'recording') + ' · ' +
                        formatNumber(store.sessionWriteCount) + ' writes this session'}
                </span>
                <div className="rxdbv-query-input-wrap" style={{ flex: '0 0 220px' }}>
                    <input
                        className="rxdbv-query-input"
                        value={store.changesFilter}
                        placeholder="filter: collection or id…"
                        onChange={event => {
                            store.changesFilter = event.target.value;
                            store.selectedChangeIndex = 0;
                            store.emit();
                        }}
                    />
                </div>
                <div className="rxdbv-grow" />
                <button
                    className="rxdbv-btn rxdbv-btn-small"
                    onClick={() => {
                        store.changesPaused = !store.changesPaused;
                        store.emit();
                    }}
                >{store.changesPaused ? 'Resume' : 'Pause'}</button>
                <button
                    className="rxdbv-btn rxdbv-btn-small"
                    onClick={() => {
                        store.changes = [];
                        store.selectedChangeIndex = 0;
                        store.emit();
                    }}
                >Clear</button>
            </div>

            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <div className="rxdbv-scroll" style={{ borderRight: '1px solid rgba(255,255,255,0.10)' }}>
                    <GridHead
                        columns={COLUMNS}
                        cells={['time', 'op', 'collection', 'id', 'rev']}
                    />
                    {records.length === 0 && (
                        <div className="rxdbv-dim" style={{ padding: '8px 12px', fontSize: '11px' }}>
                            {store.changes.length === 0
                                ? 'No writes yet. This list fills as the app writes documents.'
                                : 'No change matches the filter.'}
                        </div>
                    )}
                    {records.map((record, index) => (
                        <GridRow
                            key={record.time + '-' + record.documentId + '-' + index}
                            className={'rxdbv-tr' + (index === store.selectedChangeIndex ? ' rxdbv-selected' : '')}
                            columns={COLUMNS}
                            onClick={() => {
                                store.selectedChangeIndex = index;
                                store.emit();
                            }}
                            cells={[
                                <span className="rxdbv-mono rxdbv-dim">{formatClock(record.time)}</span>,
                                <span
                                    className="rxdbv-mono"
                                    style={{ color: OPERATION_COLORS[record.operation], fontWeight: 700 }}
                                >{record.operation}</span>,
                                <span className="rxdbv-mono">{record.collectionName}</span>,
                                <span className="rxdbv-mono rxdbv-muted">{record.documentId}</span>,
                                <span className="rxdbv-mono rxdbv-dim">{revisionLabel(record)}</span>
                            ]}
                        />
                    ))}
                </div>
                {selected && <Detail store={store} record={selected} />}
            </div>
        </div>
    );
}

function revisionLabel(record: DbViewerChangeRecord): string {
    return record.previousRevision
        ? shortRevision(record.previousRevision) + ' → ' + shortRevision(record.revision)
        : shortRevision(record.revision);
}

function Detail({ store, record }: { store: PanelProps['store']; record: DbViewerChangeRecord; }) {
    const lines = diffJson(
        record.previousDocumentData,
        record.operation === 'DELETE' ? undefined : record.documentData
    );
    return (
        <div className="rxdbv-detail">
            <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                padding: '8px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                fontSize: '11px'
            }}>
                <span
                    className="rxdbv-mono"
                    style={{ color: OPERATION_COLORS[record.operation], fontWeight: 700 }}
                >{record.operation}</span>
                <span className="rxdbv-mono">{record.collectionName + ' / ' + record.documentId}</span>
                <span className="rxdbv-mono rxdbv-dim">{revisionLabel(record)}</span>
                <div className="rxdbv-grow" />
                <a
                    style={{ fontSize: '10px' }}
                    onClick={() => {
                        store.getView(record.collectionName).openDocumentId = record.documentId;
                        store.navigate({ kind: 'collection', name: record.collectionName });
                    }}
                >open document</a>
            </div>
            <DiffView lines={lines} />
            <div className="rxdbv-dim" style={{ padding: '0 12px 12px', fontSize: '10px' }}>
                {'source: ' + (record.source === 'db-viewer' ? 'written by this viewer' : 'local write') +
                    ' · ' + formatClock(record.time)}
            </div>
        </div>
    );
}
