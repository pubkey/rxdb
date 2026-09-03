import type { Subscription } from 'rxjs';
import { button, clear, el, gridHead, gridRow, spacer } from '../dom.ts';
import { formatAge, formatNumber, formatRate } from '../format.ts';
import { DB_VIEWER_COLORS, DB_VIEWER_NARROW_BREAKPOINT } from '../theme.ts';
import { METRICS_WINDOW_MS } from '../store.ts';
import type { CollectionMetrics } from '../store.ts';
import { replicationGlyph } from './rail.ts';
import type { PanelContext } from './context.ts';
import type { DbViewerLiveEvent, RxDatabase } from '../../../types/index.d.ts';

/**
 * Above this rate a lane stops drawing single particles and
 * becomes a moving band whose speed maps log-scale to the rate.
 */
const BURST_EVENTS_PER_SECOND = 200;
/**
 * A node border may only pulse four times per second.
 */
const PULSE_INTERVAL_MS = 250;
const PARTICLE_TRAVEL_MS = 2200;

type ParticleSpec = {
    glyph: string;
    color: string;
    direction: 'right' | 'left';
};

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
    { glyph: '◆', label: 'live result', color: DB_VIEWER_COLORS.info },
    { glyph: '↓', label: 'pull', color: DB_VIEWER_COLORS.replication },
    { glyph: '↑', label: 'push', color: DB_VIEWER_COLORS.replication }
];

/**
 * The database drawn as a fixed-position map: app → collections → remote.
 * Only names, counts and rates are drawn, never document contents,
 * which is what makes this screen safe to screen-share.
 */
export class LivePanel {
    public readonly element: HTMLElement = el('div', { class: 'rxdbv-main' });

    private subscription: Subscription | null = null;
    private readonly inLanes = new Map<string, HTMLElement>();
    private readonly outLanes = new Map<string, HTMLElement>();
    private readonly nodes = new Map<string, HTMLElement>();
    private readonly lastPulseAt = new Map<string, number>();

    constructor(private readonly context: PanelContext) {
        this.subscription = this.context.store.liveEvents$.subscribe(event => {
            this.onLiveEvent(event);
        });
    }

    public destroy(): void {
        this.subscription?.unsubscribe();
        this.subscription = null;
    }

    private onLiveEvent(event: DbViewerLiveEvent): void {
        if (this.context.store.livePaused) {
            return;
        }
        const isOutbound = event.kind === 'pull' || event.kind === 'push';
        const lane = isOutbound
            ? this.outLanes.get(event.collectionName)
            : this.inLanes.get(event.collectionName);
        if (lane) {
            this.spawnParticle(lane, PARTICLES[event.kind]);
        }
        if (event.kind === 'insert' || event.kind === 'update' || event.kind === 'delete') {
            this.pulseNode(event.collectionName);
        }
    }

    private spawnParticle(lane: HTMLElement, spec: ParticleSpec): void {
        const track = lane.querySelector('.rxdbv-track') as HTMLElement | null;
        if (!track) {
            return;
        }
        const particle = el('span', {
            class: 'rxdbv-particle',
            text: spec.glyph,
            style: {
                color: spec.color,
                animation: (spec.direction === 'right' ? 'rxdbvFlowR ' : 'rxdbvFlowL ') +
                    PARTICLE_TRAVEL_MS + 'ms linear forwards'
            }
        });
        track.appendChild(particle);
        setTimeout(() => particle.remove(), PARTICLE_TRAVEL_MS + 50);
    }

    private pulseNode(collectionName: string): void {
        const now = Date.now();
        const last = this.lastPulseAt.get(collectionName) ?? 0;
        if (now - last < PULSE_INTERVAL_MS) {
            return;
        }
        this.lastPulseAt.set(collectionName, now);
        const node = this.nodes.get(collectionName);
        if (!node) {
            return;
        }
        node.classList.remove('rxdbv-node-pulse');
        void node.offsetWidth;
        node.classList.add('rxdbv-node-pulse');
    }

