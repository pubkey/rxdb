import type { RxCollection, RxDocumentData } from '../../../types/index.d.ts';
import { clear, el, gridHead, gridRow, spacer } from '../dom.ts';
import { formatNumber, valueType } from '../format.ts';
import { DEVTOOL_COLORS } from '../theme.ts';
import type { PanelContext } from './context.ts';

const SAMPLE_SIZE = 1000;

const TYPE_COLORS: { [type: string]: string; } = {
    string: DEVTOOL_COLORS.info,
    number: DEVTOOL_COLORS.warning,
    integer: DEVTOOL_COLORS.warning,
    boolean: DEVTOOL_COLORS.success,
    array: DEVTOOL_COLORS.pinkDeep,
    object: DEVTOOL_COLORS.purple,
    null: DEVTOOL_COLORS.neutralBar,
    missing: DEVTOOL_COLORS.neutralBar
};

type FieldStats = {
    name: string;
    declaredType: string | undefined;
    typeCounts: Map<string, number>;
    present: number;
    distinct: Set<string>;
    totalStringLength: number;
    stringCount: number;
    min: number;
    max: number;
    booleanTrue: number;
};

type SchemaViolation = {
    documentId: string;
    message: string;
};

const COLUMNS = '130px 260px 90px 1fr';

/**
 * Reports what the documents actually contain, next to what the
 * schema declares, and lists the documents that disagree with it.
 */
export class SchemaPanel {
    public readonly element: HTMLElement = el('div', { class: 'rxdt-main rxdt-scroll' });

    private fields: FieldStats[] = [];
    private violations: SchemaViolation[] = [];
    private sampled = 0;
    private loading = true;
    private analyzedCollection = '';

    constructor(private readonly context: PanelContext) { }

    public destroy(): void { }

    private get collectionName(): string {
        const navigation = this.context.store.navigation;
        if (navigation.kind === 'collection' || navigation.kind === 'replication') {
            return navigation.name;
        }
        return this.context.store.collectionNames[0] ?? '';
    }

    public render(): HTMLElement {
        clear(this.element);
        const collectionName = this.collectionName;
        if (!collectionName) {
            this.element.appendChild(el('div', {
                class: 'rxdt-center',
                text: 'No collections to analyse.'
            }));
            return this.element;
        }
        if (this.analyzedCollection !== collectionName) {
            this.analyzedCollection = collectionName;
            this.loading = true;
            this.analyse(collectionName);
        }
        const collection = this.context.store.database.collections[collectionName];
        this.element.appendChild(this.renderHeader(collection));
        this.element.appendChild(gridHead(COLUMNS, ['field', 'types', 'presence', 'values']));
        if (this.loading) {
            this.element.appendChild(el('div', {
                class: 'rxdt-dim',
                style: { padding: '8px 12px' },
                text: 'sampling documents…'
            }));
            return this.element;
        }
        this.fields.forEach(field => {
            this.element.appendChild(this.renderFieldRow(field));
        });
        this.element.appendChild(this.renderViolations(collectionName));
        return this.element;
    }

    private renderHeader(collection: RxCollection): HTMLElement {
        const legend = ['string', 'number', 'boolean', 'array', 'object', 'missing'];
        return el('div', { class: 'rxdt-toolbar' }, [
            el('span', { class: 'rxdt-panel-title', text: 'Schema' }),
            el('span', {
                class: 'rxdt-mono rxdt-muted',
                style: { fontSize: '11px' },
                text: collection.name + ' · declared v' + collection.schema.version +
                    ' · sampled ' + formatNumber(this.sampled) + ' documents'
            }),
            spacer(),
            el('span', { class: 'rxdt-dim', style: { fontSize: '10px' } }, legend.flatMap((type, index) => [
                document.createTextNode((index === 0 ? '' : ' · ') + type + ' '),
                el('span', { class: 'rxdt-swatch', style: { background: TYPE_COLORS[type] } })
            ]))
        ]);
    }

    private renderFieldRow(field: FieldStats): HTMLElement {
        const bar = el('div', { class: 'rxdt-typebar' });
        const missing = this.sampled - field.present;
        const shares: [string, number][] = Array.from(field.typeCounts.entries());
        if (missing > 0) {
            shares.push(['missing', missing]);
        }
        shares.forEach(([type, count]) => {
            bar.appendChild(el('div', {
                style: {
                    width: ((count / Math.max(1, this.sampled)) * 100) + '%',
                    background: TYPE_COLORS[type] ?? DEVTOOL_COLORS.neutralBar
                },
                title: type + ': ' + formatNumber(count)
            }));
        });
        const presence = this.sampled === 0 ? 0 : Math.round((field.present / this.sampled) * 100);
        return gridRow(COLUMNS, [
            el('span', { class: 'rxdt-mono', text: field.name }),
            bar,
            el('span', {
                class: 'rxdt-mono',
                style: { color: presence === 100 ? DEVTOOL_COLORS.success : DEVTOOL_COLORS.warning },
                text: presence + '%'
            }),
            el('span', {
                class: 'rxdt-mono rxdt-muted',
                style: { fontSize: '10.5px' },
                text: describeValues(field)
            })
        ], { class: 'rxdt-tr rxdt-static' });
    }

