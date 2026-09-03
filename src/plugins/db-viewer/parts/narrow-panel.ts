import type { RxDocumentData } from '../../../types/index.d.ts';
import { clear, el, spacer } from '../dom.ts';
import { formatAge, formatNumber, previewValue, shortRevision, valueType } from '../format.ts';
import { DB_VIEWER_COLORS } from '../theme.ts';
import { replicationGlyph } from './rail.ts';
import type { PanelContext } from './context.ts';

type NarrowScreen =
    | { kind: 'collections'; }
    | { kind: 'documents'; collectionName: string; }
    | { kind: 'document'; collectionName: string; documentId: string; };

/**
 * Below 640px the rail and the tool panels do not fit, so the database viewer
 * becomes three stacked read-only screens with back navigation.
 * Every touch row is at least 44px tall.
 */
export class NarrowPanel {
    public readonly element: HTMLElement = el('div', { class: 'rxdbv rxdbv-narrow' });

    private screen: NarrowScreen = { kind: 'collections' };
    private documents: RxDocumentData<any>[] = [];
    private matchCount = 0;
    private page = 0;

    constructor(private readonly context: PanelContext) { }

    public destroy(): void { }

    public render(): HTMLElement {
        clear(this.element);
        if (this.screen.kind === 'collections') {
            this.renderCollections();
        } else if (this.screen.kind === 'documents') {
            this.renderDocuments(this.screen.collectionName);
        } else {
            this.renderDocument(this.screen.collectionName, this.screen.documentId);
        }
        return this.element;
    }

    private renderCollections(): void {
        const store = this.context.store;
        this.element.appendChild(el('div', { class: 'rxdbv-narrow-header' }, [
            el('div', { class: 'rxdbv-logo' }),
            el('span', { class: 'rxdbv-wordmark', text: 'RxDB' }),
            el('span', {
                class: 'rxdbv-mono rxdbv-muted',
                style: { fontSize: '11px' },
                text: store.database.name + ' / ' + store.database.storage.name
            }),
            spacer(),
            el('span', {
                class: 'rxdbv-muted',
                style: { fontSize: '12px', cursor: 'pointer' },
                text: 'Refresh',
                onClick: () => this.context.render()
            })
        ]));

        this.element.appendChild(el('div', { class: 'rxdbv-narrow-head', text: 'COLLECTIONS' }));
        const scroll = el('div', { class: 'rxdbv-scroll' });
        store.collectionNames.forEach(collectionName => {
            scroll.appendChild(el('div', {
                class: 'rxdbv-narrow-row',
                onClick: () => {
                    this.screen = { kind: 'documents', collectionName };
                    this.page = 0;
                    this.loadDocuments(collectionName);
                }
            }, [
                el('span', { class: 'rxdbv-mono rxdbv-grow', text: collectionName }),
                el('span', {
                    class: 'rxdbv-mono rxdbv-dim',
                    style: { fontSize: '12px' },
                    text: formatNumber(store.getMetrics(collectionName).documentCount)
                }),
                el('span', { class: 'rxdbv-dim', text: '›' })
            ]));
        });

        const replicated = store.collectionNames
            .filter(name => store.getReplicationStates(name).length > 0);
        if (replicated.length > 0) {
            scroll.appendChild(el('div', { class: 'rxdbv-narrow-head', text: 'REPLICATION' }));
            replicated.forEach(collectionName => {
                const glyph = replicationGlyph(store, collectionName);
                scroll.appendChild(el('div', {
                    class: 'rxdbv-narrow-row',
                    style: { cursor: 'default', minHeight: '0', padding: '10px 14px' }
                }, [
                    el('span', { class: 'rxdbv-mono rxdbv-grow', text: collectionName }),
                    el('span', {
                        style: { color: glyph.color, fontSize: '11px' },
                        text: glyph.glyph + ' ' + glyph.state
                    })
                ]));
            });
        }
        this.element.appendChild(scroll);
        this.element.appendChild(el('div', {
            class: 'rxdbv-dim',
            style: { padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '11px' },
            text: 'Tools (Schema, Changes, Query lab, Storage) are desktop-only. Reading data works here.'
        }));
    }