    public render(): HTMLElement {
        clear(this.element);
        this.inLanes.clear();
        this.outLanes.clear();
        this.nodes.clear();

        const now = Date.now();
        const narrow = this.element.clientWidth > 0
            ? this.element.clientWidth < DB_VIEWER_NARROW_BREAKPOINT
            : false;

        this.element.appendChild(this.renderHeader());
        if (narrow) {
            this.element.appendChild(this.renderCompactList(now));
        } else {
            this.element.appendChild(this.renderMap(now));
        }
        this.element.appendChild(this.renderSummary(now));
        return this.element;
    }

    private renderHeader(): HTMLElement {
        const store = this.context.store;
        return el('div', { class: 'rxdbv-toolbar' }, [
            el('span', { class: 'rxdbv-panel-title', text: 'Live' }),
            el('span', {
                class: 'rxdbv-dot' + (store.livePaused ? '' : ' rxdbv-blink'),
                style: { background: store.livePaused ? DB_VIEWER_COLORS.fgDim : DB_VIEWER_COLORS.success }
            }),
            el('span', { class: 'rxdbv-dim rxdbv-mono', style: { fontSize: '10px' }, text: '60s window' }),
            el('div', { class: 'rxdbv-legend' }, LEGEND.map(entry => el('span', {}, [
                el('span', { style: { color: entry.color, fontWeight: '700' }, text: entry.glyph }),
                document.createTextNode(' ' + entry.label)
            ]))),
            spacer(),
            button(store.livePaused ? 'Resume' : 'Pause', () => {
                store.livePaused = !store.livePaused;
                this.context.render();
            }, { small: true })
        ]);
    }

    private renderMap(now: number): HTMLElement {
        const store = this.context.store;
        const collectionNames = store.collectionNames;
        const map = el('div', { class: 'rxdbv-map' });

        map.appendChild(this.renderAppColumn(now));

        const rows = el('div', { class: 'rxdbv-map-rows' });
        rows.appendChild(el('div', {
            style: { display: 'flex', fontSize: '9px', letterSpacing: '0.09em', color: DB_VIEWER_COLORS.fgDim, fontWeight: '600' }
        }, [
            spacer(),
            el('div', { style: { width: '296px', minWidth: '296px' }, text: 'COLLECTIONS' }),
            spacer(),
            el('div', { style: { width: '186px', minWidth: '186px' }, text: 'REMOTE' })
        ]));

        if (collectionNames.length === 0) {
            rows.appendChild(el('div', {
                class: 'rxdbv-dim',
                style: { padding: '12px 0', lineHeight: '1.55' },
                text: 'No collections yet. This screen updates as the app reads and writes.'
            }));
        }

        collectionNames.forEach(collectionName => {
            rows.appendChild(this.renderMapRow(collectionName, now));
        });
        map.appendChild(rows);
        return map;
    }

