import { DB_VIEWER_COLORS } from '../theme.ts';
import type { PanelProps } from '../app.tsx';
import type { DbViewerConnectionStage } from '../../../src/types/index.d.ts';
import type { DbViewerConnectionWire } from '../../../src/plugins/db-viewer/protocol.ts';

/**
 * Connecting and failing are full screens, not toasts, because they are
 * the only thing the user can act on at that moment.
 */
export function ConnectionScreen({ store, snapshot, client }: PanelProps) {
    const connection = store.connection;
    if (connection.state === 'connecting') {
        return <Connecting connection={connection} onCancel={() => void client.call('disconnect', {})} />;
    }
    if (connection.state === 'failed') {
        return (
            <Failed
                connection={connection}
                canOpenDump={snapshot.canOpenDumpFile}
                onOpenDump={() => void client.call('openDumpFile', {})}
            />
        );
    }
    return null;
}

function Connecting({ connection, onCancel }: {
    connection: Extract<DbViewerConnectionWire, { state: 'connecting'; }>;
    onCancel: () => void;
}) {
    return (
        <div className="rxdbv-center">
            <div style={{ width: '420px', maxWidth: '100%' }}>
                <div className="rxdbv-row" style={{ gap: '10px' }}>
                    <div className="rxdbv-logo" style={{ width: '16px', height: '16px' }} />
                    <span style={{ fontWeight: 800, fontSize: '15px' }}>Connecting to remote database</span>
                </div>
                <div className="rxdbv-muted" style={{ fontSize: '11.5px', marginTop: '6px' }}>
                    {connection.pairingCode ? (
                        <span>
                            {'Pairing code '}
                            <span className="rxdbv-mono" style={{ color: DB_VIEWER_COLORS.fg }}>
                                {connection.pairingCode}
                            </span>
                            {' · usually under 10 seconds'}
                        </span>
                    ) : <span>Usually under 10 seconds</span>}
                </div>
                <div style={{
                    marginTop: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    fontSize: '12px'
                }}>
                    {connection.stages.map((stage, index) => (
                        <Stage
                            key={index}
                            stage={stage}
                            state={index < connection.currentStage
                                ? 'done'
                                : (index === connection.currentStage ? 'current' : 'pending')}
                            detail={index === connection.currentStage && connection.elapsedSeconds !== undefined
                                ? connection.elapsedSeconds + 's'
                                : undefined}
                        />
                    ))}
                </div>
                <div
                    className="rxdbv-dim"
                    style={{ marginTop: '18px', fontSize: '10.5px', lineHeight: 1.55 }}
                >
                    Restrictive networks can block peer-to-peer traffic. If this stalls past 30 seconds
                    it fails with a diagnosis, it will not retry silently.
                </div>
                <div style={{ marginTop: '14px' }}>
                    <button className="rxdbv-btn" onClick={onCancel}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

function Failed({ connection, canOpenDump, onOpenDump }: {
    connection: Extract<DbViewerConnectionWire, { state: 'failed'; }>;
    canOpenDump: boolean;
    onOpenDump: () => void;
}) {
    const failedStage = connection.stages[connection.failedStage];
    return (
        <div className="rxdbv-center">
            <div style={{ width: '480px', maxWidth: '100%' }}>
                <div className="rxdbv-row" style={{ gap: '10px' }}>
                    <span style={{
                        width: '18px',
                        height: '18px',
                        background: 'rgba(253,54,110,0.15)',
                        border: '1px solid ' + DB_VIEWER_COLORS.danger,
                        color: DB_VIEWER_COLORS.danger,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px'
                    }}>✕</span>
                    <span style={{ fontWeight: 800, fontSize: '15px' }}>Peer connection failed</span>
                </div>
                <div className="rxdbv-muted" style={{ fontSize: '11.5px', marginTop: '6px' }}>
                    {'Failed at step ' + (connection.failedStage + 1) + ' of ' + connection.stages.length +
                        (failedStage ? ' — ' + failedStage.label.toLowerCase() : '') + '.'}
                </div>
                <div style={{
                    marginTop: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '12px'
                }}>
                    {connection.stages.map((stage, index) => (
                        <Stage
                            key={index}
                            stage={stage}
                            state={index < connection.failedStage
                                ? 'done'
                                : (index === connection.failedStage ? 'failed' : 'pending')}
                        />
                    ))}
                </div>
                <div style={{
                    marginTop: '14px',
                    border: '1px solid rgba(253,54,110,0.4)',
                    background: 'rgba(253,54,110,0.06)',
                    padding: '10px 12px',
                    fontSize: '11.5px',
                    lineHeight: 1.55,
                    color: DB_VIEWER_COLORS.fgMuted
                }}>{connection.diagnosis}</div>
                <div style={{
                    marginTop: '12px',
                    border: '1px solid rgba(255,255,255,0.14)',
                    padding: '10px 12px'
                }}>
                    <div style={{ fontWeight: 700, fontSize: '12px' }}>Work from an export instead</div>
                    <div
                        className="rxdbv-muted"
                        style={{ fontSize: '11px', marginTop: '4px', lineHeight: 1.55 }}
                    >
                        {'On the device, run '}
                        <span className="rxdbv-code-inline">await db.exportJSON()</span>
                        {', save the result, and open it here. Read-only, frozen at export time.'}
                    </div>
                    <div className="rxdbv-row" style={{ gap: '10px', marginTop: '10px' }}>
                        <button
                            className="rxdbv-btn rxdbv-btn-primary"
                            disabled={!canOpenDump}
                            onClick={onOpenDump}
                        >Open dump file…</button>
                        <a
                            href="https://rxdb.info/json-dump.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '11px' }}
                        >How to export a dump</a>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Stage({ stage, state, detail }: {
    stage: DbViewerConnectionStage;
    state: 'done' | 'current' | 'failed' | 'pending';
    detail?: string;
}) {
    const glyphs = { done: '✓', current: '●', failed: '✕', pending: '○' };
    const colors = {
        done: DB_VIEWER_COLORS.success,
        current: DB_VIEWER_COLORS.pink,
        failed: DB_VIEWER_COLORS.danger,
        pending: DB_VIEWER_COLORS.fgDim
    };
    return (
        <div
            className="rxdbv-stage"
            style={state === 'pending' ? { color: DB_VIEWER_COLORS.fgDim } : undefined}
        >
            <span className="rxdbv-stage-glyph" style={{ color: colors[state] }}>{glyphs[state]}</span>
            <span style={(state === 'current' || state === 'failed') ? { fontWeight: 700 } : undefined}>
                {stage.label}
            </span>
            {stage.detail && (
                <span className="rxdbv-dim" style={{ fontSize: '10px' }}>{stage.detail}</span>
            )}
            {detail && <span className="rxdbv-dim" style={{ fontSize: '10px' }}>{detail}</span>}
        </div>
    );
}
