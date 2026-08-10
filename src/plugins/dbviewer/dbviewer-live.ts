import {
    clearChildren,
    el
} from './dbviewer-dom.ts';
import {
    readQueryCache
} from './dbviewer-events.ts';
import {
    formatInteger,
    formatTimeAgo
} from './dbviewer-helpers.ts';
import type { ViewerContext } from './dbviewer.ts';

const PARTICLE_COLORS: { [glyph: string]: string } = {
    '+': 'var(--rxdbv-success)',
    '~': 'var(--rxdbv-warning)',
    '-': 'var(--rxdbv-danger)',
    '?': 'var(--rxdbv-info)',
    '◆': 'var(--rxdbv-info)',
    '↑': 'var(--rxdbv-violet)',
    '↓': 'var(--rxdbv-violet)'
};

const OP_GLYPHS: { [operation: string]: string } = {
    INSERT: '+',
    UPDATE: '~',
    DELETE: '-'
};

type LaneRefs = {
    writesTrack: HTMLElement;
    queryTrack: HTMLElement;
    queryLine: HTMLElement;
    pushTrack: HTMLElement;
    pullTrack: HTMLElement;
    inLabel: HTMLElement;
    outLabel: HTMLElement;
    node: HTMLElement;
    countSpan: HTMLElement;
    rateSpan: HTMLElement;
    queriesLink: HTMLElement;
    sparkHost: HTMLElement;
    remoteHost: HTMLElement;
    row: HTMLElement;
    lastParticleAt: { [laneKey: string]: number };
    lastPulseAt: number;
    lastExecCount: number;
};

/**
 * The Live activity map: app → collections → remote, drawn from
 * real change events, replication feeds and query cache counters.
 * No document contents are drawn, only names, counts and rates.
 */
