import { button, clear, el, gridHead, gridRow, spacer } from '../dom.ts';
import { diffJson, formatClock, formatNumber, renderDiff, shortRevision } from '../format.ts';
import { DEVTOOL_COLORS } from '../theme.ts';
import type { PanelContext } from './context.ts';
import type { DevtoolChangeRecord } from '../../../types/index.d.ts';

const COLUMNS = '100px 70px 80px 80px 1fr';

const OPERATION_COLORS: { [operation: string]: string; } = {
    INSERT: DEVTOOL_COLORS.success,
    UPDATE: DEVTOOL_COLORS.warning,
    DELETE: DEVTOOL_COLORS.danger
};

/**
 * A network-tab style list of every write in this session,
 * with the unified diff of the selected change next to it.
 */
export class ChangesPanel {
    public readonly element: HTMLElement = el('div', { class: 'rxdt-main' });

    constructor(private readonly context: PanelContext) { }

    public destroy(): void { }

    private get filtered(): DevtoolChangeRecord[] {
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
            class: 'rxdt-scroll',
            style: { borderRight: '1px solid rgba(255,255,255,0.10)' }
        });
        list.appendChild(gridHead(COLUMNS, ['time', 'op', 'collection', 'id', 'rev']));

        const records = this.filtered;
        if (records.length === 0) {
            list.appendChild(el('div', {
                class: 'rxdt-dim',
                style: { padding: '8px 12px', fontSize: '11px' },
                text: store.changes.length === 0
                    ? 'No writes yet. This list fills as the app writes documents.'
                    : 'No change matches the filter.'
            }));
        }
        records.forEach((record, index) => {
            list.appendChild(gridRow(COLUMNS, [
                el('span', { class: 'rxdt-mono rxdt-dim', text: formatClock(record.time) }),
                el('span', {
                    class: 'rxdt-mono',
                    style: { color: OPERATION_COLORS[record.operation], fontWeight: '700' },
                    text: record.operation
                }),
                el('span', { class: 'rxdt-mono', text: record.collectionName }),
                el('span', { class: 'rxdt-mono rxdt-muted', text: record.documentId }),
                el('span', {
                    class: 'rxdt-mono rxdt-dim',
                    text: record.previousRevision
                        ? shortRevision(record.previousRevision) + ' → ' + shortRevision(record.revision)
                        : shortRevision(record.revision)
                })
            ], {
                class: 'rxdt-tr' + (index === store.selectedChangeIndex ? ' rxdt-selected' : ''),
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
        return el('div', { class: 'rxdt-toolbar' }, [
            el('span', { class: 'rxdt-panel-title', text: 'Changes' }),
            el('span', {
                class: 'rxdt-dot',
                style: { background: store.changesPaused ? DEVTOOL_COLORS.fgDim : DEVTOOL_COLORS.success }
            }),
            el('span', {
                class: 'rxdt-dim',
                style: { fontSize: '10px' },
                text: (store.changesPaused ? 'paused' : 'recording') + ' · ' +
                    formatNumber(store.sessionWriteCount) + ' writes this session'
            }),
            el('div', { class: 'rxdt-query-input-wrap', style: { flex: '0 0 220px' } }, [
                el('input', {
                    class: 'rxdt-query-input',
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

    private renderDetail(record: DevtoolChangeRecord): HTMLElement {
        const lines = diffJson(
            record.previousDocumentData,
            record.operation === 'DELETE' ? undefined : record.documentData
        );
        return el('div', { class: 'rxdt-detail' }, [
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
                    class: 'rxdt-mono',
                    style: { color: OPERATION_COLORS[record.operation], fontWeight: '700' },
                    text: record.operation
                }),
                el('span', { class: 'rxdt-mono', text: record.collectionName + ' / ' + record.documentId }),
                el('span', {
                    class: 'rxdt-mono rxdt-dim',
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
                class: 'rxdt-dim',
                style: { padding: '0 12px 12px', fontSize: '10px' },
                text: 'source: ' + (record.source === 'devtool' ? 'written by this devtool' : 'local write') +
                    ' · ' + formatClock(record.time)
            })
        ]);
    }
}