    private renderAppColumn(now: number): HTMLElement {
        const store = this.context.store;
        const totalWrites = store.collectionNames.reduce(
            (sum, name) => sum + store.getMetrics(name).writes.total(now), 0
        );
        const totalReads = store.collectionNames.reduce(
            (sum, name) => sum + store.getMetrics(name).reads.total(now), 0
        );
        const windowSeconds = METRICS_WINDOW_MS / 1000;
        const isLeader = readLeadership(store.database);

        return el('div', { class: 'rxdbv-map-col' }, [
            el('div', { class: 'rxdbv-section-label', text: 'APP' }),
            el('div', { class: 'rxdbv-node rxdbv-node-app' }, [
                el('div', { class: 'rxdbv-row', style: { gap: '6px' } }, [
                    el('span', { class: 'rxdbv-mono', style: { fontWeight: '700', fontSize: '11px' }, text: 'this tab' }),
                    spacer(),
                    isLeader === true && el('span', { class: 'rxdbv-badge-success', text: 'leader' })
                ]),
                el('div', {
                    class: 'rxdbv-mono rxdbv-dim',
                    style: { fontSize: '9.5px', marginTop: '4px' },
                    text: instanceKind() + ' · ' + currentPath()
                }),
                el('div', {
                    class: 'rxdbv-mono rxdbv-muted',
                    style: { display: 'flex', gap: '8px', marginTop: '6px', fontSize: '9.5px' }
                }, [
                    el('span', {}, [
                        el('span', { style: { color: DB_VIEWER_COLORS.pink }, text: 'w' }),
                        document.createTextNode(' ' + formatRate(totalWrites / windowSeconds) + '/s')
                    ]),
                    el('span', {}, [
                        el('span', { style: { color: DB_VIEWER_COLORS.info }, text: '?' }),
                        document.createTextNode(' ' + formatRate(totalReads / windowSeconds) + '/s')
                    ])
                ])
            ]),
            el('div', {
                class: 'rxdbv-node rxdbv-node-clickable',
                style: { padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '6px' },
                onClick: () => this.openInstances()
            }, [
                el('span', { class: 'rxdbv-mono', style: { fontSize: '11px' }, text: 'open instances' }),
                spacer(),
                el('span', { class: 'rxdbv-dim', text: '›' })
            ]),
            el('div', { class: 'rxdbv-node-dashed' }, [
                el('div', { class: 'rxdbv-mono', style: { fontSize: '10.5px' }, text: 'viewer writes' }),
                el('div', {
                    class: 'rxdbv-mono rxdbv-dim',
                    style: { fontSize: '9.5px', marginTop: '3px' },
                    text: formatNumber(store.viewerWriteCount) + ' total · from this viewer'
                })
            ]),
            spacer(),
            el('div', {
                class: 'rxdbv-dim',
                style: { fontSize: '9.5px', lineHeight: '1.5' },
                text: 'Fixed positions. No document contents are drawn — names, counts and rates only.'
            })
        ]);
    }

    private renderMapRow(collectionName: string, now: number): HTMLElement {
        const store = this.context.store;
        const metrics = store.getMetrics(collectionName);
        const windowSeconds = METRICS_WINDOW_MS / 1000;
        const writes = metrics.writes.total(now);
        const reads = metrics.reads.total(now);
        const writeRate = writes / windowSeconds;
        const liveQueries = store.getLiveQueries(collectionName)
            .filter(info => info.subscribers > 0);
        const idle = metrics.lastWriteAt === 0 || (now - metrics.lastWriteAt) > METRICS_WINDOW_MS;

        const inLane = this.renderLane(
            'in',
            writes / windowSeconds > BURST_EVENTS_PER_SECOND
                ? { rate: writeRate, color: DB_VIEWER_COLORS.warning, unit: 'w/s' }
                : null,
            liveQueries.length > 0,
            idle
                ? (metrics.lastWriteAt === 0 ? 'no events yet' : 'last write ' + formatAge(metrics.lastWriteAt, now))
                : formatRate(writeRate) + ' w/s in · ' + formatRate(reads / windowSeconds) + ' ?/s out'
        );
        this.inLanes.set(collectionName, inLane);

        const replicationStates = store.getReplicationStates(collectionName);
        const hasRemote = replicationStates.length > 0;
        const pulls = metrics.pulls.total(now);
        const pushes = metrics.pushes.total(now);
        const outLane = this.renderLane(
            'out',
            null,
            false,
            hasRemote
                ? '↓ ' + formatNumber(pulls) + ' · ↑ ' + formatNumber(pushes) + ' in 60s'
                : '',
            store.replicationErrors.has(collectionName)
        );
        this.outLanes.set(collectionName, outLane);

        const node = this.renderCollectionNode(collectionName, metrics, now, liveQueries.length);
        this.nodes.set(collectionName, node);

        return el('div', { class: 'rxdbv-map-row' }, [
            inLane,
            node,
            outLane,
            this.renderRemoteNode(collectionName)
        ]);
    }

