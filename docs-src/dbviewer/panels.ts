import {
    analyzeViewerDocuments,
    colorViewerJson,
    formatByteSize,
    formatInteger,
    parseViewerSelector
} from '../../src/plugins/dbviewer/dbviewer-helpers.ts';
import type { ViewerFieldType } from '../../src/plugins/dbviewer/dbviewer-types.ts';
import type { PageContext } from './context.ts';
import {
    buildInfoBox,
    buildToggle,
    clearChildren,
    el,
    withCopyButton
} from './dom.ts';
import { showViewerError } from './error.ts';

const SCHEMA_SAMPLE_LIMIT = 1000;

const TYPE_COLORS: { [key in ViewerFieldType]: string } = {
    string: '#199BF1',
    number: '#EBCB4B',
    boolean: '#3ECF8E',
    array: '#B2218B',
    object: '#752A8A',
    null: '#3A4256',
    missing: '#3A4256'
};

function panelToolbar(title: string, children: (HTMLElement | string | null)[] = []): HTMLElement {
    return el('div', 'rxdbv-toolbar', ([
        el('span', 'rxdbv-toolbar-title', title)
    ] as (HTMLElement | string | null)[]).concat(children));
}

function statCard(label: string, value: string | HTMLElement, color?: string): HTMLElement {
    const valueElement = el('div', 'rxdbv-stat-value', typeof value === 'string' ? value : [value]);
    if (color) {
        valueElement.style.color = color;
    }
    return el('div', 'rxdbv-stat-card', [
        el('div', 'rxdbv-stat-label', label),
        valueElement
    ]);
}

/**
 * Schema panel: samples documents, shows per-field type shares,
 * presence and value details, plus violations against
 * the declared schema.
 */
