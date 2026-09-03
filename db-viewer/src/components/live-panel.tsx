import { useEffect, useRef, useState } from 'react';
import { formatAge, formatNumber, formatRate } from '../format.ts';
import { DB_VIEWER_COLORS } from '../theme.ts';
import { METRICS_WINDOW_MS } from '../store.ts';
import { replicationGlyph } from '../app.tsx';
import { GridHead, GridRow } from './grid.tsx';
import type { PanelProps } from '../app.tsx';
import type { CollectionMetrics, ViewerStore } from '../store.ts';
import type { DbViewerLiveEvent } from '../../../src/types/index.d.ts';
import type { DbViewerLiveQueryInfo } from '../../../src/plugins/db-viewer/protocol.ts';

/**
 * Which sub panel of the Live map is open. `LivePanel` only renders
 * `SubPanel` once this is set, so it is passed down non-null.
 */
type SubPanelState = NonNullable<ViewerStore['liveSubPanel']>;

/**
 * Above this rate a lane stops drawing single particles and becomes a
 * moving band whose speed maps log-scale to the rate.
 */
const BURST_EVENTS_PER_SECOND = 200;
const PARTICLE_TRAVEL_MS = 2200;
/**
 * A node border may only pulse four times per second.
 */
const PULSE_INTERVAL_MS = 250;
const SUB_PANEL_COLUMNS = '1fr 90px 90px 90px 110px';

type ParticleSpec = { glyph: string; color: string; direction: 'right' | 'left'; };

const PARTICLES: { [key in DbViewerLiveEvent['kind']]: ParticleSpec } = {
    insert: { glyph: '+', color: DB_VIEWER_COLORS.success, direction: 'right' },
    update: { glyph: '~', color: DB_VIEWER_COLORS.warning, direction: 'right' },
    delete: { glyph: '-', color: DB_VIEWER_COLORS.danger, direction: 'right' },
    query: { glyph: '?', color: DB_VIEWER_COLORS.info, direction: 'left' },
    emit: { glyph: '◆', color: DB_VIEWER_COLORS.info, direction: 'left' },
    pull: { glyph: '↓', color: DB_VIEWER_COLORS.replication, direction: 'left' },
    push: { glyph: '↑', color: DB_VIEWER_COLORS.replication, direction: 'right' }
};

const LEGEND: { glyph: string; label: string; color: string; }[] = [
    { glyph: '+', label: 'insert', color: DB_VIEWER_COLORS.success },
    { glyph: '~', label: 'update', color: DB_VIEWER_COLORS.warning },
    { glyph: '-', label: 'delete', color: DB_VIEWER_COLORS.danger },
    { glyph: '?', label: 'query', color: DB_VIEWER_COLORS.info },
    { glyph: '◆', label: 'emit', color: DB_VIEWER_COLORS.info },
    { glyph: '↑↓', label: 'replication', color: DB_VIEWER_COLORS.replication }
];

/**
 * Draws the database as app, collections and remote, with per collection
 * write rates over the last 60 seconds.
 *
 * Only names, counts and rates are drawn, never document contents,
 * so the screen stays safe to share.
 */
