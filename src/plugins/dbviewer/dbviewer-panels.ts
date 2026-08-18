import type {
    RxCollection
} from '../../index.d.ts';
import {
    normalizeMangoQuery,
    prepareQuery
} from '../../rx-query-helper.ts';
import {
    INDEX_MAX,
    INDEX_MIN
} from '../../query-planner.ts';
import { RXDB_VERSION } from '../utils/index.ts';
import {
    clearChildren,
    el,
    withCopyButton
} from './dbviewer-dom.ts';
import { showViewerError } from './dbviewer-error.ts';
import {
    analyzeViewerDocuments,
    colorViewerJson,
    formatByteSize,
    formatInteger,
    parseViewerSelector
} from './dbviewer-helpers.ts';
import type { ViewerContext } from './dbviewer.ts';
import type { ViewerFieldType } from './dbviewer-types.ts';

const SCHEMA_SAMPLE_LIMIT = 1000;
const STORAGE_SCAN_LIMIT = 5000;

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
export function renderSchemaPanel(ctx: ViewerContext) {
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
    const segments = el('div', 'rxdbv-segments', [
        el('div', 'rxdbv-segment' + (viewMode === 'analysis' ? ' rxdbv-active' : ''), 'Analysis', {
            onClick: () => setViewMode('analysis')
        }),
        el('div', 'rxdbv-segment' + (viewMode === 'schema' ? ' rxdbv-active' : ''), 'JSON schema', {
            onClick: () => setViewMode('schema')
        })
    ]);
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
 * Query lab: runs the query, shows the used index,
 * the execution plan derived from the query planner
 * and findings about unindexed parts.
 */
export function renderQueryLabPanel(ctx: ViewerContext) {
    const collectionName = ctx.currentCollectionName();
    const panel = el('div', 'rxdbv-panel-scroll');
    ctx.contentHost.appendChild(panel);
    if (!collectionName) {
        panel.appendChild(panelToolbar('Query lab', [el('span', 'rxdbv-dim', 'no collection')]));
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
    const explainButton = el('button', 'rxdbv-btn', 'Explain', {
        style: 'border-color:var(--rxdbv-pink);background:rgba(237,22,143,0.12)'
    });
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
        el('span', 'rxdbv-toolbar-title', 'Query lab'),
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

function collectSelectorFields(selector: any, target: Set<string>) {
    Object.entries(selector || {}).forEach(([key, value]) => {
        if (key === '$and' || key === '$or' || key === '$nor') {
            if (Array.isArray(value)) {
                value.forEach(sub => collectSelectorFields(sub, target));
            }
            return;
        }
        if (!key.startsWith('$')) {
            target.add(key);
        }
    });
}

function selectorHasRegex(selector: any): boolean {
    if (selector === null || typeof selector !== 'object') {
        return false;
    }
    return Object.entries(selector).some(([key, value]) => {
        if (key === '$regex') {
            return true;
        }
        return selectorHasRegex(value);
    });
}

function runExplain(
    ctx: ViewerContext,
    collectionName: string,
    selector: any,
    resultHost: HTMLElement
) {
    const database = ctx.source.rawDatabase;
    const dumpMode = !database;

    const started = performance.now();
    ctx.source.query(collectionName, selector, 0, ctx.pageSize).then(result => {
        if (ctx.destroyed) {
            return;
        }
        const elapsed = performance.now() - started;
        const returned = result.total !== null ? result.total : result.docs.length;

        let queryPlan: any = null;
        let storageInstance: any = null;
        if (database) {
            const collection = (database.collections as any)[collectionName] as RxCollection<any>;
            storageInstance = (collection as any).storageInstance;
            try {
                const normalized = normalizeMangoQuery(storageInstance.schema, { selector });
                const prepared = prepareQuery(storageInstance.schema, normalized as any);
                queryPlan = (prepared as any).queryPlan;
            } catch (err) {
                queryPlan = null;
            }
        }

        const cards = el('div', 'rxdbv-stat-cards');
        cards.appendChild(statCard('INDEX USED', queryPlan ? JSON.stringify(queryPlan.index) : (dumpMode ? 'n/a (dump scan)' : 'n/a')));
        const examinedCard = statCard('EXAMINED', '…', 'var(--rxdbv-warning)');
        cards.appendChild(examinedCard);
        cards.appendChild(statCard('RETURNED', formatInteger(returned), 'var(--rxdbv-success)'));
        cards.appendChild(statCard('ELAPSED', elapsed.toFixed(1) + ' ms'));
        resultHost.appendChild(cards);

        const selectorFields = new Set<string>();
        collectSelectorFields(selector, selectorFields);
        const unindexedFields = queryPlan
            ? Array.from(selectorFields).filter(field => !queryPlan.index.includes(field))
            : [];

        if (queryPlan) {
            resultHost.appendChild(el('div', 'rxdbv-section-label', 'EXECUTION PLAN', { style: 'padding-top:0' }));
            const plan = el('div', 'rxdbv-plan-box');
            const bounds = queryPlan.index
                .map((field: string, index: number) => {
                    const start = queryPlan.startKeys[index];
                    const end = queryPlan.endKeys[index];
                    if (start === INDEX_MIN && end === INDEX_MAX) {
                        return null;
                    }
                    if (start === end) {
                        return field + ' = ' + JSON.stringify(start);
                    }
                    return field + ' in [' + JSON.stringify(start) + ' … ' + JSON.stringify(end) + ']';
                })
                .filter((entry: string | null) => entry !== null);
            plan.appendChild(el('div', 'rxdbv-plan-step', [
                el('span', 'rxdbv-plan-num', '1'),
                el('span', 'rxdbv-plan-desc', 'index scan on ' + JSON.stringify(queryPlan.index) + (bounds.length > 0 ? ' — bounds: ' + bounds.join(', ') : ' — full index range'))
            ]));
            if (!queryPlan.selectorSatisfiedByIndex) {
                plan.appendChild(el('div', 'rxdbv-plan-step', [
                    el('span', 'rxdbv-plan-num', '2'),
                    el('span', 'rxdbv-plan-desc', 'in-memory filter — ' + (unindexedFields.length > 0 ? unindexedFields.join(', ') : 'selector re-checked per document'))
                ]));
            }
            const sortStep = el('div', 'rxdbv-plan-step', [
                el('span', 'rxdbv-plan-num', queryPlan.selectorSatisfiedByIndex ? '2' : '3'),
                el('span', 'rxdbv-plan-desc', queryPlan.sortSatisfiedByIndex ? 'sort — skipped, index order reused' : 'sort — done in memory after fetching'),
                el('span', '', queryPlan.sortSatisfiedByIndex ? '0 ms' : '', { style: 'color:var(--rxdbv-success)' })
            ]);
            plan.appendChild(sortStep);
            resultHost.appendChild(plan);
        }

        // examined: count the documents inside the index bounds
        const setExamined = (value: string) => {
            (examinedCard.querySelector('.rxdbv-stat-value') as HTMLElement).textContent = value;
        };
        if (queryPlan && queryPlan.selectorSatisfiedByIndex) {
            setExamined(formatInteger(returned));
        } else if (storageInstance && queryPlan) {
            countIndexBounds(storageInstance, queryPlan)
                .then(count => setExamined(count === null ? 'n/a' : formatInteger(count)))
                .catch(() => setExamined('n/a'));
        } else if (dumpMode) {
            ctx.source.count(collectionName).then(count => setExamined(count === null ? 'n/a' : formatInteger(count)));
        } else {
            setExamined('n/a');
        }

        resultHost.appendChild(el('div', 'rxdbv-section-label', 'FINDINGS'));
        let findings = 0;
        if (selectorHasRegex(selector)) {
            findings = findings + 1;
            resultHost.appendChild(el('div', 'rxdbv-finding rxdbv-danger-box', [
                el('div', 'rxdbv-finding-title', '✕ This query cannot use an index'),
                el('div', 'rxdbv-finding-body', [
                    el('code', '', '$regex'),
                    ' selectors always scan the whole collection. Prefer a prefix match on an indexed field.'
                ])
            ]));
        }
        if (unindexedFields.length > 0 && !selectorHasRegex(selector)) {
            findings = findings + 1;
            const suggested = JSON.stringify(queryPlan.index.filter((f: string) => selectorFields.has(f)).concat(unindexedFields));
            resultHost.appendChild(el('div', 'rxdbv-finding rxdbv-warning-box', [
                el('div', 'rxdbv-finding-title', '▲ ' + unindexedFields.join(', ') + ' is not covered by the used index'),
                el('div', 'rxdbv-finding-body', [
                    'Documents matching the index bounds are re-checked in memory. Add a compound index ',
                    el('code', '', suggested),
                    ' to the schema to make this query fully indexed.'
                ])
            ]));
        }
        if (findings === 0) {
            resultHost.appendChild(el('div', 'rxdbv-finding', [
                el('div', 'rxdbv-finding-body', dumpMode
                    ? 'Dump mode scans the loaded documents in memory, index analysis needs a live database.'
                    : 'No findings. The selector is fully covered by the used index.')
            ]));
        }
    });
}

async function countIndexBounds(storageInstance: any, queryPlan: any): Promise<number | null> {
    try {
        const boundsSelector: any = {};
        queryPlan.index.forEach((field: string, index: number) => {
            if (field === '_deleted') {
                return;
            }
            const start = queryPlan.startKeys[index];
            const end = queryPlan.endKeys[index];
            const condition: any = {};
            if (start === end && start !== INDEX_MIN && start !== INDEX_MAX) {
                boundsSelector[field] = { $eq: start };
                return;
            }
            if (start !== INDEX_MIN && typeof start !== 'undefined') {
                condition.$gte = start;
            }
            if (end !== INDEX_MAX && typeof end !== 'undefined') {
                condition.$lte = end;
            }
            if (Object.keys(condition).length > 0) {
                boundsSelector[field] = condition;
            }
        });
        const normalized = normalizeMangoQuery(storageInstance.schema, { selector: boundsSelector });
        const prepared = prepareQuery(storageInstance.schema, normalized as any);
        const result = await storageInstance.count(prepared);
        return typeof result.count === 'number' ? result.count : null;
    } catch (err) {
        return null;
    }
}

/**
 * Storage panel: engine, per-collection document counts,
 * tombstones and attachment bytes read from the storage
 * instances, plus the cleanup action.
 */
export function renderStoragePanel(ctx: ViewerContext) {
    const panel = el('div', 'rxdbv-panel-scroll');
    ctx.contentHost.appendChild(panel);
    panel.appendChild(panelToolbar('Storage'));

    const cards = el('div', 'rxdbv-stat-cards');
    const engineValue = el('span', '', ctx.source.storageName);
    cards.appendChild(statCard('ENGINE', engineValue as any));
    cards.appendChild(statCard('DATABASE', ctx.source.databaseName + ' · rxdb v' + RXDB_VERSION));
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
    const cleanupHost = el('div');
    panel.appendChild(cleanupHost);

    const collections = ctx.source.listCollections();
    Promise.all(collections.map(info => collectStorageRow(ctx, info.name))).then(rows => {
        if (ctx.destroyed) {
            return;
        }
        let totalDocs = 0;
        let totalTombstones = 0;
        let totalAttachmentBytes = 0;
        rows.forEach(row => {
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

        renderCleanupCard(ctx, cleanupHost, totalTombstones);
    });
}

type StorageRow = {
    name: string;
    documents: number | null;
    tombstones: number | null;
    attachmentBytes: number;
    attachmentCount: number;
};

async function collectStorageRow(ctx: ViewerContext, collectionName: string): Promise<StorageRow> {
    const documents = await ctx.source.count(collectionName);
    const row: StorageRow = {
        name: collectionName,
        documents,
        tombstones: null,
        attachmentBytes: 0,
        attachmentCount: 0
    };
    const database = ctx.source.rawDatabase;
    if (!database) {
        row.tombstones = 0;
        return row;
    }
    const collection = (database.collections as any)[collectionName] as RxCollection<any>;
    const storageInstance = (collection as any).storageInstance;
    try {
        const normalized = normalizeMangoQuery(storageInstance.schema, {
            selector: { _deleted: { $eq: true } } as any
        });
        const prepared = prepareQuery(storageInstance.schema, normalized as any);
        const countResult = await storageInstance.count(prepared);
        row.tombstones = typeof countResult.count === 'number' ? countResult.count : null;
    } catch (err) {
        row.tombstones = null;
    }
    if (collection.schema.jsonSchema.attachments) {
        try {
            const normalized = normalizeMangoQuery(storageInstance.schema, { selector: {} });
            (normalized as any).limit = STORAGE_SCAN_LIMIT;
            const prepared = prepareQuery(storageInstance.schema, normalized as any);
            const queryResult = await storageInstance.query(prepared);
            queryResult.documents.forEach((doc: any) => {
                Object.values(doc._attachments || {}).forEach((attachment: any) => {
                    row.attachmentBytes = row.attachmentBytes + (attachment.length || 0);
                    row.attachmentCount = row.attachmentCount + 1;
                });
            });
        } catch (err) {
            // attachment sizes stay at 0 when the storage cannot be scanned
        }
    }
    return row;
}

function renderCleanupCard(ctx: ViewerContext, host: HTMLElement, totalTombstones: number) {
    clearChildren(host);
    const database = ctx.source.rawDatabase;
    if (!database) {
        return;
    }
    const collections = Object.entries(database.collections)
        .filter(([name]) => !name.startsWith('_'));
    const cleanupSupported = collections.some(([, collection]) => typeof (collection as any).cleanup === 'function');
    const card = el('div', 'rxdbv-cleanup-card', [
        el('div', '', 'Cleanup', { style: 'font-weight:700;font-size:12px' }),
        el('div', 'rxdbv-muted', 'Purges tombstones of deleted documents. Peers whose replication checkpoint predates the cleanup must re-sync from scratch.', {
            style: 'font-size:11.5px;margin-top:4px;line-height:1.55'
        })
    ]);
    if (cleanupSupported) {
        card.appendChild(el('button', 'rxdbv-btn-danger-outline', 'Run cleanup — purge ' + formatInteger(totalTombstones) + ' tombstones', {
            style: 'margin-top:10px',
            onClick: () => {
                /**
                 * Without the cleanup plugin the method stub throws
                 * synchronously, so the try/catch is needed in
                 * addition to the promise catch.
                 */
                try {
                    Promise.all(
                        collections.map(([, collection]) =>
                            typeof (collection as any).cleanup === 'function'
                                ? (collection as any).cleanup(0)
                                : Promise.resolve()
                        )
                    ).then(() => ctx.renderContent()).catch(err => showViewerError(ctx.root, 'Cleanup failed', err));
                } catch (err) {
                    showViewerError(ctx.root, 'Cleanup failed', err);
                }
            }
        }));
    } else {
        card.appendChild(el('div', 'rxdbv-dim', 'Add the cleanup plugin (RxDBCleanupPlugin) to run a cleanup from here.', {
            style: 'margin-top:10px;font-size:11px'
        }));
    }
    host.appendChild(card);
}
