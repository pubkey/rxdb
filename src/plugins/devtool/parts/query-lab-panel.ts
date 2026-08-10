import { clear, el, primaryButton, spacer } from '../dom.ts';
import { formatNumber, parseSelector } from '../format.ts';
import { INDEX_MAX, INDEX_MIN, getQueryPlan } from '../../../query-planner.ts';
import { normalizeMangoQuery } from '../../../rx-query-helper.ts';
import { DEVTOOL_COLORS } from '../theme.ts';
import type { PanelContext } from './context.ts';
import type { MaybeReadonly } from '../../../types/index.d.ts';

type ExplainResult = {
    index: string[];
    bounds: string;
    selectorSatisfiedByIndex: boolean;
    sortSatisfiedByIndex: boolean;
    examined: number;
    returned: number;
    elapsedMs: number;
    usesRegex: boolean;
    uncoveredFields: string[];
    descendingSort: boolean;
    suggestedIndex: string[];
    suggestedIndexExists: boolean;
};

/**
 * Runs the current selector and explains what the storage had to do:
 * which index was used, how many documents it examined and what it discarded.
 */
export class QueryLabPanel {
    public readonly element: HTMLElement = el('div', { class: 'rxdt-main rxdt-scroll' });

    private result: ExplainResult | null = null;
    private error: string | null = null;
    private running = false;

    constructor(private readonly context: PanelContext) { }

    public destroy(): void { }

    private get collectionName(): string {
        const store = this.context.store;
        if (store.navigation.kind === 'collection' || store.navigation.kind === 'replication') {
            return store.navigation.name;
        }
        return store.lastCollectionName ?? store.collectionNames[0] ?? '';
    }

    public render(): HTMLElement {
        clear(this.element);
        const collectionName = this.collectionName;
        if (!collectionName) {
            this.element.appendChild(el('div', { class: 'rxdt-center', text: 'No collections to query.' }));
            return this.element;
        }
        const view = this.context.store.getView(collectionName);
        const input = el('input', {
            class: 'rxdt-query-input',
            value: view.queryInput,
            spellcheck: 'false',
            onInput: (event: Event) => {
                view.queryInput = (event.target as HTMLInputElement).value;
            },
            onKeyDown: (event: KeyboardEvent) => {
                if (event.key === 'Enter') {
                    this.explain();
                }
            }
        });
        this.element.appendChild(el('div', { class: 'rxdt-toolbar' }, [
            el('span', { class: 'rxdt-panel-title', text: 'Query lab' }),
            el('span', { class: 'rxdt-mono rxdt-muted', style: { fontSize: '11px' }, text: collectionName }),
            el('div', { class: 'rxdt-query-input-wrap' }, [
                el('span', { class: 'rxdt-dim', text: 'find' }),
                input
            ]),
            el('button', {
                class: 'rxdt-btn',
                style: { borderColor: DEVTOOL_COLORS.pink, background: 'rgba(237,22,143,0.12)' },
                text: 'Explain',
                onClick: () => this.explain()
            }),
            primaryButton('Run', () => {
                this.context.navigate({ kind: 'collection', name: collectionName });
            })
        ]));

        if (this.error) {
            this.element.appendChild(el('div', {
                class: 'rxdt-callout rxdt-callout-error'
            }, [
                el('div', { class: 'rxdt-callout-title', style: { color: DEVTOOL_COLORS.danger }, text: '✕ The query could not run' }),
                el('div', { class: 'rxdt-callout-body', text: this.error })
            ]));
            return this.element;
        }
        if (!this.result) {
            this.element.appendChild(el('div', {
                class: 'rxdt-dim',
                style: { padding: '14px 12px' },
                text: this.running ? 'running…' : 'Press Explain to analyse the selector above.'
            }));
            return this.element;
        }
        this.element.appendChild(this.renderCards(this.result));
        this.element.appendChild(this.renderPlan(this.result));
        this.element.appendChild(this.renderFindings(this.result));
        return this.element;
    }

    private renderCards(result: ExplainResult): HTMLElement {
        const card = (label: string, value: string, color?: string) => el('div', { class: 'rxdt-card' }, [
            el('div', { class: 'rxdt-section-label', text: label }),
            el('div', { class: 'rxdt-card-value', style: color ? { color } : {}, text: value })
        ]);
        return el('div', { class: 'rxdt-cards' }, [
            card('INDEX USED', JSON.stringify(result.index)),
            card('EXAMINED', formatNumber(result.examined), DEVTOOL_COLORS.warning),
            card('RETURNED', formatNumber(result.returned), DEVTOOL_COLORS.success),
            card('ELAPSED', (Math.round(result.elapsedMs * 10) / 10) + ' ms')
        ]);
    }

