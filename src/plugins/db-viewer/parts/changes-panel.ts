import { button, clear, el, gridHead, gridRow, spacer } from '../dom.ts';
import { diffJson, formatClock, formatNumber, renderDiff, shortRevision } from '../format.ts';
import { DB_VIEWER_COLORS } from '../theme.ts';
import type { PanelContext } from './context.ts';
import type { DbViewerChangeRecord } from '../../../types/index.d.ts';

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
export class ChangesPanel {
    public readonly element: HTMLElement = el('div', { class: 'rxdbv-main' });

    constructor(private readonly context: PanelContext) { }

    public destroy(): void { }

    private get filtered(): DbViewerChangeRecord[] {
        const store = this.context.store;
        const filter = store.changesFilter.trim().toLowerCase();
        if (filter === '') {
            return store.changes;
        }
        return store.changes.filter(record =>
            record.collectionName.toLowerCase().includes(filter) ||
            record.documentId.toLowerCase().includes(filter)
        );
    }

    public render(): HTMLElement {
        clear(this.element);
        const store = this.context.store;
        this.element.appendChild(this.renderToolbar());

        const split = el('div', { style: { flex: '1', display: 'flex', minHeight: '0' } });
        const list = el('div', {
            class: 'rxdbv-scroll',
            style: { borderRight: '1px solid rgba(255,255,255,0.10)' }
        });
        list.appendChild(gridHead(COLUMNS, ['time', 'op', 'collection', 'id', 'rev']));

        const records = this.filtered;
        if (records.length === 0) {
            list.appendChild(el('div', {
                class: 'rxdbv-dim',
                style: { padding: '8px 12px', fontSize: '11px' },
                text: store.changes.length === 0
                    ? 'No writes yet. This list fills as the app writes documents.'
                    : 'No change matches the filter.'
            }));
        }
        records.forEach((record, index) => {
            list.appendChild(gridRow(COLUMNS, [
                el('span', { class: 'rxdbv-mono rxdbv-dim', text: formatClock(record.time) }),
                el('span', {
                    class: 'rxdbv-mono',
                    style: { color: OPERATION_COLORS[record.operation], fontWeight: '700' },
                    text: record.operation
                }),
                el('span', { class: 'rxdbv-mono', text: record.collectionName }),
                el('span', { class: 'rxdbv-mono rxdbv-muted', text: record.documentId }),
                el('span', {
                    class: 'rxdbv-mono rxdbv-dim',
                    text: record.previousRevision
                        ? shortRevision(record.previousRevision) + ' → ' + shortRevision(record.revision)
                        : shortRevision(record.revision)
                })
            ], {
                class: 'rxdbv-tr' + (index === store.selectedChangeIndex ? ' rxdbv-selected' : ''),
                onClick: () => {
                    store.selectedChangeIndex = index;
                    this.context.render();
                }
            }));
        });
        split.appendChild(list);

        const selected = records[store.selectedChangeIndex];
        if (selected) {
            split.appendChild(this.renderDetail(selected));
        }
        this.element.appendChild(split);
        return this.element;
    }

    private renderToolbar(): HTMLElement {
        const store = this.context.store;
        return el('div', { class: 'rxdbv-toolbar' }, [
            el('span', { class: 'rxdbv-panel-title', text: 'Changes' }),
            el('span', {
                class: 'rxdbv-dot',
                style: { background: store.changesPaused ? DB_VIEWER_COLORS.fgDim : DB_VIEWER_COLORS.success }
            }),
            el('span', {
                class: 'rxdbv-dim',
                style: { fontSize: '10px' },
                text: (store.changesPaused ? 'paused' : 'recording') + ' · ' +
                    formatNumber(store.sessionWriteCount) + ' writes this session'
            }),
            el('div', { class: 'rxdbv-query-input-wrap', style: { flex: '0 0 220px' } }, [
                el('input', {
                    class: 'rxdbv-query-input',
                    value: store.changesFilter,
                    placeholder: 'filter: collection or id…',
                    onInput: (event: Event) => {
                        store.changesFilter = (event.target as HTMLInputElement).value;
                        store.selectedChangeIndex = 0;
                        this.context.render();
                    }
                })
            ]),
            spacer(),
            button(store.changesPaused ? 'Resume' : 'Pause', () => {
                store.changesPaused = !store.changesPaused;
                this.context.render();
            }, { small: true }),
            button('Clear', () => {
                store.changes = [];
                store.selectedChangeIndex = 0;
                this.context.render();
            }, { small: true })
        ]);
    }

    private renderDetail(record: DbViewerChangeRecord): HTMLElement {
        const lines = diffJson(
            record.previousDocumentData,
            record.operation === 'DELETE' ? undefined : record.documentData
        );
        return el('div', { class: 'rxdbv-detail' }, [
            el('div', {
                style: {
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    fontSize: '11px'
                }
            }, [
                el('span', {
                    class: 'rxdbv-mono',
                    style: { color: OPERATION_COLORS[record.operation], fontWeight: '700' },
                    text: record.operation
                }),
                el('span', { class: 'rxdbv-mono', text: record.collectionName + ' / ' + record.documentId }),
                el('span', {
                    class: 'rxdbv-mono rxdbv-dim',
                    text: record.previousRevision
                        ? shortRevision(record.previousRevision) + ' → ' + shortRevision(record.revision)
                        : shortRevision(record.revision)
                }),
                spacer(),
                el('a', {
                    style: { fontSize: '10px' },
                    text: 'open document',
                    onClick: () => {
                        const view = this.context.store.getView(record.collectionName);
                        view.openDocumentId = record.documentId;
                        this.context.navigate({ kind: 'collection', name: record.collectionName });
                    }
                })
            ]),
            renderDiff(lines),
            el('div', {
                class: 'rxdbv-dim',
                style: { padding: '0 12px 12px', fontSize: '10px' },
                text: 'source: ' + (record.source === 'db-viewer' ? 'written by this viewer' : 'local write') +
                    ' · ' + formatClock(record.time)
            })
        ]);
    }
}