    private renderLane(
        side: 'in' | 'out',
        band: { rate: number; color: string; unit: string; } | null,
        thread: boolean,
        label: string,
        errored = false
    ): HTMLElement {
        const lane = el('div', {
            class: 'rxdbv-lane',
            style: side === 'in' ? { paddingRight: '6px' } : { paddingLeft: '6px' }
        });
        if (band) {
            /**
             * Above the burst threshold the exact number always sits next to
             * the band, so the picture stays readable with motion disabled.
             */
            const durationSeconds = Math.max(0.15, 1.2 - (Math.log10(band.rate) * 0.28));
            lane.appendChild(el('div', { class: 'rxdbv-row', style: { gap: '8px' } }, [
                el('div', {
                    class: 'rxdbv-band',
                    style: {
                        background: 'repeating-linear-gradient(90deg,' + band.color + ' 0 6px,rgba(255,255,255,0.08) 6px 24px)',
                        animation: 'rxdbvBand ' + durationSeconds.toFixed(2) + 's linear infinite'
                    }
                }),
                el('span', {
                    class: 'rxdbv-mono rxdbv-muted',
                    style: { fontSize: '10px' },
                    text: formatNumber(band.rate) + ' ' + band.unit
                })
            ]));
        } else {
            lane.appendChild(el('div', { class: 'rxdbv-track' }, [
                el('div', {
                    class: 'rxdbv-track-line' + (errored ? ' rxdbv-track-line-error' : '')
                })
            ]));
        }
        if (thread) {
            lane.appendChild(el('div', { class: 'rxdbv-track' }, [
                el('div', { class: 'rxdbv-track-line rxdbv-track-line-thread' })
            ]));
        }
        lane.appendChild(el('div', {
            class: 'rxdbv-mono rxdbv-dim',
            style: { fontSize: '9px' },
            text: label
        }));
        return lane;
    }

    private renderCollectionNode(
        collectionName: string,
        metrics: CollectionMetrics,
        now: number,
        liveQueryCount: number
    ): HTMLElement {
        const windowSeconds = METRICS_WINDOW_MS / 1000;
        const writeRate = metrics.writes.total(now) / windowSeconds;
        const node = el('div', {
            class: 'rxdbv-node',
            style: { width: '296px', minWidth: '296px' }
        }, [
            el('div', { class: 'rxdbv-row', style: { gap: '8px' } }, [
                el('span', { class: 'rxdbv-mono', style: { fontWeight: '700', fontSize: '12px' }, text: collectionName }),
                el('span', {
                    class: 'rxdbv-mono rxdbv-dim',
                    style: { fontSize: '10px' },
                    text: formatNumber(metrics.documentCount) + ' docs'
                }),
                spacer(),
                metrics.migration
                    ? el('span', { class: 'rxdbv-badge-warning', text: 'migrating' })
                    : el('span', {
                        class: 'rxdbv-mono rxdbv-muted',
                        style: { fontSize: '10px' },
                        text: formatRate(writeRate) + ' w/s'
                    })
            ])
        ]);

        if (metrics.migration) {
            const percent = metrics.migration.total === 0
                ? 0
                : Math.round((metrics.migration.done / metrics.migration.total) * 100);
            node.appendChild(el('div', { class: 'rxdbv-progress' }, [
                el('div', { style: { width: percent + '%' } })
            ]));
            node.appendChild(el('div', {
                class: 'rxdbv-mono rxdbv-dim',
                style: { display: 'flex', marginTop: '5px', fontSize: '9.5px' }
            }, [
                el('span', {
                    text: 'schema v' + metrics.migration.fromVersion + ' → v' + metrics.migration.toVersion
                }),
                spacer(),
                el('span', {
                    class: 'rxdbv-muted',
                    text: percent + '% · ' + formatNumber(metrics.migration.done) +
                        ' of ' + formatNumber(metrics.migration.total)
                })
            ]));
            return node;
        }

        const series = metrics.writes.series(now);
        const peak = Math.max(1, ...series);
        node.appendChild(el('div', { class: 'rxdbv-spark' }, series.map(value => el('div', {
            style: { height: Math.round((value / peak) * 100) + '%' },
            title: value + ' writes'
        }))));
        node.appendChild(el('div', {
            class: 'rxdbv-mono rxdbv-dim',
            style: { display: 'flex', gap: '10px', marginTop: '5px', fontSize: '9.5px' }
        }, [
            el('span', { text: '60s sparkline' }),
            spacer(),
            el('span', {
                class: 'rxdbv-muted',
                style: { cursor: 'pointer' },
                text: liveQueryCount + ' live queries ›',
                onClick: (event: MouseEvent) => {
                    event.stopPropagation();
                    this.openLiveQueries(collectionName);
                }
            })
        ]));
        return node;
    }