    private renderPlan(result: ExplainResult): HTMLElement {
        const discarded = Math.max(0, result.examined - result.returned);
        const steps: [string, string, string][] = [
            [
                '1',
                'index scan on ' + JSON.stringify(result.index) + ' — bounds: ' + result.bounds,
                formatNumber(result.examined) + ' candidates'
            ]
        ];
        if (result.selectorSatisfiedByIndex) {
            steps.push(['2', 'in-memory filter — skipped, the index covers the whole selector', '0 discarded']);
        } else {
            steps.push(['2', 'in-memory filter — the remaining selector fields', formatNumber(discarded) + ' discarded']);
        }
        steps.push([
            '3',
            result.sortSatisfiedByIndex ? 'sort — skipped, index order reused' : 'sort — re-sorted in memory',
            result.sortSatisfiedByIndex ? '0 ms' : formatNumber(result.returned) + ' rows'
        ]);

        const container = el('div');
        container.appendChild(el('div', {
            class: 'rxdt-section-label',
            style: { padding: '0 12px' },
            text: 'EXECUTION PLAN'
        }));
        const list = el('div', {
            class: 'rxdt-mono',
            style: { margin: '6px 12px', border: '1px solid rgba(255,255,255,0.10)', fontSize: '11px' }
        });
        steps.forEach(([number, description, count], index) => {
            list.appendChild(el('div', {
                style: {
                    display: 'flex',
                    gap: '12px',
                    padding: '6px 10px',
                    borderBottom: index === steps.length - 1 ? '' : '1px solid rgba(255,255,255,0.06)'
                }
            }, [
                el('span', { class: 'rxdt-dim', style: { width: '14px' }, text: number }),
                el('span', { class: 'rxdt-grow', text: description }),
                el('span', { class: 'rxdt-muted', text: count })
            ]));
        });
        container.appendChild(list);
        return container;
    }

    private renderFindings(result: ExplainResult): HTMLElement {
        const container = el('div');
        container.appendChild(el('div', {
            class: 'rxdt-section-label',
            style: { padding: '12px 12px 0' },
            text: 'FINDINGS'
        }));
        const discarded = Math.max(0, result.examined - result.returned);
        const discardShare = result.examined === 0 ? 0 : Math.round((discarded / result.examined) * 100);
        let found = false;

        if (result.usesRegex) {
            found = true;
            container.appendChild(el('div', { class: 'rxdt-callout rxdt-callout-error' }, [
                el('div', {
                    class: 'rxdt-callout-title',
                    style: { color: DEVTOOL_COLORS.danger },
                    text: '✕ This query cannot use an index'
                }),
                el('div', { class: 'rxdt-callout-body' }, [
                    document.createTextNode('$regex selectors always scan the whole collection (' +
                        formatNumber(result.examined) + ' documents examined). Prefer a prefix match on an indexed field.')
                ])
            ]));
        }
        if (result.uncoveredFields.length > 0 && discardShare >= 50) {
            found = true;
            container.appendChild(el('div', { class: 'rxdt-callout rxdt-callout-warning' }, [
                el('div', {
                    class: 'rxdt-callout-title',
                    style: { color: DEVTOOL_COLORS.warning },
                    text: '▲ ' + result.uncoveredFields.join(', ') + ' ' +
                        (result.uncoveredFields.length === 1 ? 'is' : 'are') + ' not covered by the used index'
                }),
                el('div', { class: 'rxdt-callout-body' }, [
                    document.createTextNode(discardShare + '% of examined documents were discarded after the index scan. '),
                    result.suggestedIndexExists
                        ? el('span', {}, [
                            document.createTextNode('The schema already declares '),
                            el('span', { class: 'rxdt-mono', style: { color: DEVTOOL_COLORS.fg }, text: JSON.stringify(result.suggestedIndex) }),
                            document.createTextNode(result.descendingSort
                                ? ', but the descending sort forced the planner to scan the sort index instead. Sort ascending on that index to use it.'
                                : ', but the planner picked the sort index instead. Sorting on a field of that index lets the planner use it.')
                        ])
                        : el('span', {}, [
                            document.createTextNode('Add the index '),
                            el('span', { class: 'rxdt-mono', style: { color: DEVTOOL_COLORS.fg }, text: JSON.stringify(result.suggestedIndex) }),
                            document.createTextNode(' to the schema to make this query fully indexed.')
                        ])
                ])
            ]));
        }
        if (!result.sortSatisfiedByIndex) {
            found = true;
            container.appendChild(el('div', { class: 'rxdt-callout rxdt-callout-warning' }, [
                el('div', {
                    class: 'rxdt-callout-title',
                    style: { color: DEVTOOL_COLORS.warning },
                    text: '▲ The results are re-sorted in memory'
                }),
                el('div', {
                    class: 'rxdt-callout-body',
                    text: result.descendingSort
                        ? 'The sort is descending, and most storages only store ascending indexes, so every matching document is loaded and re-sorted before the page is cut. Sorting ascending on an indexed field avoids that.'
                        : 'All matching documents are loaded and re-sorted in memory before the page is cut. An index that starts with the sort field avoids that.'
                })
            ]));
        }
        if (!found) {
            container.appendChild(el('div', {
                class: 'rxdt-dim',
                style: { padding: '6px 12px 16px' },
                text: 'Nothing to report, the index covers this query.'
            }));
        } else {
            container.appendChild(el('div', { style: { height: '16px' } }));
        }
        return container;
    }