export function LivePanel(props: PanelProps) {
    const { store, client } = props;
    const now = Date.now();
    const lanes = useRef(new Map<string, HTMLDivElement | null>());
    const nodes = useRef(new Map<string, { element: HTMLElement | null; lastPulse: number; }>());

    /**
     * The particles are appended straight into the DOM instead of going
     * through state: at a few hundred events per second, re-rendering the
     * whole map for every single one would spend the entire frame budget.
     */
    useEffect(() => client.on('live', event => {
        if (store.livePaused) {
            return;
        }
        const spec = PARTICLES[event.kind];
        const lane = lanes.current.get(laneKey(event));
        if (lane && spec) {
            spawnParticle(lane, spec);
        }
        const node = nodes.current.get(event.collectionName);
        if (node && node.element && Date.now() - node.lastPulse > PULSE_INTERVAL_MS) {
            node.lastPulse = Date.now();
            node.element.classList.remove('rxdbv-node-pulse');
            void node.element.offsetWidth;
            node.element.classList.add('rxdbv-node-pulse');
        }
    }), [store.livePaused]);

    if (store.liveSubPanel) {
        return <SubPanel {...props} subPanel={store.liveSubPanel} />;
    }

    return (
        <div className="rxdbv-main rxdbv-scroll">
            <div className="rxdbv-toolbar">
                <span className="rxdbv-panel-title">Live</span>
                <span
                    className={'rxdbv-dot' + (store.livePaused ? '' : ' rxdbv-blink')}
                    style={{
                        background: store.livePaused ? DB_VIEWER_COLORS.fgDim : DB_VIEWER_COLORS.success
                    }}
                />
                <span className="rxdbv-dim rxdbv-mono" style={{ fontSize: '10px' }}>60s window</span>
                <div className="rxdbv-legend">
                    {LEGEND.map(entry => (
                        <span key={entry.label}>
                            <span style={{ color: entry.color, fontWeight: 700 }}>{entry.glyph}</span>
                            {' ' + entry.label}
                        </span>
                    ))}
                </div>
                <div className="rxdbv-grow" />
                <button
                    className="rxdbv-btn rxdbv-btn-small"
                    onClick={() => {
                        store.livePaused = !store.livePaused;
                        store.emit();
                    }}
                >{store.livePaused ? 'Resume' : 'Pause'}</button>
            </div>

            <div className="rxdbv-map">
                <AppColumn {...props} now={now} />
                <div className="rxdbv-map-rows">
                    <div style={{
                        display: 'flex',
                        fontSize: '9px',
                        letterSpacing: '0.09em',
                        color: DB_VIEWER_COLORS.fgDim,
                        fontWeight: 600
                    }}>
                        <div className="rxdbv-grow" />
                        <div style={{ width: '296px', minWidth: '296px' }}>COLLECTIONS</div>
                        <div className="rxdbv-grow" />
                        <div style={{ width: '186px', minWidth: '186px' }}>REMOTE</div>
                    </div>
                    {store.collectionNames.length === 0 && (
                        <div className="rxdbv-dim" style={{ padding: '12px 0', lineHeight: 1.55 }}>
                            No collections yet. This screen updates as the app reads and writes.
                        </div>
                    )}
                    {store.collectionNames.map(collectionName => (
                        <MapRow
                            key={collectionName}
                            {...props}
                            collectionName={collectionName}
                            now={now}
                            lanes={lanes.current}
                            nodes={nodes.current}
                        />
                    ))}
                </div>
            </div>

            <Summary {...props} now={now} />
        </div>
    );
}

function laneKey(event: DbViewerLiveEvent): string {
    const side = (event.kind === 'pull' || event.kind === 'push') ? 'out' : 'in';
    return event.collectionName + '|' + side;
}

function spawnParticle(lane: HTMLElement, spec: ParticleSpec): void {
    const particle = document.createElement('span');
    particle.className = 'rxdbv-particle';
    particle.textContent = spec.glyph;
    particle.style.color = spec.color;
    particle.style.animation =
        (spec.direction === 'right' ? 'rxdbvFlowR ' : 'rxdbvFlowL ') +
        PARTICLE_TRAVEL_MS + 'ms linear forwards';
    lane.appendChild(particle);
    window.setTimeout(() => particle.remove(), PARTICLE_TRAVEL_MS);
}

