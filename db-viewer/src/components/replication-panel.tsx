import { formatBytes, formatClock, shortRevision } from '../format.ts';
import { DB_VIEWER_COLORS } from '../theme.ts';
import { GridHead, GridRow } from './grid.tsx';
import type { PanelProps } from '../app.tsx';
import type { DbViewerReplicationInfo } from '../../../src/plugins/db-viewer/protocol.ts';

const COLUMNS = '110px 110px 110px 1fr 1fr';

function direction(configured: boolean, replication: DbViewerReplicationInfo) {
    if (!configured) {
        return { label: '– none', color: DB_VIEWER_COLORS.fgDim };
    }
    if (replication.error) {
        return { label: '▲ error', color: DB_VIEWER_COLORS.danger };
    }
    if (replication.canceled) {
        return { label: '■ stopped', color: DB_VIEWER_COLORS.fgMuted };
    }
    if (replication.active) {
        return { label: '● streaming', color: DB_VIEWER_COLORS.success };
    }
    return { label: '○ idle', color: DB_VIEWER_COLORS.fgDim };
}

/**
 * One row per replicating collection plus the feed of documents that
 * actually crossed the wire. Pending counts are deliberately absent.
 */
export function ReplicationPanel({ store, snapshot }: PanelProps) {
    const replicated = snapshot.collections.filter(
        collection => collection.replications.length > 0
    );

    return (
        <div className="rxdbv-main rxdbv-scroll">
            <div className="rxdbv-toolbar">
                <span className="rxdbv-panel-title">Replication</span>
                <span className="rxdbv-muted" style={{ fontSize: '11px' }}>
                    {replicated.length + ' collection' + (replicated.length === 1 ? '' : 's') + ' replicating'}
                </span>
            </div>

            {replicated.length === 0 ? (
                <div className="rxdbv-center">
                    <div className="rxdbv-center-inner">
                        <div className="rxdbv-center-title">No replication is running</div>
                        <div className="rxdbv-center-body">
                            Start one with a replication plugin and it shows up here with its
                            state, checkpoint and live feed.
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <GridHead
                        columns={COLUMNS}
                        cells={['collection', 'pull', 'push', 'checkpoint', 'last error']}
                    />
                    {replicated.map(collection => collection.replications.map((replication, index) => {
                        const pull = direction(replication.hasPull, replication);
                        const push = direction(replication.hasPush, replication);
                        const error = replication.error;
                        return (
                            <GridRow
                                key={collection.name + '-' + index}
                                className="rxdbv-tr rxdbv-static"
                                columns={COLUMNS}
                                cells={[
                                    <span className="rxdbv-mono">{collection.name}</span>,
                                    <span style={{ color: pull.color }}>{pull.label}</span>,
                                    <span style={{ color: push.color }}>{push.label}</span>,
                                    <span
                                        className="rxdbv-mono rxdbv-muted"
                                        style={{ fontSize: '10.5px' }}
                                        title={replication.checkpoint}
                                    >{replication.checkpoint}</span>,
                                    <span
                                        className="rxdbv-mono"
                                        style={{
                                            fontSize: '10.5px',
                                            color: error ? DB_VIEWER_COLORS.danger : DB_VIEWER_COLORS.fgDim
                                        }}
                                        title={error ? error.message : ''}
                                    >
                                        {error
                                            ? '✕ ' + error.message + ' · ' + formatClock(error.time) +
                                            ' · ' + error.attempts + ' attempts'
                                            : 'none'}
                                    </span>
                                ]}
                            />
                        );
                    }))}
                    <Feed store={store} snapshot={snapshot} />
                </>
            )}
        </div>
    );
}

function Feed({ store, snapshot }: { store: PanelProps['store']; snapshot: PanelProps['snapshot']; }) {
    const disabled = Boolean(snapshot.dump);
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 12px 4px' }}>
                <span className="rxdbv-section-label">LIVE FEED</span>
                <span
                    className="rxdbv-dot"
                    style={{
                        background: store.replicationFeedPaused
                            ? DB_VIEWER_COLORS.fgDim
                            : DB_VIEWER_COLORS.success
                    }}
                />
                <span className="rxdbv-dim" style={{ fontSize: '10px' }}>
                    {disabled
                        ? 'not available on a dump'
                        : 'documents received and sent, newest first'}
                </span>
                <div className="rxdbv-grow" />
                <button
                    className="rxdbv-btn rxdbv-btn-small"
                    disabled={disabled}
                    onClick={() => {
                        store.replicationFeedPaused = !store.replicationFeedPaused;
                        store.emit();
                    }}
                >{store.replicationFeedPaused ? 'Resume' : 'Pause'}</button>
            </div>

            {store.replicationFeed.length === 0 ? (
                <div className="rxdbv-dim" style={{ padding: '6px 12px', fontSize: '11px' }}>
                    Nothing has crossed the wire since the database viewer opened.
                </div>
            ) : store.replicationFeed.slice(0, snapshot.pageSize).map((record, index) => (
                <div
                    key={index}
                    className="rxdbv-mono"
                    style={{
                        display: 'flex',
                        gap: '12px',
                        margin: '0 12px',
                        padding: '4px 10px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        fontSize: '11px',
                        alignItems: 'center'
                    }}
                >
                    <span style={{
                        width: '12px',
                        fontWeight: 700,
                        color: record.direction === 'pull' ? DB_VIEWER_COLORS.info : DB_VIEWER_COLORS.pink
                    }}>{record.direction === 'pull' ? '↓' : '↑'}</span>
                    <span className="rxdbv-dim" style={{ width: '90px' }}>{formatClock(record.time)}</span>
                    <span style={{ width: '70px' }}>{record.collectionName}</span>
                    <span className="rxdbv-muted" style={{ width: '70px' }}>{record.documentId}</span>
                    <span className="rxdbv-dim rxdbv-grow">
                        {shortRevision(record.revision) + ' · ' + formatBytes(record.bytes)}
                    </span>
                </div>
            ))}
        </div>
    );
}