    private renderRemoteNode(collectionName: string): HTMLElement {
        const store = this.context.store;
        const replicationStates = store.getReplicationStates(collectionName);
        const error = store.replicationErrors.get(collectionName);
        if (replicationStates.length === 0) {
            return el('div', {
                class: 'rxdbv-node',
                style: { width: '186px', minWidth: '186px' }
            }, [
                el('div', { class: 'rxdbv-dim', style: { fontSize: '10px', lineHeight: '1.5' } }, [
                    document.createTextNode('no replication configured for '),
                    el('span', { class: 'rxdbv-mono', text: collectionName })
                ])
            ]);
        }
        const glyph = replicationGlyph(store, collectionName);
        const pullState = replicationStates.some(state => state.pull) ? glyph : null;
        const pushState = replicationStates.some(state => state.push) ? glyph : null;
        return el('div', {
            class: 'rxdbv-node' + (error ? ' rxdbv-node-error' : ''),
            style: { width: '186px', minWidth: '186px' }
        }, [
            el('div', {
                class: 'rxdbv-mono',
                style: { fontSize: '10.5px', wordBreak: 'break-all' },
                text: replicationStates.map(state => state.replicationIdentifier).join(', ')
            }),
            el('div', {
                class: 'rxdbv-mono',
                style: { display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px', fontSize: '9.5px' }
            }, [
                el('div', { style: { display: 'flex' } }, [
                    el('span', { class: 'rxdbv-dim', text: 'pull' }),
                    spacer(),
                    el('span', {
                        style: { color: pullState ? pullState.color : DB_VIEWER_COLORS.fgDim },
                        text: pullState ? pullState.glyph + ' ' + pullState.state : '– none'
                    })
                ]),
                el('div', { style: { display: 'flex' } }, [
                    el('span', { class: 'rxdbv-dim', text: 'push' }),
                    spacer(),
                    el('span', {
                        style: { color: pushState ? pushState.color : DB_VIEWER_COLORS.fgDim },
                        text: pushState ? pushState.glyph + ' ' + pushState.state : '– none'
                    })
                ])
            ])
        ]);
    }

    /**
     * Below 640px the three column map does not fit,
     * so the same numbers are shown as one row per collection.
     */
    private renderCompactList(now: number): HTMLElement {
        const store = this.context.store;
        const container = el('div', { class: 'rxdbv-scroll' });
        container.appendChild(el('div', {
            class: 'rxdbv-dim',
            style: { padding: '10px 14px', fontSize: '11px', lineHeight: '1.5', borderBottom: '1px solid rgba(255,255,255,0.08)' },
            text: 'The map needs three columns and does not fit here. Same numbers, one row per collection.'
        }));
        const rows = store.collectionNames.map(collectionName => {
            const metrics = store.getMetrics(collectionName);
            return {
                collectionName,
                metrics,
                activity: metrics.writes.total(now) + metrics.reads.total(now)
            };
        }).sort((a, b) => b.activity - a.activity);
        const peak = Math.max(1, ...rows.map(row => row.activity));
        rows.forEach(row => {
            const liveQueryCount = store.getLiveQueries(row.collectionName)
                .filter(info => info.subscribers > 0).length;
            container.appendChild(el('div', {
                style: { padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }
            }, [
                el('div', { class: 'rxdbv-row', style: { gap: '8px' } }, [
                    el('span', { class: 'rxdbv-mono', style: { fontSize: '12px' }, text: row.collectionName }),
                    spacer(),
                    el('span', {
                        class: 'rxdbv-mono rxdbv-muted',
                        style: { fontSize: '11px' },
                        text: formatNumber(row.metrics.documentCount) + ' docs'
                    })
                ]),
                el('div', { style: { height: '6px', background: DB_VIEWER_COLORS.bg, marginTop: '6px' } }, [
                    el('div', {
                        style: {
                            width: Math.round((row.activity / peak) * 100) + '%',
                            height: '100%',
                            background: DB_VIEWER_COLORS.pink
                        }
                    })
                ]),
                el('div', {
                    class: 'rxdbv-mono rxdbv-dim',
                    style: { display: 'flex', gap: '12px', marginTop: '5px', fontSize: '10.5px' }
                }, [
                    el('span', { text: 'in ' + formatNumber(row.metrics.writes.total(now)) }),
                    el('span', { text: 'out ' + formatNumber(row.metrics.pushes.total(now)) }),
                    el('span', { text: '? ' + formatNumber(row.metrics.reads.total(now)) }),
                    el('span', { text: '◆ ' + liveQueryCount })
                ])
            ]));
        });
        return container;
    }

    private renderSummary(now: number): HTMLElement {
        const store = this.context.store;
        const sum = (pick: 'writes' | 'reads' | 'pulls' | 'pushes') => store.collectionNames
            .reduce((total, name) => total + store.getMetrics(name)[pick].total(now), 0);
        return el('div', { class: 'rxdbv-map-summary' }, [
            el('span', {
                class: 'rxdbv-section-label',
                style: { fontFamily: 'inherit' },
                text: 'LAST 60s'
            }),
            el('span', {}, [
                el('span', { style: { color: DB_VIEWER_COLORS.pink }, text: 'writes' }),
                document.createTextNode(' ' + formatNumber(sum('writes')))
            ]),
            el('span', {}, [
                el('span', { style: { color: DB_VIEWER_COLORS.info }, text: 'reads' }),
                document.createTextNode(' ' + formatNumber(sum('reads')))
            ]),
            el('span', {}, [
                el('span', { style: { color: DB_VIEWER_COLORS.replication }, text: 'pulled' }),
                document.createTextNode(' ' + formatNumber(sum('pulls')))
            ]),
            el('span', {}, [
                el('span', { style: { color: DB_VIEWER_COLORS.replication }, text: 'pushed' }),
                document.createTextNode(' ' + formatNumber(sum('pushes')))
            ]),
            spacer(),
            button('Reset counters', () => {
                store.metrics.clear();
                store.viewerWriteCount = 0;
                this.context.render();
            }, { small: true })
        ]);
    }

    private openInstances(): void {
        const store = this.context.store;
        const isLeader = readLeadership(store.database);
        const columns = '70px 1fr 130px';
        const panel = el('div', { class: 'rxdbv-subpanel-inner', style: { width: '620px' } }, [
            el('div', { class: 'rxdbv-toolbar' }, [
                el('span', { style: { fontWeight: '700', fontSize: '12px' }, text: 'Instances' }),
                el('span', {
                    class: 'rxdbv-dim',
                    style: { fontSize: '10px' },
                    text: store.database.multiInstance
                        ? 'multi-instance is on, other tabs share this database'
                        : 'multi-instance is off, this is the only instance'
                }),
                spacer(),
                el('span', { class: 'rxdbv-close', text: '×', onClick: () => this.context.setOverlay(null) })
            ]),
            gridHead(columns, ['kind', 'label', 'state']),
            gridRow(columns, [
                el('span', { class: 'rxdbv-mono rxdbv-muted', text: instanceKind() }),
                el('span', { class: 'rxdbv-mono', text: 'this tab · ' + currentPath() }),
                el('span', {
                    class: 'rxdbv-mono',
                    style: { color: isLeader === true ? DB_VIEWER_COLORS.success : DB_VIEWER_COLORS.fgDim },
                    text: isLeader === null ? 'unknown' : (isLeader ? 'leader' : 'follower')
                })
            ], { class: 'rxdbv-tr rxdbv-static' }),
            el('div', {
                class: 'rxdbv-dim',
                style: { padding: '8px 12px', fontSize: '10.5px', lineHeight: '1.5' },
                text: isLeader === null
                    ? 'Leadership is unknown because the leader-election plugin is not added. RxDB also does not publish a roster of the other open instances.'
                    : 'RxDB does not publish a roster of the other open instances. Only the leadership of this instance is known here.'
            })
        ]);
        this.context.setOverlay(el('div', { class: 'rxdbv-subpanel' }, [panel]));
    }

    private openLiveQueries(collectionName: string): void {
        const store = this.context.store;
        const now = Date.now();
        const infos = store.getLiveQueries(collectionName);
        const subscribed = infos.filter(info => info.subscribers > 0);
        const cached = infos.filter(info => info.subscribers === 0);
        const metrics = store.getMetrics(collectionName);
        const writes = metrics.writes.total(now);
        const columns = '46px 1fr 70px 70px 100px';

        const panel = el('div', { class: 'rxdbv-subpanel-inner' }, [
            el('div', { class: 'rxdbv-toolbar' }, [
                el('span', { style: { fontWeight: '700', fontSize: '12px' }, text: 'Live queries' }),
                el('span', {
                    class: 'rxdbv-dim rxdbv-mono',
                    style: { fontSize: '10px' },
                    text: collectionName + ' · ' + subscribed.length + ' subscribed'
                }),
                spacer(),
                el('span', { class: 'rxdbv-close', text: '×', onClick: () => this.context.setOverlay(null) })
            ]),
            gridHead(columns, ['subs', 'query', 'results', 're-emits', 'last emit'])
        ]);

        let staleCount = 0;
        subscribed.forEach(info => {
            const stale = writes > 0 && info.emitCount === 0;
            if (stale) {
                staleCount++;
            }
            panel.appendChild(gridRow(columns, [
                el('span', { class: 'rxdbv-mono', text: String(info.subscribers) }),
                el('span', { class: 'rxdbv-mono', title: info.stringRepresentation, text: info.stringRepresentation }),
                el('span', { class: 'rxdbv-mono rxdbv-muted', text: formatNumber(info.resultCount) }),
                el('span', { class: 'rxdbv-mono rxdbv-muted', text: formatNumber(info.emitCount) }),
                el('span', {
                    class: 'rxdbv-mono',
                    style: { color: stale ? DB_VIEWER_COLORS.warning : DB_VIEWER_COLORS.fgMuted },
                    text: info.lastEmitAt === 0 ? 'never' : formatAge(info.lastEmitAt, now)
                })
            ], { class: 'rxdbv-tr rxdbv-static' }));
        });
        if (subscribed.length === 0) {
            panel.appendChild(el('div', {
                class: 'rxdbv-dim',
                style: { padding: '8px 12px', fontSize: '11px' },
                text: 'Nothing is subscribed to ' + collectionName + ' right now.'
            }));
        }
        if (staleCount > 0) {
            panel.appendChild(el('div', {
                class: 'rxdbv-mono',
                style: {
                    padding: '6px 12px',
                    fontSize: '10.5px',
                    color: DB_VIEWER_COLORS.warning,
                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                },
                text: '▲ ' + staleCount + ' quer' + (staleCount === 1 ? 'y has' : 'ies have') +
                    ' not re-emitted while ' + formatNumber(writes) + ' writes landed on ' + collectionName
            }));
        }
        panel.appendChild(el('div', {
            class: 'rxdbv-mono rxdbv-dim',
            style: { padding: '6px 12px', fontSize: '10.5px' },
            text: '› ' + cached.length + ' cached queries with no subscribers'
        }));
        this.context.setOverlay(el('div', { class: 'rxdbv-subpanel' }, [panel]));
    }
}

/**
 * `isLeader()` throws when the leader-election plugin is not added,
 * in which case leadership is simply unknown.
 */
function readLeadership(database: RxDatabase): boolean | null {
    try {
        return database.isLeader();
    } catch (error) {
        return null;
    }
}

function instanceKind(): string {
    if (typeof window === 'undefined') {
        return 'node';
    }
    if (typeof (globalThis as any).WorkerGlobalScope !== 'undefined' &&
        (globalThis as any).self instanceof (globalThis as any).WorkerGlobalScope) {
        return 'worker';
    }
    return 'window';
}

/**
 * Only the tail of the path is drawn, so that a long url cannot
 * push the app node out of its column.
 */
function currentPath(): string {
    if (typeof location === 'undefined') {
        return '-';
    }
    const path = location.pathname;
    if (path.length <= 24) {
        return path;
    }
    return '…' + path.slice(path.length - 23);
}