export function renderSchemaPanel(ctx: PageContext) {
    const collectionName = ctx.currentCollectionName();
    const panel = el('div', 'rxdbv-panel-scroll');
    ctx.contentHost.appendChild(panel);
    if (!collectionName) {
        panel.appendChild(panelToolbar('Schema', [el('span', 'rxdbv-dim', 'no collection')]));
        return;
    }
    const info = ctx.source.listCollections().find(c => c.name === collectionName);
    const viewMode = ctx.schemaViewMode.get(collectionName) || 'analysis';
    const setViewMode = (mode: 'analysis' | 'schema') => {
        ctx.schemaViewMode.set(collectionName, mode);
        ctx.renderContent();
    };
    const segments = buildToggle([
        { value: 'analysis', label: 'Analysis' },
        { value: 'schema', label: 'JSON schema' }
    ], viewMode, setViewMode);
    const legend = el('span', 'rxdbv-dim', undefined, { style: 'font-size:10px' });
    legend.innerHTML = (['string', 'number', 'boolean', 'array', 'object', 'missing'] as ViewerFieldType[])
        .map(type => type + ' <span style="display:inline-block;width:8px;height:8px;background:' + TYPE_COLORS[type] + '"></span>')
        .join(' · ');

    if (viewMode === 'schema') {
        const versionText = info && typeof info.schemaVersion === 'number' ? ' · declared v' + info.schemaVersion : '';
        panel.appendChild(panelToolbar('Schema', [
            segments,
            el('span', 'rxdbv-mono rxdbv-muted', collectionName + versionText, { style: 'font-size:11px' })
        ]));
        if (info && info.jsonSchema) {
            const jsonView = el('div', 'rxdbv-json-view');
            jsonView.innerHTML = colorViewerJson(info.jsonSchema);
            panel.appendChild(withCopyButton(jsonView, () => JSON.stringify(info.jsonSchema, null, 2)));
        } else {
            panel.appendChild(el('div', 'rxdbv-empty-state', [
                el('div', 'rxdbv-empty-inner', [
                    el('div', 'rxdbv-empty-title', 'No declared schema'),
                    el('div', 'rxdbv-empty-body', 'A dump does not contain the schema declaration. The Analysis mode still works on the sampled documents.')
                ])
            ]));
        }
        return;
    }

    const headerText = el('span', 'rxdbv-mono rxdbv-muted', collectionName + ' · sampling…', { style: 'font-size:11px' });
    panel.appendChild(panelToolbar('Schema', [
        segments,
        headerText,
        el('div', 'rxdbv-flex1'),
        legend
    ]));

    const tableHost = el('div');
    panel.appendChild(tableHost);

    ctx.source.query(collectionName, {}, 0, SCHEMA_SAMPLE_LIMIT).then(result => {
        if (ctx.destroyed) {
            return;
        }
        const analysis = analyzeViewerDocuments(
            result.docs,
            info ? info.jsonSchema : undefined,
            info ? info.primaryPath : undefined
        );
        const declared = info && typeof info.schemaVersion === 'number' ? 'declared v' + info.schemaVersion + ' · ' : '';
        headerText.textContent = collectionName + ' · ' + declared + 'sampled ' + formatInteger(analysis.sampled) + ' documents';

        const template = '130px 260px 90px 1fr';
        const header = el('div', 'rxdbv-table-header', [
            el('div', '', 'field'),
            el('div', '', 'types'),
            el('div', '', 'presence'),
            el('div', '', 'values')
        ]);
        header.style.gridTemplateColumns = template;
        tableHost.appendChild(header);

        analysis.fields.forEach(field => {
            const bar = el('div', 'rxdbv-type-bar');
            field.types.forEach(share => {
                const segment = el('div', '', undefined, {
                    title: share.type + ' ' + Math.round(share.share * 100) + '%'
                });
                segment.style.width = (share.share * 100) + '%';
                segment.style.background = TYPE_COLORS[share.type];
                bar.appendChild(segment);
            });
            const presence = el('div', 'rxdbv-mono', field.presence + '%');
            presence.style.color = field.presence === 100 ? 'var(--rxdbv-success)' : 'var(--rxdbv-warning)';
            const row = el('div', 'rxdbv-table-row', [
                el('div', 'rxdbv-mono', field.name),
                el('div', '', [bar]),
                presence,
                el('div', 'rxdbv-mono rxdbv-muted', field.detail, { style: 'font-size:10.5px' })
            ]);
            row.style.gridTemplateColumns = template;
            tableHost.appendChild(row);
        });

        if (analysis.violations.length > 0) {
            tableHost.appendChild(el('div', '', [
                el('span', '', 'Schema violations', { style: 'font-weight:700;font-size:12px' }),
                el('span', '', formatInteger(analysis.violations.length) + ' findings', {
                    style: 'font-size:10px;background:rgba(253,54,110,0.15);color:#FD366E;border:1px solid rgba(253,54,110,0.4);padding:1px 7px'
                }),
                el('span', 'rxdbv-dim', 'documents that do not match the declared schema', { style: 'font-size:10px' })
            ], { style: 'margin:16px 12px 4px;display:flex;align-items:center;gap:8px' }));
            analysis.violations.slice(0, 30).forEach(violation => {
                tableHost.appendChild(el('div', '', [
                    el('span', '', '▲', { style: 'color:var(--rxdbv-danger)' }),
                    el('span', 'rxdbv-mono rxdbv-muted', violation.id, { style: 'width:90px;overflow:hidden;text-overflow:ellipsis' }),
                    el('span', 'rxdbv-mono rxdbv-flex1', violation.message),
                    el('a', '', 'open', {
                        style: 'font-size:10px',
                        onClick: () => ctx.navigate({ view: 'collection', collectionName })
                    })
                ], { style: 'display:flex;gap:12px;margin:0 12px;padding:5px 10px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:11px;align-items:center' }));
            });
        } else if (info && info.jsonSchema) {
            tableHost.appendChild(el('div', 'rxdbv-dim', 'No schema violations in the sample.', { style: 'margin:16px 12px;font-size:11px' }));
        }
    });
}

/**
 * Explain view, opened from the Explain button of a collection:
 * runs the query, shows the used index, the execution plan
 * derived from the query planner and findings about unindexed
 * parts.
 */