export function renderLivePanel(ctx: ViewerContext) {
    const panel = el('div', 'rxdbv-content', undefined, { style: 'position:relative' });
    ctx.contentHost.appendChild(panel);
    const events = ctx.events;
    if (!events) {
        panel.appendChild(el('div', 'rxdbv-toolbar', [el('span', 'rxdbv-toolbar-title', 'Live')]));
        panel.appendChild(el('div', 'rxdbv-empty-state', [
            el('div', 'rxdbv-empty-inner', [
                el('div', 'rxdbv-empty-title', 'Not available on a dump'),
                el('div', 'rxdbv-empty-body', 'A dump is a static file, there is no live activity to draw.')
            ])
        ]));
        return;
    }

    let paused = false;

    // toolbar with legend
    const legend = el('div', '', undefined, { style: 'display:flex;gap:10px;font-size:10px;font-family:var(--rxdbv-mono);color:var(--rxdbv-fg-dim);flex-wrap:wrap' });
    ([
        ['+', 'insert'], ['~', 'update'], ['-', 'delete'],
        ['?', 'query'], ['◆', 'live result'], ['↑', 'push'], ['↓', 'pull']
    ] as [string, string][]).forEach(([glyph, label]) => {
        const glyphSpan = el('span', '', glyph, { style: 'font-weight:700;color:' + PARTICLE_COLORS[glyph] });
        legend.appendChild(el('span', '', [glyphSpan, ' ' + label]));
    });
    const pauseButton = el('button', 'rxdbv-btn rxdbv-btn-small', 'Pause', {
        onClick: () => {
            paused = !paused;
            pauseButton.textContent = paused ? 'Resume' : 'Pause';
        }
    });
    panel.appendChild(el('div', 'rxdbv-toolbar', [
        el('span', 'rxdbv-toolbar-title', 'Live'),
        el('span', '', undefined, { style: 'width:7px;height:7px;border-radius:50%;background:var(--rxdbv-success);animation:rxdbvBlink 1.4s ease-in-out infinite' }),
        el('span', 'rxdbv-dim rxdbv-mono', '60s window', { style: 'font-size:10px' }),
        legend,
        el('div', 'rxdbv-flex1'),
        pauseButton
    ]));

    const map = el('div', 'rxdbv-live-map');
    panel.appendChild(map);

    // app column
    const database = ctx.source.rawDatabase as any;
    const leaderBadge = el('span', '', 'leader', {
        style: 'font-size:9px;border:1px solid rgba(62,207,142,0.5);color:var(--rxdbv-success);padding:0 5px;font-family:var(--rxdbv-mono);display:none'
    });
    const appRates = el('div', 'rxdbv-mono rxdbv-muted', '', { style: 'display:flex;gap:8px;margin-top:6px;font-size:9.5px' });
    const viewerWritesLabel = el('div', 'rxdbv-dim rxdbv-mono', '0 in 60s · from this devtool', { style: 'font-size:9.5px;margin-top:3px' });
    const appColumn = el('div', 'rxdbv-live-col-app', [
        el('div', 'rxdbv-live-col-header', 'APP'),
        el('div', 'rxdbv-live-node', [
            el('div', '', [
                el('span', 'rxdbv-mono', 'this tab', { style: 'font-weight:700;font-size:11px' }),
                el('div', 'rxdbv-flex1'),
                leaderBadge
            ], { style: 'display:flex;align-items:center;gap:6px' }),
            el('div', 'rxdbv-dim rxdbv-mono', ctx.source.databaseName, { style: 'font-size:9.5px;margin-top:4px' }),
            appRates
        ]),
        el('div', '', [
            el('div', 'rxdbv-mono', 'viewer writes', { style: 'font-size:10.5px' }),
            viewerWritesLabel
        ], { style: 'border:1px dashed rgba(255,255,255,0.16);padding:8px 10px;opacity:0.6' }),
        el('div', 'rxdbv-flex1'),
        el('div', 'rxdbv-dim', 'Fixed positions. No document contents are drawn — names, counts and rates only.', { style: 'font-size:9.5px;line-height:1.5' })
    ]);
    map.appendChild(appColumn);

    // rows
    const rowsHost = el('div', 'rxdbv-live-rows', [
        el('div', '', [
            el('div', 'rxdbv-flex1'),
            el('div', 'rxdbv-live-col-header', 'COLLECTIONS', { style: 'width:296px;min-width:296px' }),
            el('div', 'rxdbv-flex1'),
            el('div', 'rxdbv-live-col-header', 'REMOTE', { style: 'width:186px;min-width:186px' })
        ], { style: 'display:flex' })
    ]);
    map.appendChild(rowsHost);

    const lanes = new Map<string, LaneRefs>();
    const collections = ctx.source.listCollections();

    collections.forEach(info => {
        const writesTrack = el('div', 'rxdbv-live-track', [el('div', 'rxdbv-track-line')]);
        const queryLine = el('div', 'rxdbv-track-line');
        const queryTrack = el('div', 'rxdbv-live-track', [queryLine]);
        const inLabel = el('div', 'rxdbv-live-lane-label', '');
        const pushTrack = el('div', 'rxdbv-live-track', [el('div', 'rxdbv-track-line')]);
        const pullTrack = el('div', 'rxdbv-live-track', [el('div', 'rxdbv-track-line')]);
        const outLabel = el('div', 'rxdbv-live-lane-label', '');

        const countSpan = el('span', 'rxdbv-dim rxdbv-mono', '… docs', { style: 'font-size:10px' });
        const rateSpan = el('span', 'rxdbv-muted rxdbv-mono', '0 w/s', { style: 'font-size:10px' });
        const sparkHost = el('div', 'rxdbv-sparkline');
        for (let i = 0; i < 30; i++) {
            sparkHost.appendChild(el('div'));
        }
        const queriesLink = el('span', 'rxdbv-muted', '0 queries ›', {
            style: 'cursor:pointer',
            onClick: () => openLiveQueriesSubPanel(ctx, panel, info.name)
        });
        const node = el('div', 'rxdbv-live-coll-node', [
            el('div', '', [
                el('span', 'rxdbv-mono', info.name, { style: 'font-weight:700;font-size:12px' }),
                countSpan,
                el('div', 'rxdbv-flex1'),
                rateSpan
            ], { style: 'display:flex;align-items:center;gap:8px' }),
            sparkHost,
            el('div', '', [
                el('span', '', '60s sparkline'),
                el('div', 'rxdbv-flex1'),
                queriesLink
            ], { style: 'display:flex;gap:10px;margin-top:5px;font-size:9.5px;font-family:var(--rxdbv-mono);color:var(--rxdbv-fg-dim)' })
        ]);
        const remoteHost = el('div', 'rxdbv-live-remote-node rxdbv-none');
        const row = el('div', 'rxdbv-live-row', [
            el('div', 'rxdbv-live-lane rxdbv-in', [writesTrack, queryTrack, inLabel]),
            node,
            el('div', 'rxdbv-live-lane rxdbv-out', [pushTrack, pullTrack, outLabel]),
            remoteHost
        ]);
        rowsHost.appendChild(row);
        lanes.set(info.name, {
            writesTrack,
            queryTrack,
            queryLine,
            pushTrack,
            pullTrack,
            inLabel,
            outLabel,
            node,
            countSpan,
            rateSpan,
            queriesLink,
            sparkHost,
            remoteHost,
            row,
            lastParticleAt: {},
            lastPulseAt: 0,
            lastExecCount: -1
        });
    });

    const emptyHint = el('div', 'rxdbv-muted', 'This screen updates as the app reads and writes. Nothing has happened since the viewer opened.', {
        style: 'font-size:11px;line-height:1.55;padding:10px 12px;display:none'
    });
    panel.appendChild(emptyHint);

    // summary bar
    const summaryValues = {
        writes: el('span', '', '0'),
        reads: el('span', '', '0'),
        pulled: el('span', '', '0'),
        pushed: el('span', '', '0')
    };
    const summaryEntry = (label: string, color: string, valueSpan: HTMLElement) =>
        el('span', '', [el('span', '', label + ' ', { style: 'color:' + color }), valueSpan]);
    panel.appendChild(el('div', 'rxdbv-live-summary', [
        el('span', 'rxdbv-live-col-header', 'LAST 60s', { style: 'font-family:var(--rxdbv-font)' }),
        summaryEntry('writes', 'var(--rxdbv-pink)', summaryValues.writes),
        summaryEntry('reads', 'var(--rxdbv-info)', summaryValues.reads),
        summaryEntry('pulled', 'var(--rxdbv-violet)', summaryValues.pulled),
        summaryEntry('pushed', 'var(--rxdbv-violet)', summaryValues.pushed),
        el('div', 'rxdbv-flex1'),
        el('button', 'rxdbv-btn rxdbv-btn-small', 'Reset counters', {
            style: 'font-family:var(--rxdbv-font)',
            onClick: () => events.resetCounters()
        })
    ]));

    /**
     * Spawns one animated glyph on a lane. Rate-limited to 4 Hz
     * per lane so bursts never flash faster than allowed.
     */
    const spawnParticle = (refs: LaneRefs, track: HTMLElement, glyph: string, leftToRight: boolean, laneKey: string) => {
        if (paused) {
            return;
        }
        const now = Date.now();
        if (refs.lastParticleAt[laneKey] && now - refs.lastParticleAt[laneKey] < 250) {
            return;
        }
        refs.lastParticleAt[laneKey] = now;
        const particle = el('span', 'rxdbv-live-particle', glyph);
        particle.style.color = PARTICLE_COLORS[glyph] || 'var(--rxdbv-fg)';
        particle.style.animation = (leftToRight ? 'rxdbvFlowR' : 'rxdbvFlowL') + ' 1.6s linear';
        particle.addEventListener('animationend', () => particle.remove());
        track.appendChild(particle);
    };

    const pulseNode = (refs: LaneRefs) => {
        const now = Date.now();
        if (now - refs.lastPulseAt < 250) {
            return;
        }
        refs.lastPulseAt = now;
        refs.node.classList.remove('rxdbv-pulse');
        void refs.node.offsetWidth;
        refs.node.classList.add('rxdbv-pulse');
    };

    // react to write events
    let lastSeenChangeTime = events.changes[0] ? events.changes[0].time : 0;
    let lastSeenFeedTime = events.replicationFeed[0] ? events.replicationFeed[0].time : 0;
    const eventsSubscription = events.changed$.subscribe(() => {
        if (ctx.destroyed) {
            return;
        }
        for (const entry of events.changes) {
            if (entry.time <= lastSeenChangeTime) {
                break;
            }
            const refs = lanes.get(entry.collectionName);
            if (refs) {
                spawnParticle(refs, refs.writesTrack, OP_GLYPHS[entry.operation] || '~', true, 'writes');
                pulseNode(refs);
            }
        }
        lastSeenChangeTime = events.changes[0] ? events.changes[0].time : lastSeenChangeTime;
        for (const entry of events.replicationFeed) {
            if (entry.time <= lastSeenFeedTime) {
                break;
            }
            const refs = lanes.get(entry.collectionName);
            if (refs) {
                if (entry.direction === 'push') {
                    spawnParticle(refs, refs.pushTrack, '↑', true, 'push');
                } else {
                    spawnParticle(refs, refs.pullTrack, '↓', false, 'pull');
                    pulseNode(refs);
                }
            }
        }
        lastSeenFeedTime = events.replicationFeed[0] ? events.replicationFeed[0].time : lastSeenFeedTime;
    });

    /**
     * The slow tick updates counts, rates, sparklines and the
     * remote nodes. Numbers always sit next to the moving parts,
     * so the picture stays readable with motion disabled.
     */
    const tick = () => {
        if (ctx.destroyed || paused) {
            return;
        }
        const now = Date.now();
        const nothingYet = events.firstEventTime === null;
        emptyHint.style.display = nothingYet ? '' : 'none';

        if (database && typeof database.isLeader === 'function') {
            try {
                leaderBadge.style.display = database.isLeader() ? '' : 'none';
            } catch (err) {
                leaderBadge.style.display = 'none';
            }
        }
        const totalWriteRate = Array.from(events.writeTimesByCollection.values())
            .reduce((sum, times) => sum + events.ratePerSecond(times), 0);
        const readRate = events.ratePerSecond(events.readTimes);
        appRates.innerHTML = '';
        appRates.appendChild(el('span', '', [el('span', '', 'w ', { style: 'color:var(--rxdbv-pink)' }), totalWriteRate.toFixed(1) + '/s']));
        appRates.appendChild(el('span', '', [el('span', '', '? ', { style: 'color:var(--rxdbv-info)' }), readRate.toFixed(1) + '/s']));
        const viewerWrites60s = ctx.viewerWriteTimes.filter(t => t > now - 60 * 1000).length;
        viewerWritesLabel.textContent = viewerWrites60s + ' in 60s · from this devtool';

        lanes.forEach((refs, collectionName) => {
            const count = ctx.countsCache.get(collectionName);
            refs.countSpan.textContent = (typeof count === 'number' ? formatInteger(count) : '…') + ' docs';
            const writeTimes = events.writeTimesByCollection.get(collectionName) || [];
            const rate = events.ratePerSecond(writeTimes);
            refs.rateSpan.textContent = (rate >= 10 ? Math.round(rate) : rate.toFixed(1)) + ' w/s';

            // 30 bars, one per 2s bucket
            const buckets = new Array(30).fill(0);
            writeTimes.forEach(time => {
                const age = now - time;
                if (age < 60 * 1000) {
                    const bucket = 29 - Math.floor(age / 2000);
                    if (bucket >= 0 && bucket < 30) {
                        buckets[bucket] = buckets[bucket] + 1;
                    }
                }
            });
            const maxBucket = Math.max(1, ...buckets);
            Array.from(refs.sparkHost.children).forEach((bar, index) => {
                (bar as HTMLElement).style.height = Math.max(4, Math.round((buckets[index] / maxBucket) * 100)) + '%';
                (bar as HTMLElement).style.opacity = buckets[index] === 0 ? '0.25' : '1';
            });

            const lastWrite = events.lastWriteByCollection.get(collectionName);
            const idle = !lastWrite || now - lastWrite > 60 * 1000;
            refs.row.classList.toggle('rxdbv-live-idle', idle && !nothingYet);
            refs.inLabel.textContent = nothingYet
                ? 'no events yet'
                : (idle
                    ? (lastWrite ? 'last write ' + formatTimeAgo(lastWrite) : 'no write this session')
                    : 'writes ' + rate.toFixed(1) + '/s');

            // live queries from the query cache
            const collection = database ? database.collections[collectionName] : null;
            const cachedQueries = collection ? readQueryCache(collection) : [];
            refs.queriesLink.textContent = cachedQueries.length + ' queries ›';
            const execCount = cachedQueries.reduce((sum, q) => sum + q.execCount, 0);
            const hasQueries = cachedQueries.length > 0;
            refs.queryLine.classList.toggle('rxdbv-thread', hasQueries);
            if (refs.lastExecCount >= 0 && execCount > refs.lastExecCount) {
                spawnParticle(refs, refs.queryTrack, '◆', false, 'query');
            }
            refs.lastExecCount = execCount;

            // remote node
            const replications = events.replications.filter(r => r.collectionName === collectionName);
            clearChildren(refs.remoteHost);
            if (replications.length === 0) {
                refs.remoteHost.className = 'rxdbv-live-remote-node rxdbv-none';
                refs.remoteHost.appendChild(el('div', 'rxdbv-dim', [
                    'no replication configured for ',
                    el('span', 'rxdbv-mono', collectionName)
                ], { style: 'font-size:10px;line-height:1.5' }));
                refs.outLabel.textContent = 'no edge drawn';
            } else {
                const info = replications[0];
                const hasError = !!info.lastError && !!info.lastErrorTime && now - info.lastErrorTime < 60 * 1000;
                refs.remoteHost.className = 'rxdbv-live-remote-node' + (hasError ? ' rxdbv-error' : '');
                refs.remoteHost.appendChild(el('div', 'rxdbv-mono', info.identifier, { style: 'font-size:10.5px;word-break:break-all' }));
                const stateLine = (label: string) => {
                    const value = hasError
                        ? el('span', '', '▲ error', { style: 'color:var(--rxdbv-danger)' })
                        : (info.stopped
                            ? el('span', 'rxdbv-muted', '■ stopped')
                            : (info.active
                                ? el('span', '', '● streaming', { style: 'color:var(--rxdbv-success)' })
                                : el('span', 'rxdbv-muted', '○ idle')));
                    return el('div', '', [
                        el('span', 'rxdbv-dim', label),
                        el('div', 'rxdbv-flex1'),
                        value
                    ], { style: 'display:flex' });
                };
                refs.remoteHost.appendChild(el('div', 'rxdbv-mono', [
                    stateLine('pull'),
                    stateLine('push')
                ], { style: 'display:flex;flex-direction:column;gap:3px;margin-top:6px;font-size:9.5px' }));
                if (hasError && info.lastError) {
                    refs.remoteHost.appendChild(el('div', 'rxdbv-mono', '✕ ' + info.lastError, {
                        style: 'margin-top:5px;font-size:9px;color:var(--rxdbv-danger);word-break:break-all'
                    }));
                }
                const pullRate = events.ratePerSecond(events.pullTimes);
                const pushRate = events.ratePerSecond(events.pushTimes);
                refs.outLabel.textContent = 'pull ' + pullRate.toFixed(1) + '/s · push ' + pushRate.toFixed(1) + '/s';
            }
        });

        summaryValues.writes.textContent = formatInteger(events.counters.writes);
        summaryValues.reads.textContent = formatInteger(events.counters.reads);
        summaryValues.pulled.textContent = formatInteger(events.counters.pulled);
        summaryValues.pushed.textContent = formatInteger(events.counters.pushed);
    };
    const tickHandle = setInterval(tick, 1000);
    tick();

    ctx.setCleanup(() => {
        clearInterval(tickHandle);
        eventsSubscription.unsubscribe();
    });
}

