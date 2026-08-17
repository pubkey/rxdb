import {
    clearChildren,
    el
} from './dbviewer-dom.ts';
import {
    diffViewerJson,
    escapeHtml,
    formatByteSize,
    formatClockTime,
    formatInteger,
    shortRev
} from './dbviewer-helpers.ts';
import type { ViewerChangeEntry } from './dbviewer-types.ts';
import type { ViewerContext } from './dbviewer.ts';

/**
 * Replication panel: per-collection pull/push states with
 * last errors, and the live feed of replicated documents.
 */
export function renderReplicationPanel(ctx: ViewerContext) {
    const panel = el('div', 'rxdbv-panel-scroll');
    ctx.contentHost.appendChild(panel);
    const events = ctx.events;

    if (!events || events.replications.length === 0) {
        panel.appendChild(el('div', 'rxdbv-toolbar', [
            el('span', 'rxdbv-toolbar-title', 'Replication')
        ]));
        panel.appendChild(el('div', 'rxdbv-empty-state', [
            el('div', 'rxdbv-empty-inner', [
                el('div', 'rxdbv-empty-title', 'No replication running'),
                el('div', 'rxdbv-empty-body', [
                    ctx.source.kind === 'dump'
                        ? 'A dump is a static file, the replication live feed is not available on a dump.'
                        : 'Start a replication in the app, for example with ',
                    ctx.source.kind === 'dump' ? '' : el('code', '', 'replicateRxCollection({ ... })'),
                    ctx.source.kind === 'dump' ? '' : ', and its state shows up here.'
                ])
            ])
        ]));
        return;
    }

    const identifiers = Array.from(new Set(events.replications.map(r => r.identifier))).join(', ');
    panel.appendChild(el('div', 'rxdbv-toolbar', [
        el('span', 'rxdbv-toolbar-title', 'Replication'),
        el('span', 'rxdbv-muted', events.replications.length + ' states · ' + identifiers, { style: 'font-size:11px' })
    ]));

    const template = '110px 110px 110px 1fr 1fr';
    const header = el('div', 'rxdbv-table-header', [
        el('div', '', 'collection'),
        el('div', '', 'pull'),
        el('div', '', 'push'),
        el('div', '', 'identifier'),
        el('div', '', 'last error')
    ]);
    header.style.gridTemplateColumns = template;
    panel.appendChild(header);
    const rowsHost = el('div');
    panel.appendChild(rowsHost);

    const feedHeader = el('div', '', [
        el('span', 'rxdbv-section-label', 'LIVE FEED', { style: 'padding:0' }),
        el('span', '', undefined, { style: 'width:7px;height:7px;border-radius:50%;background:var(--rxdbv-success)' }),
        el('span', 'rxdbv-dim', 'documents received and sent, newest first', { style: 'font-size:10px' }),
        el('div', 'rxdbv-flex1')
    ], { style: 'display:flex;align-items:center;gap:8px;padding:14px 12px 4px' });
    let paused = false;
    const pauseButton = el('button', 'rxdbv-btn rxdbv-btn-small', 'Pause', {
        onClick: () => {
            paused = !paused;
            pauseButton.textContent = paused ? 'Resume' : 'Pause';
            if (!paused) {
                renderAll();
            }
        }
    });
    feedHeader.appendChild(pauseButton);
    panel.appendChild(feedHeader);
    const feedHost = el('div');
    panel.appendChild(feedHost);

    const renderStates = () => {
        clearChildren(rowsHost);
        events.replications.forEach(info => {
            const stateGlyph = (active: boolean) => {
                if (info.lastError && info.lastErrorTime && Date.now() - info.lastErrorTime < 60 * 1000) {
                    return el('div', '', '▲ error', { style: 'color:var(--rxdbv-danger)' });
                }
                if (info.stopped) {
                    return el('div', 'rxdbv-muted', '■ stopped');
                }
                if (active) {
                    return el('div', '', '● streaming', { style: 'color:var(--rxdbv-success)' });
                }
                return el('div', 'rxdbv-muted', '○ idle');
            };
            const row = el('div', 'rxdbv-table-row', [
                el('div', 'rxdbv-mono', info.collectionName),
                stateGlyph(info.active),
                stateGlyph(info.active),
                el('div', 'rxdbv-mono rxdbv-muted', info.identifier, { style: 'font-size:10.5px' }),
                el('div', 'rxdbv-mono', info.lastError
                    ? info.lastError + (info.lastErrorTime ? ' · ' + formatClockTime(info.lastErrorTime) : '')
                    : '—', {
                    style: 'font-size:10.5px;color:' + (info.lastError ? 'var(--rxdbv-danger)' : 'var(--rxdbv-fg-dim)')
                })
            ]);
            row.style.gridTemplateColumns = template;
            rowsHost.appendChild(row);
        });
    };

    const renderFeed = () => {
        clearChildren(feedHost);
        events.replicationFeed.slice(0, 60).forEach(entry => {
            const glyph = el('span', 'rxdbv-mono', entry.direction === 'pull' ? '↓' : '↑', {
                style: 'width:12px;font-weight:700;color:' + (entry.direction === 'pull' ? 'var(--rxdbv-info)' : 'var(--rxdbv-pink)')
            });
            feedHost.appendChild(el('div', '', [
                glyph,
                el('span', 'rxdbv-dim rxdbv-mono', formatClockTime(entry.time, true).slice(0, 10), { style: 'width:90px' }),
                el('span', 'rxdbv-mono', entry.collectionName, { style: 'width:90px' }),
                el('span', 'rxdbv-mono rxdbv-muted', entry.documentId, { style: 'width:110px;overflow:hidden;text-overflow:ellipsis' }),
                el('span', 'rxdbv-mono rxdbv-dim rxdbv-flex1', entry.direction + ' · ' + shortRev(entry.rev) + ' · ' + formatByteSize(entry.byteSize))
            ], { style: 'display:flex;gap:12px;margin:0 12px;padding:4px 10px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:11px;align-items:center' }));
        });
        if (events.replicationFeed.length === 0) {
            feedHost.appendChild(el('div', 'rxdbv-dim', 'No documents replicated since the viewer opened.', { style: 'padding:8px 22px;font-size:11px' }));
        }
    };

    const renderAll = () => {
        renderStates();
        renderFeed();
    };
    renderAll();

    const subscription = events.changed$.subscribe(() => {
        if (!paused && !ctx.destroyed) {
            renderAll();
        }
    });
    ctx.setCleanup(() => subscription.unsubscribe());
}