    private renderDocuments(collectionName: string): void {
        const store = this.context.store;
        const view = store.getView(collectionName);
        const collection = store.database.collections[collectionName];
        const primaryPath = collection.schema.primaryPath as string;
        const titleField = Object.keys(collection.schema.jsonSchema.properties ?? {})
            .find(name => name !== primaryPath && !name.startsWith('_')) ?? primaryPath;

        this.element.appendChild(el('div', { class: 'rxdbv-narrow-header' }, [
            el('span', {
                class: 'rxdbv-back',
                text: '‹',
                onClick: () => {
                    this.screen = { kind: 'collections' };
                    this.context.render();
                }
            }),
            el('span', { class: 'rxdbv-mono', style: { fontWeight: '700' }, text: collectionName }),
            el('span', {
                class: 'rxdbv-mono rxdbv-dim',
                style: { fontSize: '11px' },
                text: formatNumber(this.matchCount)
            })
        ]));
        this.element.appendChild(el('div', {
            style: { padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }
        }, [
            el('div', {
                class: 'rxdbv-mono',
                style: {
                    display: 'flex',
                    gap: '8px',
                    background: DB_VIEWER_COLORS.bg,
                    border: '1px solid rgba(255,255,255,0.14)',
                    padding: '8px 10px',
                    fontSize: '12px'
                }
            }, [
                el('span', { class: 'rxdbv-dim', text: 'find' }),
                el('span', { text: view.queryInput })
            ])
        ]));

        const scroll = el('div', { class: 'rxdbv-scroll' });
        this.documents.forEach(documentData => {
            const documentId = String((documentData as any)[primaryPath]);
            const doneValue = (documentData as any)[titleField];
            scroll.appendChild(el('div', {
                class: 'rxdbv-narrow-row',
                style: { padding: '10px 14px' },
                onClick: () => {
                    this.screen = { kind: 'document', collectionName, documentId };
                    this.context.render();
                }
            }, [
                el('div', { class: 'rxdbv-grow', style: { minWidth: '0' } }, [
                    el('div', {
                        style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                        text: previewValue(doneValue) || documentId
                    }),
                    el('div', {
                        class: 'rxdbv-mono rxdbv-dim',
                        style: { fontSize: '10px' },
                        text: documentId + ' · ' + shortRevision((documentData as any)._rev) + ' · ' +
                            formatAge((documentData as any)._meta?.lwt ?? Date.now())
                    })
                ]),
                el('span', { class: 'rxdbv-dim', text: '›' })
            ]));
        });
        this.element.appendChild(scroll);

        const store_ = store;
        const lastPage = Math.max(0, Math.ceil(this.matchCount / store_.pageSize) - 1);
        this.element.appendChild(el('div', {
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                fontSize: '12px',
                color: DB_VIEWER_COLORS.fgMuted
            }
        }, [
            el('span', {
                text: formatNumber(this.matchCount === 0 ? 0 : this.page * store_.pageSize + 1) + '–' +
                    formatNumber(Math.min(this.matchCount, (this.page + 1) * store_.pageSize)) +
                    ' of ' + formatNumber(this.matchCount)
            }),
            spacer(),
            el('button', {
                class: 'rxdbv-pager',
                style: { padding: '6px 14px', fontSize: '12px' },
                text: '‹',
                disabled: this.page === 0,
                onClick: () => {
                    this.page--;
                    this.loadDocuments(collectionName);
                }
            }),
            el('button', {
                class: 'rxdbv-pager',
                style: { padding: '6px 14px', fontSize: '12px' },
                text: '›',
                disabled: this.page >= lastPage,
                onClick: () => {
                    this.page++;
                    this.loadDocuments(collectionName);
                }
            })
        ]));
    }

    private renderDocument(collectionName: string, documentId: string): void {
        const collection = this.context.store.database.collections[collectionName];
        const primaryPath = collection.schema.primaryPath as string;
        const documentData = this.documents.find(
            candidate => String((candidate as any)[primaryPath]) === documentId
        );

        this.element.appendChild(el('div', { class: 'rxdbv-narrow-header' }, [
            el('span', {
                class: 'rxdbv-back',
                text: '‹',
                onClick: () => {
                    this.screen = { kind: 'documents', collectionName };
                    this.context.render();
                }
            }),
            el('span', { class: 'rxdbv-mono', style: { fontWeight: '700' }, text: documentId }),
            el('span', { class: 'rxdbv-dim', style: { fontSize: '11px' }, text: 'in ' + collectionName })
        ]));

        if (!documentData) {
            this.element.appendChild(el('div', { class: 'rxdbv-center', text: 'Document not on this page.' }));
            return;
        }

        const scroll = el('div', { class: 'rxdbv-scroll' });
        const field = (label: string, value: any) => el('div', { class: 'rxdbv-narrow-field' }, [
            el('div', { text: label }),
            el('div', {
                class: valueType(value) === 'string' ? '' : 'rxdbv-mono',
                text: typeof value === 'string' ? value : JSON.stringify(value)
            })
        ]);
        scroll.appendChild(el('div', { class: 'rxdbv-narrow-head', text: 'FIELDS' }));
        Object.keys(documentData)
            .filter(name => !name.startsWith('_'))
            .forEach(name => scroll.appendChild(field(name, (documentData as any)[name])));
        scroll.appendChild(el('div', { class: 'rxdbv-narrow-head', text: 'INTERNALS' }));
        scroll.appendChild(field('_rev', shortRevision((documentData as any)._rev)));
        scroll.appendChild(field('_meta.lwt', (documentData as any)._meta?.lwt));
        this.element.appendChild(scroll);
        this.element.appendChild(el('div', {
            class: 'rxdbv-dim',
            style: { padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '11px' },
            text: 'Read-only at this width. Editing needs the desktop drawer.'
        }));
    }

    private async loadDocuments(collectionName: string): Promise<void> {
        const store = this.context.store;
        const collection = store.database.collections[collectionName];
        const view = store.getView(collectionName);
        this.matchCount = await collection.count({ selector: view.selector }).exec();
        const documents = await collection.find({
            selector: view.selector,
            sort: [{ [view.sort.field]: view.sort.direction } as any],
            skip: this.page * store.pageSize,
            limit: store.pageSize
        }).exec();
        this.documents = documents.map(document => document.toJSON(true) as RxDocumentData<any>);
        this.context.render();
    }
}
