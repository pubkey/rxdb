import type { RxCollection } from '../../../types/index.d.ts';
import { RXDB_VERSION } from '../../utils/utils-rxdb-version.ts';
import { button, clear, el, gridHead, gridRow } from '../dom.ts';
import { formatBytes, formatNumber } from '../format.ts';
import { normalizeMangoQuery, prepareQuery } from '../../../rx-query-helper.ts';
import type { PanelContext } from './context.ts';

const COLUMNS = '1fr 130px 130px 170px';
const TOMBSTONE_MAX_AGE_DAYS = 14;

type CollectionStorageRow = {
    collectionName: string;
    documents: number;
    tombstones: number;
    attachmentBytes: number;
};

/**
 * Attachment bytes are the only real size figure a storage can report,
 * so no estimated on-disk sizes are shown anywhere on this panel.
 */
export class StoragePanel {
    public readonly element: HTMLElement = el('div', { class: 'rxdt-main rxdt-scroll' });

    private rows: CollectionStorageRow[] = [];
    private loading = true;
    private cleanupRunning = false;

    constructor(private readonly context: PanelContext) {
        this.load();
    }

    public destroy(): void { }

    public render(): HTMLElement {
        clear(this.element);
        const store = this.context.store;
        const totalDocuments = this.rows.reduce((sum, row) => sum + row.documents, 0);
        const totalTombstones = this.rows.reduce((sum, row) => sum + row.tombstones, 0);
        const totalAttachmentBytes = this.rows.reduce((sum, row) => sum + row.attachmentBytes, 0);

        this.element.appendChild(el('div', { class: 'rxdt-toolbar' }, [
            el('span', { class: 'rxdt-panel-title', text: 'Storage' }),
            this.loading && el('span', { class: 'rxdt-dim', style: { fontSize: '10px' }, text: 'counting…' })
        ]));

        const card = (label: string, value: Node | string) => el('div', { class: 'rxdt-card' }, [
            el('div', { class: 'rxdt-section-label', text: label }),
            el('div', { class: 'rxdt-card-value' }, [value])
        ]);
        this.element.appendChild(el('div', { class: 'rxdt-cards' }, [
            card('ENGINE', store.database.storage.name),
            card('DATABASE', store.database.name + ' · rxdb v' + RXDB_VERSION),
            card('DOCUMENTS', formatNumber(totalDocuments)),
            card('ATTACHMENT BYTES', formatBytes(totalAttachmentBytes))
        ]));

        this.element.appendChild(gridHead(COLUMNS, [
            'collection', 'documents', 'tombstones', 'attachment bytes'
        ]));
        this.rows.forEach(row => {
            this.element.appendChild(gridRow(COLUMNS, [
                el('span', { class: 'rxdt-mono', text: row.collectionName }),
                el('span', { class: 'rxdt-mono', text: formatNumber(row.documents) }),
                el('span', { class: 'rxdt-mono rxdt-muted', text: formatNumber(row.tombstones) }),
                el('span', { class: 'rxdt-mono rxdt-muted', text: formatBytes(row.attachmentBytes) })
            ], { class: 'rxdt-tr rxdt-static' }));
        });
        this.element.appendChild(el('div', {
            class: 'rxdt-mono',
            style: {
                display: 'grid',
                gridTemplateColumns: COLUMNS,
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: '700',
                borderBottom: '1px solid rgba(255,255,255,0.14)'
            }
        }, [
            el('div', { text: 'total' }),
            el('div', { text: formatNumber(totalDocuments) }),
            el('div', { text: formatNumber(totalTombstones) }),
            el('div', { text: formatBytes(totalAttachmentBytes) })
        ]));

        this.element.appendChild(this.renderCleanup(totalTombstones));
        return this.element;
    }

    private renderCleanup(totalTombstones: number): HTMLElement {
        const store = this.context.store;
        const canClean = !store.readOnly &&
            store.collectionNames.some(name => typeof (store.database.collections[name] as any).cleanup === 'function');
        return el('div', { class: 'rxdt-note' }, [
            el('div', { style: { fontWeight: '700', fontSize: '12px' }, text: 'Cleanup' }),
            el('div', {
                class: 'rxdt-muted',
                style: { fontSize: '11.5px', marginTop: '4px', lineHeight: '1.55' },
                text: 'Purges tombstones older than ' + TOMBSTONE_MAX_AGE_DAYS +
                    ' days. Peers whose replication checkpoint predates the cleanup must re-sync from scratch.'
            }),
            !canClean && el('div', {
                class: 'rxdt-dim',
                style: { fontSize: '11px', marginTop: '6px' },
                text: store.readOnly
                    ? 'Not available in read-only mode.'
                    : 'Add the cleanup plugin to run this from here.'
            }),
            canClean && el('div', { style: { marginTop: '10px' } }, [
                button(
                    this.cleanupRunning
                        ? 'Running cleanup…'
                        : 'Run cleanup — purge ' + formatNumber(totalTombstones) + ' tombstones',
                    () => this.runCleanup(),
                    { variant: 'danger', disabled: this.cleanupRunning || totalTombstones === 0 }
                )
            ])
        ]);
    }

    private async runCleanup(): Promise<void> {
        const store = this.context.store;
        this.cleanupRunning = true;
        this.context.render();
        const minimumDeletedTime = TOMBSTONE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
        try {
            await Promise.all(store.collectionNames.map(name => {
                const collection = store.database.collections[name] as any;
                return typeof collection.cleanup === 'function'
                    ? collection.cleanup(minimumDeletedTime)
                    : Promise.resolve();
            }));
        } catch (error) {
            this.context.notify((error as Error).message);
        }
        this.cleanupRunning = false;
        await this.load();
    }

    private async load(): Promise<void> {
        const store = this.context.store;
        try {
            this.rows = await Promise.all(
                store.collectionNames.map(collectionName => this.readCollection(collectionName))
            );
        } catch (error) {
            this.context.notify((error as Error).message);
        }
        this.loading = false;
        this.context.render();
    }

    private async readCollection(collectionName: string): Promise<CollectionStorageRow> {
        const collection = this.context.store.database.collections[collectionName];
        const documents = await collection.count().exec();
        const [tombstones, attachmentBytes] = await Promise.all([
            countTombstones(collection),
            sumAttachmentBytes(collection)
        ]);
        return { collectionName, documents, tombstones, attachmentBytes };
    }
}

/**
 * Queries below the RxCollection because RxQuery always
 * filters deleted documents out of its results.
 */
async function countTombstones(collection: RxCollection): Promise<number> {
    const query = normalizeMangoQuery(collection.schema.jsonSchema, {
        selector: { _deleted: { $eq: true } } as any
    });
    const prepared = prepareQuery(collection.schema.jsonSchema, query);
    const result = await collection.storageInstance.count(prepared);
    return result.count;
}

async function sumAttachmentBytes(collection: RxCollection): Promise<number> {
    if (!collection.schema.jsonSchema.attachments) {
        return 0;
    }
    const documents = await collection.find().exec();
    return documents.reduce((sum, document) => {
        const attachments = (document.toJSON(true) as any)._attachments ?? {};
        return sum + Object.keys(attachments).reduce(
            (inner, key) => inner + (attachments[key].length ?? 0),
            0
        );
    }, 0);
}