    private renderViolations(collectionName: string): HTMLElement {
        const container = el('div');
        container.appendChild(el('div', {
            style: { margin: '16px 12px 4px', display: 'flex', alignItems: 'center', gap: '8px' }
        }, [
            el('span', { style: { fontWeight: '700', fontSize: '12px' }, text: 'Schema violations' }),
            this.violations.length > 0
                ? el('span', {
                    style: {
                        fontSize: '10px',
                        background: 'rgba(253,54,110,0.15)',
                        color: DEVTOOL_COLORS.danger,
                        border: '1px solid rgba(253,54,110,0.4)',
                        padding: '1px 7px'
                    },
                    text: formatNumber(this.violations.length) + ' documents'
                })
                : el('span', { class: 'rxdt-dim', style: { fontSize: '10px' }, text: 'none in the sample' })
        ]));
        this.violations.forEach(violation => {
            container.appendChild(el('div', {
                style: {
                    display: 'flex',
                    gap: '12px',
                    margin: '0 12px',
                    padding: '5px 10px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '11px',
                    alignItems: 'center'
                }
            }, [
                el('span', { style: { color: DEVTOOL_COLORS.danger }, text: '▲' }),
                el('span', { class: 'rxdt-mono rxdt-muted', style: { width: '70px' }, text: violation.documentId }),
                el('span', { class: 'rxdt-mono rxdt-grow', text: violation.message }),
                el('a', {
                    style: { fontSize: '10px' },
                    text: 'open',
                    onClick: () => {
                        const view = this.context.store.getView(collectionName);
                        view.openDocumentId = violation.documentId;
                        view.queryInput = '{}';
                        view.selector = {};
                        this.context.navigate({ kind: 'collection', name: collectionName });
                    }
                })
            ]));
        });
        return container;
    }

    private async analyse(collectionName: string): Promise<void> {
        const collection = this.context.store.database.collections[collectionName];
        if (!collection) {
            return;
        }
        const documents = await collection.find({ selector: {}, limit: SAMPLE_SIZE }).exec();
        if (this.analyzedCollection !== collectionName) {
            return;
        }
        const rows = documents.map(document => document.toJSON(true) as RxDocumentData<any>);
        const properties: any = collection.schema.jsonSchema.properties ?? {};
        const primaryPath = collection.schema.primaryPath as string;
        const statsByName = new Map<string, FieldStats>();
        const violations: SchemaViolation[] = [];

        const ensure = (name: string): FieldStats => {
            let stats = statsByName.get(name);
            if (!stats) {
                stats = {
                    name,
                    declaredType: properties[name] ? normalizeDeclaredType(properties[name].type) : undefined,
                    typeCounts: new Map(),
                    present: 0,
                    distinct: new Set(),
                    totalStringLength: 0,
                    stringCount: 0,
                    min: Number.POSITIVE_INFINITY,
                    max: Number.NEGATIVE_INFINITY,
                    booleanTrue: 0
                };
                statsByName.set(name, stats);
            }
            return stats;
        };
        Object.keys(properties)
            .filter(name => !name.startsWith('_'))
            .forEach(ensure);

        rows.forEach(row => {
            Object.keys(row)
                .filter(name => !name.startsWith('_'))
                .forEach(name => {
                    const stats = ensure(name);
                    const value = (row as any)[name];
                    const type = valueType(value);
                    stats.present++;
                    stats.typeCounts.set(type, (stats.typeCounts.get(type) ?? 0) + 1);
                    if (stats.distinct.size < 5000) {
                        stats.distinct.add(JSON.stringify(value));
                    }
                    if (type === 'string') {
                        stats.stringCount++;
                        stats.totalStringLength += (value as string).length;
                    } else if (type === 'number') {
                        stats.min = Math.min(stats.min, value as number);
                        stats.max = Math.max(stats.max, value as number);
                    } else if (type === 'boolean' && value === true) {
                        stats.booleanTrue++;
                    }
                    if (stats.declaredType && stats.declaredType !== type && type !== 'missing') {
                        if (!(stats.declaredType === 'number' && type === 'number')) {
                            violations.push({
                                documentId: String((row as any)[primaryPath]),
                                message: name + ': expected ' + stats.declaredType + ', got ' +
                                    type + ' ' + JSON.stringify(value)
                            });
                        }
                    }
                });
        });

        this.sampled = rows.length;
        this.fields = Array.from(statsByName.values());
        this.violations = violations.slice(0, 50);
        this.loading = false;
        this.context.render();
    }
}

function normalizeDeclaredType(declared: string | string[] | undefined): string | undefined {
    if (Array.isArray(declared)) {
        return declared[0] === 'null' ? declared[1] : declared[0];
    }
    if (declared === 'integer') {
        return 'number';
    }
    return declared;
}

function describeValues(field: FieldStats): string {
    const parts: string[] = [];
    if (field.present > 0) {
        parts.push(formatNumber(field.distinct.size) + ' distinct');
        if (field.distinct.size === field.present) {
            parts.push('unique');
        }
    }
    if (field.stringCount > 0) {
        parts.push('avg length ' + Math.round(field.totalStringLength / field.stringCount));
    }
    if (field.min !== Number.POSITIVE_INFINITY) {
        parts.push('min ' + field.min + ' · max ' + field.max);
    }
    const booleanCount = field.typeCounts.get('boolean') ?? 0;
    if (booleanCount > 0) {
        parts.push('true ' + formatNumber(field.booleanTrue) +
            ' · false ' + formatNumber(booleanCount - field.booleanTrue));
    }
    return parts.join(' · ') || 'no values in the sample';
}