export function renderExplainPanel(ctx: PageContext) {
    const collectionName = ctx.currentCollectionName();
    const panel = el('div', 'rxdbv-panel-scroll');
    ctx.contentHost.appendChild(panel);
    if (!collectionName) {
        panel.appendChild(panelToolbar('Explain', [el('span', 'rxdbv-dim', 'no collection')]));
        return;
    }
    const uiState = ctx.collectionState.get(collectionName);
    const initialQuery = uiState && uiState.queryInput ? uiState.queryInput : '';

    const queryInput = el('input', 'rxdbv-query-input', undefined, {
        value: initialQuery,
        placeholder: '{ "field": "value" }'
    }) as HTMLInputElement;
    const inputWrap = el('div', 'rxdbv-query-input-wrap', [
        el('span', 'rxdbv-dim', 'find'),
        queryInput
    ]);
    const explainButton = el('button', 'rxdbv-btn', 'Explain');
    const runButton = el('button', 'rxdbv-btn-primary', 'Run', {
        onClick: () => {
            if (uiState) {
                uiState.queryInput = queryInput.value;
                const parsed = parseViewerSelector(queryInput.value);
                if (!parsed.error) {
                    uiState.appliedSelector = parsed.selector;
                    uiState.page = 0;
                }
            }
            ctx.navigate({ view: 'collection', collectionName });
        }
    });
    panel.appendChild(el('div', 'rxdbv-toolbar', [
        el('span', 'rxdbv-toolbar-title', 'Explain'),
        el('span', 'rxdbv-mono rxdbv-muted', collectionName, { style: 'font-size:11px' }),
        inputWrap,
        explainButton,
        runButton
    ]));

    const resultHost = el('div');
    panel.appendChild(resultHost);

    const explain = () => {
        clearChildren(resultHost);
        const parsed = parseViewerSelector(queryInput.value);
        if (parsed.error) {
            resultHost.appendChild(el('div', 'rxdbv-query-error-block', [
                el('div', 'rxdbv-query-error-message', '✕ ' + parsed.error.message)
            ]));
            return;
        }
        runExplain(ctx, collectionName, parsed.selector, resultHost);
    };
    explainButton.addEventListener('click', explain);
    queryInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            explain();
        }
    });
    explain();
}

function runExplain(
    ctx: PageContext,
    collectionName: string,
    selector: any,
    resultHost: HTMLElement
) {
    const dumpMode = ctx.source.kind === 'dump';

    const started = performance.now();
    Promise.all([
        ctx.source.query(collectionName, selector, 0, ctx.pageSize),
        ctx.source.explain(collectionName, selector)
    ]).then(([result, plan]) => {
        if (ctx.destroyed) {
            return;
        }
        const elapsed = performance.now() - started;
        const returned = result.total !== null ? result.total : result.docs.length;

        const cards = el('div', 'rxdbv-stat-cards');
        cards.appendChild(statCard('INDEX USED', plan.index ? JSON.stringify(plan.index) : (dumpMode ? 'n/a (dump scan)' : 'n/a')));
        cards.appendChild(statCard('EXAMINED', plan.examined === null ? 'n/a' : formatInteger(plan.examined), 'var(--rxdbv-warning)'));
        cards.appendChild(statCard('RETURNED', formatInteger(returned), 'var(--rxdbv-success)'));
        cards.appendChild(statCard('ELAPSED', elapsed.toFixed(1) + ' ms'));
        resultHost.appendChild(cards);

        if (plan.index) {
            resultHost.appendChild(el('div', 'rxdbv-section-label', 'EXECUTION PLAN', { style: 'padding-top:0' }));
            const planBox = el('div', 'rxdbv-plan-box');
            planBox.appendChild(el('div', 'rxdbv-plan-step', [
                el('span', 'rxdbv-plan-num', '1'),
                el('span', 'rxdbv-plan-desc', 'index scan on ' + JSON.stringify(plan.index) + (plan.bounds.length > 0 ? ' — bounds: ' + plan.bounds.join(', ') : ' — full index range'))
            ]));
            if (!plan.selectorSatisfiedByIndex) {
                planBox.appendChild(el('div', 'rxdbv-plan-step', [
                    el('span', 'rxdbv-plan-num', '2'),
                    el('span', 'rxdbv-plan-desc', 'in-memory filter — ' + (plan.unindexedFields.length > 0 ? plan.unindexedFields.join(', ') : 'selector re-checked per document'))
                ]));
            }
            const sortStep = el('div', 'rxdbv-plan-step', [
                el('span', 'rxdbv-plan-num', plan.selectorSatisfiedByIndex ? '2' : '3'),
                el('span', 'rxdbv-plan-desc', plan.sortSatisfiedByIndex ? 'sort — skipped, index order reused' : 'sort — done in memory after fetching'),
                el('span', '', plan.sortSatisfiedByIndex ? '0 ms' : '', { style: 'color:var(--rxdbv-success)' })
            ]);
            planBox.appendChild(sortStep);
            resultHost.appendChild(planBox);
        }

        resultHost.appendChild(el('div', 'rxdbv-section-label', 'FINDINGS'));
        let findings = 0;
        if (plan.hasRegex) {
            findings = findings + 1;
            resultHost.appendChild(buildInfoBox('danger', '✕ This query cannot use an index', [
                el('code', '', '$regex'),
                ' selectors always scan the whole collection. Prefer a prefix match on an indexed field.'
            ]));
        }
        if (plan.index && plan.unindexedFields.length > 0 && !plan.hasRegex) {
            findings = findings + 1;
            const indexedSelectorFields = plan.index.filter(field => !plan.unindexedFields.includes(field) && field !== '_deleted');
            const suggested = JSON.stringify(indexedSelectorFields.concat(plan.unindexedFields));
            resultHost.appendChild(buildInfoBox('warning', '▲ ' + plan.unindexedFields.join(', ') + ' is not covered by the used index', [
                'Documents matching the index bounds are re-checked in memory. Add a compound index ',
                el('code', '', suggested),
                ' to the schema to make this query fully indexed.'
            ]));
        }
        if (findings === 0) {
            resultHost.appendChild(buildInfoBox('info', null, dumpMode
                ? 'Dump mode scans the loaded documents in memory, index analysis needs a live database.'
                : 'No findings. The selector is fully covered by the used index.'));
        }
    }).catch(err => {
        showViewerError(ctx.root, 'Explain failed', err);
    });
}