function AppColumn({ store, snapshot, now }: PanelProps & { now: number; }) {
    const windowSeconds = METRICS_WINDOW_MS / 1000;
    const totalWrites = store.collectionNames.reduce(
        (sum, name) => sum + store.getMetrics(name).writes.total(now), 0
    );
    const totalReads = store.collectionNames.reduce(
        (sum, name) => sum + store.getMetrics(name).reads.total(now), 0
    );
    return (
        <div className="rxdbv-map-col">
            <div className="rxdbv-section-label">APP</div>
            <div className="rxdbv-node rxdbv-node-app">
                <div className="rxdbv-row" style={{ gap: '6px' }}>
                    <span className="rxdbv-mono" style={{ fontWeight: 700, fontSize: '11px' }}>
                        this tab
                    </span>
                    <div className="rxdbv-grow" />
                    {snapshot.isLeader === true && <span className="rxdbv-badge-success">leader</span>}
                </div>
                <div className="rxdbv-mono rxdbv-dim" style={{ fontSize: '9.5px', marginTop: '4px' }}>
                    {'embedded · ' + shortPath()}
                </div>
                <div
                    className="rxdbv-mono rxdbv-muted"
                    style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '9.5px' }}
                >
                    <span>
                        <span style={{ color: DB_VIEWER_COLORS.pink }}>w</span>
                        {' ' + formatRate(totalWrites / windowSeconds) + '/s'}
                    </span>
                    <span>
                        <span style={{ color: DB_VIEWER_COLORS.info }}>?</span>
                        {' ' + formatRate(totalReads / windowSeconds) + '/s'}
                    </span>
                </div>
            </div>
            <div
                className="rxdbv-node rxdbv-node-clickable"
                style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                    store.liveSubPanel = { kind: 'instances' };
                    store.emit();
                }}
            >
                <span className="rxdbv-mono" style={{ fontSize: '11px' }}>open instances</span>
                <div className="rxdbv-grow" />
                <span className="rxdbv-dim">›</span>
            </div>
            <div className="rxdbv-node-dashed">
                <div className="rxdbv-mono" style={{ fontSize: '10.5px' }}>viewer writes</div>
                <div className="rxdbv-mono rxdbv-dim" style={{ fontSize: '9.5px', marginTop: '3px' }}>
                    {formatNumber(store.viewerWriteCount) + ' total · from this viewer'}
                </div>
            </div>
            <div className="rxdbv-grow" />
            <div className="rxdbv-dim" style={{ fontSize: '9.5px', lineHeight: 1.5 }}>
                Fixed positions. No document contents are drawn — names, counts and rates only.
            </div>
        </div>
    );
}

/**
 * The path of the embedding app is not reachable from a cross origin
 * iframe, and a long one wrapped over five lines anyway.
 */
function shortPath(): string {
    const referrer = document.referrer;
    if (!referrer) {
        return 'host page';
    }
    try {
        const origin = new URL(referrer).origin;
        return origin.length > 24 ? '…' + origin.slice(-23) : origin;
    } catch (error) {
        return 'host page';
    }
}

