import { useEffect, useState } from 'react';
import { formatBytes, formatNumber } from '../format.ts';
import { DB_VIEWER_COLORS } from '../theme.ts';
import { GridHead, GridRow } from './grid.tsx';
import type { PanelProps } from '../app.tsx';
import type { DbViewerStorageReport } from '../../../src/plugins/db-viewer/protocol.ts';

const COLUMNS = '1fr 120px 120px 140px';
const TOMBSTONE_MAX_AGE_DAYS = 31;

type Row = DbViewerStorageReport & { collectionName: string; };

export function StoragePanel({ store, snapshot, client, notify }: PanelProps) {
    const [rows, setRows] = useState<Row[] | null>(null);
    const [running, setRunning] = useState(false);
    const names = store.collectionNames;

    useEffect(() => {
        let cancelled = false;
        Promise.all(
            names.map(async collectionName => ({
                collectionName,
                ...(await client.call('storageReport', { collectionName }))
            }))
        ).then(result => {
            if (!cancelled) {
                setRows(result);
            }
        }).catch(error => {
            if (!cancelled) {
                notify((error as Error).message);
                setRows([]);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [names.join(','), running]);

    const totalTombstones = (rows ?? []).reduce(
        (sum, row) => sum + (row.tombstoneCount ?? 0),
        0
    );

    const runCleanup = async () => {
        setRunning(true);
        try {
            await Promise.all(
                names.map(collectionName => client.call('cleanup', { collectionName }))
            );
        } catch (error) {
            notify((error as Error).message);
        }
        setRunning(false);
    };

    return (
        <div className="rxdbv-main rxdbv-scroll">
            <div className="rxdbv-toolbar">
                <span className="rxdbv-panel-title">Storage</span>
                <span className="rxdbv-muted" style={{ fontSize: '11px' }}>{snapshot.storageName}</span>
            </div>

            <GridHead
                columns={COLUMNS}
                cells={['collection', 'documents', 'tombstones', 'attachment bytes']}
            />
            {rows === null && (
                <div className="rxdbv-dim" style={{ padding: '8px 12px' }}>reading the storage…</div>
            )}
            {(rows ?? []).map(row => (
                <GridRow
                    key={row.collectionName}
                    className="rxdbv-tr rxdbv-static"
                    columns={COLUMNS}
                    cells={[
                        <span className="rxdbv-mono">{row.collectionName}</span>,
                        <span className="rxdbv-mono">{formatNumber(row.documentCount)}</span>,
                        <span className="rxdbv-mono rxdbv-muted">
                            {row.tombstoneCount === null ? 'unknown' : formatNumber(row.tombstoneCount)}
                        </span>,
                        <span className="rxdbv-mono rxdbv-muted">{formatBytes(row.attachmentBytes)}</span>
                    ]}
                />
            ))}

            <div style={{ padding: '16px 12px 8px' }}>
                <div className="rxdbv-section-label">CLEANUP</div>
                <div className="rxdbv-dim" style={{ fontSize: '11px', margin: '6px 0 10px' }}>
                    {'Purges tombstones older than ' + TOMBSTONE_MAX_AGE_DAYS +
                        ' days. Peers whose replication checkpoint predates the cleanup must re-sync from scratch.'}
                </div>
                {!snapshot.hasCleanupPlugin && (
                    <div className="rxdbv-dim" style={{ fontSize: '11px', marginBottom: '8px' }}>
                        Add the cleanup plugin to run this from here.
                    </div>
                )}
                <button
                    className="rxdbv-btn rxdbv-btn-danger"
                    disabled={
                        running ||
                        store.readOnly ||
                        !snapshot.hasCleanupPlugin ||
                        totalTombstones === 0
                    }
                    title={store.readOnly ? 'the database viewer is read-only in this mode' : ''}
                    onClick={() => void runCleanup()}
                >
                    {running
                        ? 'Running cleanup…'
                        : 'Run cleanup — purge ' + formatNumber(totalTombstones) + ' tombstones'}
                </button>
            </div>

            <div style={{ padding: '8px 12px 20px' }}>
                <div className="rxdbv-section-label">INSTANCES</div>
                <div style={{ fontSize: '11px', marginTop: '6px' }}>
                    <span style={{
                        color: snapshot.isLeader === null
                            ? DB_VIEWER_COLORS.fgDim
                            : (snapshot.isLeader ? DB_VIEWER_COLORS.success : DB_VIEWER_COLORS.fgMuted)
                    }}>
                        {snapshot.isLeader === null
                            ? 'leadership unknown'
                            : (snapshot.isLeader ? 'this instance is the leader' : 'this instance is a follower')}
                    </span>
                    <span className="rxdbv-dim">
                        {snapshot.isLeader === null
                            ? ' — add the leader-election plugin to see it'
                            : ''}
                    </span>
                </div>
                <div className="rxdbv-dim" style={{ fontSize: '11px', marginTop: '4px' }}>
                    RxDB does not publish a roster of the other open instances, so only this one is listed.
                </div>
            </div>
        </div>
    );
}