    private async explain(): Promise<void> {
        const collectionName = this.collectionName;
        const collection = this.context.store.database.collections[collectionName];
        const view = this.context.store.getView(collectionName);
        const parsed = parseSelector(view.queryInput);
        this.error = null;
        if (!parsed.ok) {
            this.error = parsed.error.message;
            this.context.render();
            return;
        }
        this.running = true;
        this.context.render();
        try {
            const normalized = normalizeMangoQuery(
                collection.schema.jsonSchema,
                { selector: parsed.value, sort: [{ [view.sort.field]: view.sort.direction } as any] }
            );
            const plan = getQueryPlan(collection.schema.jsonSchema, normalized);
            const selectorFields = Object.keys(parsed.value).filter(field => !field.startsWith('$'));
            const uncoveredFields = selectorFields.filter(field => !plan.index.includes(field));
            const indexedSelector: any = {};
            selectorFields
                .filter(field => plan.index.includes(field))
                .forEach(field => {
                    indexedSelector[field] = parsed.value[field];
                });

            const descendingSort = normalized.sort.some(
                (sortPart: any) => Object.values(sortPart)[0] === 'desc'
            );
            const coveredSelectorFields = selectorFields.filter(field => plan.index.includes(field));
            const suggestedIndex = coveredSelectorFields.concat(uncoveredFields);
            const suggestedIndexExists = (collection.schema.indexes ?? [])
                .map(index => declaredIndexFields(index))
                .some(fields => suggestedIndex.every((field, position) => fields[position] === field));
            const startedAt = now();
            const documents = await collection.find({ selector: parsed.value }).exec();
            const elapsedMs = now() - startedAt;
            const examined = plan.selectorSatisfiedByIndex
                ? documents.length
                : await collection.count({ selector: indexedSelector }).exec();

            this.result = {
                index: plan.index,
                bounds: describeBounds(plan.index, plan.startKeys, plan.endKeys),
                selectorSatisfiedByIndex: plan.selectorSatisfiedByIndex,
                sortSatisfiedByIndex: plan.sortSatisfiedByIndex,
                examined: Math.max(examined, documents.length),
                returned: documents.length,
                elapsedMs,
                usesRegex: JSON.stringify(parsed.value).includes('"$regex"'),
                uncoveredFields,
                descendingSort,
                suggestedIndex,
                suggestedIndexExists
            };
        } catch (error) {
            this.error = (error as Error).message;
            this.result = null;
        }
        this.running = false;
        this.context.render();
    }
}

/**
 * The planner fills unbounded index fields with the min and max sentinels,
 * which are meaningless to read, so those are reported as a full range.
 */
function describeBounds(index: string[], startKeys: readonly any[], endKeys: readonly any[]): string {
    const described = index.map((field, position) => {
        const start = startKeys[position];
        const end = endKeys[position];
        if (isMinBound(start) && isMaxBound(end)) {
            return null;
        }
        if (start === end) {
            return field + ' = ' + JSON.stringify(start);
        }
        return field + ' from ' + (isMinBound(start) ? 'start' : JSON.stringify(start)) +
            ' to ' + (isMaxBound(end) ? 'end' : JSON.stringify(end));
    }).filter(part => part !== null);
    return described.length === 0 ? 'none, the whole index is scanned' : described.join(', ');
}

/**
 * RxDB prefixes every declared index with `_deleted` and appends the
 * primary key, so those are stripped before comparing with what a
 * developer would actually write into the schema.
 */
function declaredIndexFields(index: MaybeReadonly<string[]> | string): string[] {
    const fields = (Array.isArray(index) ? index.slice(0) : [index]) as string[];
    return fields[0] === '_deleted' ? fields.slice(1) : fields;
}

function isMinBound(key: any): boolean {
    return key === INDEX_MIN || key === '' || key === undefined;
}

function isMaxBound(key: any): boolean {
    return key === INDEX_MAX || key === Number.MAX_SAFE_INTEGER || key === undefined;
}

function now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