/**
 * Storage panel: engine, per-collection document counts,
 * tombstones and attachment bytes collected on the host side.
 */
export function renderStoragePanel(ctx: PageContext) {
    const panel = el('div', 'rxdbv-panel-scroll');
    ctx.contentHost.appendChild(panel);
    panel.appendChild(panelToolbar('Storage'));

    const cards = el('div', 'rxdbv-stat-cards');
    cards.appendChild(statCard('ENGINE', ctx.source.storageName));
    cards.appendChild(statCard('DATABASE', ctx.source.databaseName + ' · rxdb v' + ctx.source.rxdbVersion));
    const documentsCard = statCard('DOCUMENTS', '…');
    cards.appendChild(documentsCard);
    const attachmentsCard = statCard('ATTACHMENT BYTES', '…');
    cards.appendChild(attachmentsCard);
    panel.appendChild(cards);

    const template = '1fr 130px 130px 170px';
    const header = el('div', 'rxdbv-table-header', [
        el('div', '', 'collection'),
        el('div', '', 'documents'),
        el('div', '', 'tombstones'),
        el('div', '', 'attachment bytes')
    ]);
    header.style.gridTemplateColumns = template;
    panel.appendChild(header);
    const rowsHost = el('div');
    panel.appendChild(rowsHost);

    ctx.source.storageStats().then(stats => {
        if (ctx.destroyed) {
            return;
        }
        let totalDocs = 0;
        let totalTombstones = 0;
        let totalAttachmentBytes = 0;
        stats.rows.forEach(row => {
            totalDocs = totalDocs + (row.documents || 0);
            totalTombstones = totalTombstones + (row.tombstones || 0);
            totalAttachmentBytes = totalAttachmentBytes + row.attachmentBytes;
            const rowElement = el('div', 'rxdbv-table-row rxdbv-mono', [
                el('div', '', row.name),
                el('div', '', row.documents === null ? '—' : formatInteger(row.documents)),
                el('div', 'rxdbv-muted', row.tombstones === null ? '—' : formatInteger(row.tombstones)),
                el('div', 'rxdbv-muted', row.attachmentBytes > 0
                    ? formatByteSize(row.attachmentBytes) + ' (' + row.attachmentCount + ' files)'
                    : '—')
            ]);
            rowElement.style.gridTemplateColumns = template;
            rowsHost.appendChild(rowElement);
        });
        const totals = el('div', 'rxdbv-table-row rxdbv-mono', [
            el('div', '', 'total'),
            el('div', '', formatInteger(totalDocs)),
            el('div', '', formatInteger(totalTombstones)),
            el('div', '', totalAttachmentBytes > 0 ? formatByteSize(totalAttachmentBytes) : '—')
        ]);
        totals.style.gridTemplateColumns = template;
        totals.style.fontWeight = '700';
        totals.style.borderBottom = '1px solid rgba(255,255,255,0.14)';
        rowsHost.appendChild(totals);

        (documentsCard.querySelector('.rxdbv-stat-value') as HTMLElement).textContent = formatInteger(totalDocs);
        (attachmentsCard.querySelector('.rxdbv-stat-value') as HTMLElement).textContent =
            totalAttachmentBytes > 0 ? formatByteSize(totalAttachmentBytes) : '—';
    }).catch(err => {
        showViewerError(ctx.root, 'Reading storage stats failed', err);
    });
}