/**
 * Sub-panel listing the cached queries of one collection with
 * subscriber-relevant counters, opened from a collection node.
 */
function openLiveQueriesSubPanel(ctx: ViewerContext, panel: HTMLElement, collectionName: string) {
    const database = ctx.source.rawDatabase as any;
    if (!database) {
        return;
    }
    const collection = database.collections[collectionName];
    if (!collection) {
        return;
    }
    const queries = readQueryCache(collection);

    const backdrop = el('div', 'rxdbv-live-subpanel');
    const close = () => backdrop.remove();
    backdrop.addEventListener('click', event => {
        if (event.target === backdrop) {
            close();
        }
    });
    const box = el('div', 'rxdbv-live-subpanel-box');
    box.appendChild(el('div', '', [
        el('span', '', 'Live queries', { style: 'font-weight:700;font-size:12px' }),
        el('span', 'rxdbv-dim rxdbv-mono', collectionName + ' · ' + queries.length + ' cached', { style: 'font-size:10px' }),
        el('div', 'rxdbv-flex1'),
        el('span', 'rxdbv-close', '×', { onClick: close })
    ], { style: 'display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.08)' }));

    const template = '1fr 80px 80px 110px';
    const header = el('div', 'rxdbv-table-header', [
        el('div', '', 'query'),
        el('div', '', 'results'),
        el('div', '', 'execs'),
        el('div', '', 'last emit')
    ]);
    header.style.gridTemplateColumns = template;
    box.appendChild(header);
    queries.forEach(query => {
        const stale = query.lastEmitTime && Date.now() - query.lastEmitTime > 60 * 1000;
        const row = el('div', 'rxdbv-table-row rxdbv-mono', [
            el('div', '', query.queryString, { title: query.queryString }),
            el('div', 'rxdbv-muted', query.resultCount === null ? '—' : formatInteger(query.resultCount)),
            el('div', 'rxdbv-muted', formatInteger(query.execCount)),
            el('div', '', query.lastEmitTime ? formatTimeAgo(query.lastEmitTime) : '—', {
                style: stale ? 'color:var(--rxdbv-warning)' : ''
            })
        ]);
        row.style.gridTemplateColumns = template;
        if (stale) {
            row.style.background = 'rgba(235,203,75,0.07)';
        }
        box.appendChild(row);
    });
    if (queries.length === 0) {
        box.appendChild(el('div', 'rxdbv-dim', 'No cached queries on this collection right now.', { style: 'padding:10px 12px;font-size:11px' }));
    }
    backdrop.appendChild(box);
    panel.appendChild(backdrop);
}