function MapRow({ store, client, collectionName, now, lanes, nodes }: PanelProps & {
    collectionName: string;
    now: number;
    lanes: Map<string, HTMLDivElement | null>;
    nodes: Map<string, { element: HTMLElement | null; lastPulse: number; }>;
}) {
    const metrics = store.getMetrics(collectionName);
    const collection = store.getCollection(collectionName);
    const windowSeconds = METRICS_WINDOW_MS / 1000;
    const writes = metrics.writes.total(now);
    const reads = metrics.reads.total(now);
    const writeRate = writes / windowSeconds;
    const pulls = metrics.pulls.total(now);
    const pushes = metrics.pushes.total(now);
    const idle = metrics.lastWriteAt === 0 || (now - metrics.lastWriteAt) > METRICS_WINDOW_MS;
    const hasRemote = collection ? collection.replications.length > 0 : false;
    const errored = collection ? collection.replications.some(entry => entry.error) : false;
    const [liveQueryCount, setLiveQueryCount] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const read = () => {
            client.call('liveQueries', { collectionName })
                .then(result => {
                    if (!cancelled) {
                        setLiveQueryCount(result.filter(info => info.subscribers > 0).length);
                    }
                })
                .catch(() => undefined);
        };
        read();
        const interval = window.setInterval(read, 2000);
        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [collectionName]);

    return (
        <div className="rxdbv-map-row">
            <Lane
                side="in"
                laneRef={element => lanes.set(collectionName + '|in', element)}
                band={writeRate > BURST_EVENTS_PER_SECOND
                    ? { rate: writeRate, color: DB_VIEWER_COLORS.warning, unit: 'w/s' }
                    : null}
                thread={liveQueryCount > 0}
                label={idle
                    ? (metrics.lastWriteAt === 0
                        ? 'no events yet'
                        : 'last write ' + formatAge(metrics.lastWriteAt, now))
                    : formatRate(writeRate) + ' w/s in · ' + formatRate(reads / windowSeconds) + ' ?/s out'}
            />
            <CollectionNode
                store={store}
                collectionName={collectionName}
                metrics={metrics}
                now={now}
                liveQueryCount={liveQueryCount}
                nodeRef={element => {
                    const existing = nodes.get(collectionName);
                    nodes.set(collectionName, {
                        element,
                        lastPulse: existing ? existing.lastPulse : 0
                    });
                }}
            />
            <Lane
                side="out"
                laneRef={element => lanes.set(collectionName + '|out', element)}
                band={null}
                thread={false}
                errored={errored}
                label={hasRemote
                    ? '↓ ' + formatNumber(pulls) + ' · ↑ ' + formatNumber(pushes) + ' in 60s'
                    : ''}
            />
            <RemoteNode store={store} collectionName={collectionName} />
        </div>
    );
}

function Lane({ side, laneRef, band, thread, label, errored = false }: {
    side: 'in' | 'out';
    laneRef: (element: HTMLDivElement | null) => void;
    band: { rate: number; color: string; unit: string; } | null;
    thread: boolean;
    label: string;
    errored?: boolean;
}) {
    /**
     * Above the burst threshold the exact number always sits next to the
     * band, so the picture stays readable with motion disabled.
     */
    const durationSeconds = band
        ? Math.max(0.15, 1.2 - (Math.log10(band.rate) * 0.28))
        : 0;
    return (
        <div
            className="rxdbv-lane"
            style={side === 'in' ? { paddingRight: '6px' } : { paddingLeft: '6px' }}
        >
            {band ? (
                <div className="rxdbv-row" style={{ gap: '8px' }}>
                    <div
                        className="rxdbv-band"
                        style={{
                            background: 'repeating-linear-gradient(90deg,' + band.color +
                                ' 0 6px,rgba(255,255,255,0.08) 6px 24px)',
                            animation: 'rxdbvBand ' + durationSeconds.toFixed(2) + 's linear infinite'
                        }}
                    />
                    <span className="rxdbv-mono rxdbv-muted" style={{ fontSize: '10px' }}>
                        {formatNumber(band.rate) + ' ' + band.unit}
                    </span>
                </div>
            ) : (
                /**
                 * The particles are positioned against the track, which is the
                 * only element in here with a positioning context.
                 */
                <div className="rxdbv-track" ref={laneRef}>
                    <div className={'rxdbv-track-line' + (errored ? ' rxdbv-track-line-error' : '')} />
                </div>
            )}
            {thread && (
                <div className="rxdbv-track">
                    <div className="rxdbv-track-line rxdbv-track-line-thread" />
                </div>
            )}
            <div className="rxdbv-mono rxdbv-dim" style={{ fontSize: '9px' }}>{label}</div>
        </div>
    );
}