/**
 * Cleanup tool: shows per collection how many tombstones a
 * cleanup could purge and what share of the stored rows that
 * is, plus the action to run the cleanup.
 */
export function renderCleanupPanel(ctx: PageContext) {
    const panel = el('div', 'rxdbv-panel-scroll');
    ctx.contentHost.appendChild(panel);
    panel.appendChild(panelToolbar('Cleanup'));

    const cards = el('div', 'rxdbv-stat-cards');
    const cleanableCard = statCard('CLEANABLE TOMBSTONES', '…', 'var(--rxdbv-warning)');
    cards.appendChild(cleanableCard);
    const shareCard = statCard('SHARE OF STORED ROWS', '…');
    cards.appendChild(shareCard);
    panel.appendChild(cards);

    const template = '1fr 130px 130px 170px';
    const header = el('div', 'rxdbv-table-header', [
        el('div', '', 'collection'),
        el('div', '', 'documents'),
        el('div', '', 'tombstones'),
        el('div', '', 'cleanable share')
    ]);
    header.style.gridTemplateColumns = template;
    panel.appendChild(header);
    const rowsHost = el('div');
    panel.appendChild(rowsHost);
    const actionHost = el('div');
    panel.appendChild(actionHost);

    ctx.source.storageStats().then(stats => {
        if (ctx.destroyed) {
            return;
        }
        let totalRows = 0;
        let totalTombstones = 0;
        stats.rows.forEach(row => {
            const documents = row.documents || 0;
            const tombstones = row.tombstones || 0;
            totalRows = totalRows + documents + tombstones;
            totalTombstones = totalTombstones + tombstones;
            const share = documents + tombstones > 0
                ? Math.round((tombstones / (documents + tombstones)) * 100)
                : 0;
            const rowElement = el('div', 'rxdbv-table-row rxdbv-mono', [
                el('div', '', row.name),
                el('div', 'rxdbv-muted', row.documents === null ? '—' : formatInteger(documents)),
                el('div', '', row.tombstones === null ? '—' : formatInteger(tombstones), {
                    style: tombstones > 0 ? 'color:var(--rxdbv-warning)' : ''
                }),
                el('div', 'rxdbv-muted', row.tombstones === null ? '—' : share + '%')
            ]);
            rowElement.style.gridTemplateColumns = template;
            rowsHost.appendChild(rowElement);
        });

        (cleanableCard.querySelector('.rxdbv-stat-value') as HTMLElement).textContent = formatInteger(totalTombstones);
        (shareCard.querySelector('.rxdbv-stat-value') as HTMLElement).textContent = totalRows > 0
            ? Math.round((totalTombstones / totalRows) * 100) + '%'
            : '0%';

        const card = el('div', 'rxdbv-cleanup-card', [
            el('div', '', 'Run cleanup', { style: 'font-weight:700;font-size:12px' }),
            el('div', 'rxdbv-muted', 'Purges the tombstones of deleted documents from the storage. Peers whose replication checkpoint predates the cleanup must re-sync from scratch.', {
                style: 'font-size:11.5px;margin-top:4px;line-height:1.55'
            })
        ]);
        if (ctx.source.kind === 'dump') {
            card.appendChild(el('div', 'rxdbv-dim', 'Not available on a dump.', {
                style: 'margin-top:10px;font-size:11px'
            }));
        } else if (stats.cleanupSupported) {
            const runButton = el('button', 'rxdbv-btn-danger-outline', 'Run cleanup — purge ' + formatInteger(totalTombstones) + ' tombstones', {
                style: 'margin-top:10px',
                onClick: () => {
                    ctx.source.cleanup()
                        .then(() => ctx.renderContent())
                        .catch(err => showViewerError(ctx.root, 'Cleanup failed', err));
                }
            }) as HTMLButtonElement;
            if (totalTombstones === 0) {
                runButton.disabled = true;
                runButton.textContent = 'Run cleanup — nothing to purge';
            }
            card.appendChild(runButton);
        } else {
            card.appendChild(el('div', 'rxdbv-dim', 'Add the cleanup plugin (RxDBCleanupPlugin) to run a cleanup from here.', {
                style: 'margin-top:10px;font-size:11px'
            }));
        }
        actionHost.appendChild(card);
    }).catch(err => {
        showViewerError(ctx.root, 'Reading storage stats failed', err);
    });
}