/**
 * Changes panel: master/detail split with the live write feed
 * on the left and a unified diff of the selected change on the right.
 */
export function renderChangesPanel(ctx: ViewerContext) {
    const panel = el('div', 'rxdbv-content');
    ctx.contentHost.appendChild(panel);
    const events = ctx.events;
    if (!events) {
        panel.appendChild(el('div', 'rxdbv-toolbar', [el('span', 'rxdbv-toolbar-title', 'Changes')]));
        panel.appendChild(el('div', 'rxdbv-empty-state', [
            el('div', 'rxdbv-empty-inner', [
                el('div', 'rxdbv-empty-title', 'Not available on a dump'),
                el('div', 'rxdbv-empty-body', 'A dump is a static file, there are no live changes to record.')
            ])
        ]));
        return;
    }

    let paused = false;
    let filterText = '';
    let selectedEntry: ViewerChangeEntry | null = events.changes[0] || null;

    const filterInput = el('input', 'rxdbv-filter-input', undefined, {
        placeholder: 'filter: collection or id…'
    }) as HTMLInputElement;
    filterInput.addEventListener('input', () => {
        filterText = filterInput.value.toLowerCase();
        renderList();
    });
    const recordingDot = el('span', '', undefined, { style: 'width:7px;height:7px;border-radius:50%;background:var(--rxdbv-success)' });
    const sessionCounter = el('span', 'rxdbv-dim', '', { style: 'font-size:10px' });
    const pauseButton = el('button', 'rxdbv-btn rxdbv-btn-small', 'Pause', {
        onClick: () => {
            paused = !paused;
            pauseButton.textContent = paused ? 'Resume' : 'Pause';
            recordingDot.style.background = paused ? 'var(--rxdbv-fg-dim)' : 'var(--rxdbv-success)';
            if (!paused) {
                renderList();
            }
        }
    });
    panel.appendChild(el('div', 'rxdbv-toolbar', [
        el('span', 'rxdbv-toolbar-title', 'Changes'),
        recordingDot,
        sessionCounter,
        filterInput,
        el('div', 'rxdbv-flex1'),
        pauseButton,
        el('button', 'rxdbv-btn rxdbv-btn-small', 'Clear', {
            onClick: () => {
                events.changes.length = 0;
                selectedEntry = null;
                renderList();
                renderDetail();
            }
        })
    ]));

    const listHost = el('div', 'rxdbv-split-left');
    const detailHost = el('div', 'rxdbv-split-right');
    panel.appendChild(el('div', 'rxdbv-split', [listHost, detailHost]));

    const template = '100px 70px 90px 110px 1fr';
    const opColor = (operation: string) =>
        operation === 'INSERT' ? 'var(--rxdbv-success)' : (operation === 'DELETE' ? 'var(--rxdbv-danger)' : 'var(--rxdbv-warning)');

    const renderList = () => {
        clearChildren(listHost);
        sessionCounter.textContent = (paused ? 'paused' : 'recording') + ' · ' + formatInteger(events.sessionWrites) + ' writes this session';
        const header = el('div', 'rxdbv-table-header', [
            el('div', '', 'time'),
            el('div', '', 'op'),
            el('div', '', 'collection'),
            el('div', '', 'id'),
            el('div', '', 'rev')
        ]);
        header.style.gridTemplateColumns = template;
        listHost.appendChild(header);
        const visible = events.changes.filter(entry => {
            if (!filterText) {
                return true;
            }
            return entry.collectionName.toLowerCase().includes(filterText) ||
                entry.documentId.toLowerCase().includes(filterText);
        }).slice(0, 100);
        visible.forEach(entry => {
            const row = el('div', 'rxdbv-table-row rxdbv-clickable rxdbv-mono' + (entry === selectedEntry ? ' rxdbv-selected' : ''), [
                el('div', 'rxdbv-dim', formatClockTime(entry.time, true)),
                el('div', '', entry.operation, { style: 'font-weight:700;color:' + opColor(entry.operation) }),
                el('div', '', entry.collectionName),
                el('div', 'rxdbv-muted', entry.documentId),
                el('div', 'rxdbv-dim', (entry.revFrom ? shortRev(entry.revFrom) + ' → ' : '→ ') + shortRev(entry.revTo))
            ], {
                onClick: () => {
                    selectedEntry = entry;
                    renderList();
                    renderDetail();
                }
            });
            row.style.gridTemplateColumns = template;
            listHost.appendChild(row);
        });
        if (visible.length === 0) {
            listHost.appendChild(el('div', 'rxdbv-dim', 'This screen updates as the app writes. Nothing has been recorded yet.', { style: 'padding:12px;font-size:11px' }));
        }
    };

    const renderDetail = () => {
        clearChildren(detailHost);
        const entry = selectedEntry;
        if (!entry) {
            detailHost.appendChild(el('div', 'rxdbv-dim', 'Select a change to see its diff.', { style: 'padding:12px;font-size:11px' }));
            return;
        }
        detailHost.appendChild(el('div', '', [
            el('span', 'rxdbv-mono', entry.operation, { style: 'font-weight:700;color:' + opColor(entry.operation) }),
            el('span', 'rxdbv-mono', entry.collectionName + ' / ' + entry.documentId),
            el('span', 'rxdbv-mono rxdbv-dim', (entry.revFrom ? shortRev(entry.revFrom) + ' → ' : '→ ') + shortRev(entry.revTo)),
            el('div', 'rxdbv-flex1'),
            el('a', '', 'open document', {
                style: 'font-size:10px',
                onClick: () => ctx.navigate({ view: 'collection', collectionName: entry.collectionName })
            })
        ], { style: 'display:flex;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.08);font-size:11px' }));

        const diff = diffViewerJson(entry.previousDocumentData || null, entry.documentData || null);
        const diffBlock = el('div', 'rxdbv-diff-block');
        diffBlock.innerHTML = diff.map(line => {
            if (line.kind === 'removed') {
                return '<span class="rxdbv-diff-line-removed">- ' + escapeHtml(line.text) + '</span>';
            }
            if (line.kind === 'added') {
                return '<span class="rxdbv-diff-line-added">+ ' + escapeHtml(line.text) + '</span>';
            }
            return '<span class="rxdbv-diff-line-same">  ' + escapeHtml(line.text) + '</span>';
        }).join('');
        detailHost.appendChild(diffBlock);
        detailHost.appendChild(el('div', 'rxdbv-dim', entry.fromReplication
            ? 'source: replication (pulled from the remote)'
            : 'source: local write of this database instance', {
            style: 'padding:0 12px 12px;font-size:10px'
        }));
    };

    renderList();
    renderDetail();

    let pendingRender = false;
    const subscription = events.changed$.subscribe(() => {
        if (paused || ctx.destroyed || pendingRender) {
            return;
        }
        pendingRender = true;
        setTimeout(() => {
            pendingRender = false;
            if (!paused && !ctx.destroyed) {
                renderList();
            }
        }, 150);
    });
    ctx.setCleanup(() => subscription.unsubscribe());
}