function CollectionNode({ store, collectionName, metrics, now, liveQueryCount, nodeRef }: {
    store: PanelProps['store'];
    collectionName: string;
    metrics: CollectionMetrics;
    now: number;
    liveQueryCount: number;
    nodeRef: (element: HTMLElement | null) => void;
}) {
    const series = metrics.writes.series(now);
    const peak = Math.max(1, ...series);
    return (
        <div className="rxdbv-node rxdbv-node-collection" ref={nodeRef}>
            <div className="rxdbv-row" style={{ gap: '6px' }}>
                <span
                    className="rxdbv-mono rxdbv-node-name"
                    onClick={() => store.navigate({ kind: 'collection', name: collectionName })}
                >{collectionName}</span>
                <div className="rxdbv-grow" />
                <span className="rxdbv-mono rxdbv-dim" style={{ fontSize: '9.5px' }}>
                    {formatNumber(store.counts[collectionName] ?? 0)}
                </span>
            </div>
            <div className="rxdbv-spark">
                {series.map((value, index) => (
                    <span
                        key={index}
                        className="rxdbv-spark-bar"
                        style={{
                            height: Math.max(1, Math.round((value / peak) * 18)) + 'px',
                            background: value === 0 ? DB_VIEWER_COLORS.neutralBar : DB_VIEWER_COLORS.pink
                        }}
                    />
                ))}
            </div>
            {liveQueryCount > 0 && (
                <div
                    className="rxdbv-mono rxdbv-node-link"
                    onClick={() => {
                        store.liveSubPanel = { kind: 'queries', collectionName };
                        store.emit();
                    }}
                >
                    {liveQueryCount + ' live quer' + (liveQueryCount === 1 ? 'y' : 'ies') + ' ›'}
                </div>
            )}
        </div>
    );
}

function RemoteNode({ store, collectionName }: {
    store: PanelProps['store'];
    collectionName: string;
}) {
    const collection = store.getCollection(collectionName);
    const replications = collection ? collection.replications : [];
    if (replications.length === 0) {
        return (
            <div className="rxdbv-node rxdbv-node-remote rxdbv-node-empty">
                <span className="rxdbv-dim rxdbv-mono" style={{ fontSize: '9.5px' }}>
                    no replication
                </span>
            </div>
        );
    }
    const glyph = replicationGlyph(store, collectionName);
    return (
        <div className="rxdbv-node rxdbv-node-remote">
            <div className="rxdbv-row" style={{ gap: '6px' }}>
                <span style={{ color: glyph.color, fontSize: '10px' }} title={glyph.state}>
                    {glyph.glyph}
                </span>
                <span className="rxdbv-mono" style={{ fontSize: '10.5px' }}>{glyph.state}</span>
            </div>
            {replications.map((replication, index) => (
                <div
                    key={index}
                    className="rxdbv-mono rxdbv-dim"
                    style={{ fontSize: '9px', marginTop: '3px' }}
                    title={replication.identifier}
                >
                    {(replication.hasPull ? '↓' : '') + (replication.hasPush ? '↑' : '') + ' ' +
                        truncate(replication.identifier, 20)}
                </div>
            ))}
        </div>
    );
}

function truncate(value: string, max: number): string {
    return value.length > max ? value.slice(0, max - 1) + '…' : value;
}

function Summary({ store, now }: PanelProps & { now: number; }) {
    const windowSeconds = METRICS_WINDOW_MS / 1000;
    const totals = store.collectionNames.reduce((accumulator, name) => {
        const metrics = store.getMetrics(name);
        accumulator.writes += metrics.writes.total(now);
        accumulator.reads += metrics.reads.total(now);
        accumulator.pulls += metrics.pulls.total(now);
        accumulator.pushes += metrics.pushes.total(now);
        return accumulator;
    }, { writes: 0, reads: 0, pulls: 0, pushes: 0 });

    const card = (label: string, value: string, color?: string) => (
        <div className="rxdbv-card" key={label}>
            <div className="rxdbv-section-label">{label}</div>
            <div className="rxdbv-card-value" style={color ? { color } : undefined}>{value}</div>
        </div>
    );

    return (
        <>
            <div className="rxdbv-cards">
                {card('WRITES / S', formatRate(totals.writes / windowSeconds), DB_VIEWER_COLORS.pink)}
                {card('READS / S', formatRate(totals.reads / windowSeconds), DB_VIEWER_COLORS.info)}
                {card('PULLED', formatNumber(totals.pulls), DB_VIEWER_COLORS.replication)}
                {card('PUSHED', formatNumber(totals.pushes), DB_VIEWER_COLORS.replication)}
            </div>
            <div className="rxdbv-dim" style={{ padding: '0 12px 16px', fontSize: '10px', lineHeight: 1.6 }}>
                Reads and live query emits are derived from the query cache rather than from a
                dedicated event stream, so those two counters update once per second.
            </div>
        </>
    );
}

function SubPanel({ store, snapshot, client, subPanel }: PanelProps & {
    subPanel: SubPanelState;
}) {
    const collectionName = subPanel.kind === 'queries' ? subPanel.collectionName : null;
    const [queries, setQueries] = useState<DbViewerLiveQueryInfo[]>([]);

    useEffect(() => {
        if (collectionName === null) {
            return;
        }
        let cancelled = false;
        client.call('liveQueries', { collectionName })
            .then(result => {
                if (!cancelled) {
                    setQueries(result);
                }
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [collectionName]);

    return (
        <div className="rxdbv-main rxdbv-scroll">
            <div className="rxdbv-toolbar">
                <span
                    className="rxdbv-close"
                    onClick={() => {
                        store.liveSubPanel = null;
                        store.emit();
                    }}
                >‹</span>
                <span className="rxdbv-panel-title">
                    {subPanel.kind === 'instances' ? 'Open instances' : 'Live queries'}
                </span>
                {collectionName !== null && (
                    <span className="rxdbv-mono rxdbv-muted" style={{ fontSize: '11px' }}>
                        {collectionName}
                    </span>
                )}
            </div>

            {subPanel.kind === 'instances' ? (
                <div style={{ padding: '12px' }}>
                    <div className="rxdbv-node rxdbv-node-app" style={{ maxWidth: '420px' }}>
                        <div className="rxdbv-row" style={{ gap: '6px' }}>
                            <span className="rxdbv-mono" style={{ fontWeight: 700 }}>this tab</span>
                            <div className="rxdbv-grow" />
                            {snapshot.isLeader === true && (
                                <span className="rxdbv-badge-success">leader</span>
                            )}
                            {snapshot.isLeader === false && (
                                <span className="rxdbv-badge">follower</span>
                            )}
                            {snapshot.isLeader === null && (
                                <span className="rxdbv-badge">unknown</span>
                            )}
                        </div>
                    </div>
                    <div className="rxdbv-dim" style={{ fontSize: '11px', marginTop: '10px', lineHeight: 1.6 }}>
                        {snapshot.isLeader === null
                            ? 'Leadership is only known when the leader-election plugin is added. '
                            : ''}
                        RxDB does not publish a roster of the other open instances, so only this
                        one can be listed here.
                    </div>
                </div>
            ) : (
                <>
                    <GridHead
                        columns={SUB_PANEL_COLUMNS}
                        cells={['query', 'subscribers', 'results', 'emits', 'last emit']}
                    />
                    {queries.length === 0 && (
                        <div className="rxdbv-dim" style={{ padding: '8px 12px', fontSize: '11px' }}>
                            No query of this collection is cached right now.
                        </div>
                    )}
                    {queries.map((info, index) => (
                        <GridRow
                            key={index}
                            className="rxdbv-tr rxdbv-static"
                            columns={SUB_PANEL_COLUMNS}
                            cells={[
                                <span className="rxdbv-mono" style={{ fontSize: '10px' }}>
                                    {info.stringRepresentation}
                                </span>,
                                <span className="rxdbv-mono">{formatNumber(info.subscribers)}</span>,
                                <span className="rxdbv-mono rxdbv-muted">{formatNumber(info.resultCount)}</span>,
                                <span className="rxdbv-mono rxdbv-muted">{formatNumber(info.emitCount)}</span>,
                                <span className="rxdbv-mono rxdbv-dim">
                                    {info.lastEmitAt === 0 ? 'never' : formatAge(info.lastEmitAt)}
                                </span>
                            ]}
                        />
                    ))}
                </>
            )}
        </div>
    );
}
