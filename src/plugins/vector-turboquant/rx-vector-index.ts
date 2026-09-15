import {
    Subject,
    type Subscription
} from 'rxjs';
import { newRxError } from '../../rx-error.ts';
import { getChangedDocumentsSince } from '../../rx-storage-helper.ts';
import type {
    RxChangeEvent,
    RxCollection,
    RxDocument,
    RxDocumentData
} from '../../types/index.d.ts';
import {
    getFromMapOrCreate,
    PROMISE_RESOLVE_VOID
} from '../utils/index.ts';
import { TurboQuantIndex } from './turboquant-index.ts';
import type {
    RxVectorIndexOptions,
    RxVectorIndexSearchResult,
    TurboQuantSearchOptions,
    TurboQuantSearchResult,
    TurboQuantVector
} from './types.ts';

export const VECTOR_INDEX_BY_COLLECTION = new WeakMap<
    RxCollection<any>,
    Map<string, RxVectorIndex<any>>
>();

/**
 * Keeps a TurboQuantIndex in sync with the documents of an RxCollection.
 * The index itself lives in memory, the vectors come from the documents
 * so that the source of truth stays inside the collection.
 */
export class RxVectorIndex<RxDocType> {
    public readonly index: TurboQuantIndex;
    public closed = false;
    /**
     * Emits the errors that were thrown by the embedding function
     * while a change event was processed.
     */
    public readonly error$ = new Subject<Error>();
    private readonly subscriptions: Subscription[] = [];
    /**
     * All writes to the index run one after another so that
     * an async embedding function cannot mix up the order of two writes.
     */
    private queue: Promise<any> = PROMISE_RESOLVE_VOID;
    private bufferedEvents: RxChangeEvent<RxDocType>[] | null = [];

    constructor(
        public readonly collection: RxCollection<RxDocType>,
        public readonly options: RxVectorIndexOptions<RxDocType>
    ) {
        this.index = new TurboQuantIndex(options);
    }

    get identifier(): string {
        return this.options.identifier;
    }

    get size(): number {
        return this.index.size;
    }

    has(id: string): boolean {
        return this.index.has(id);
    }

    getIds(): string[] {
        return this.index.getIds();
    }

    /**
     * Reads all documents of the collection once and then follows
     * the change stream of the collection.
     */
    async init() {
        this.subscriptions.push(
            this.collection.$.subscribe(event => {
                if (this.bufferedEvents) {
                    this.bufferedEvents.push(event);
                } else {
                    this.runInQueue(() => this.handleChangeEvent(event));
                }
            })
        );
        this.collection.onClose.push(() => this.close());

        const calibrationSampleSize = this.options.calibrationSampleSize;
        if (calibrationSampleSize && calibrationSampleSize > 0) {
            const samples = await this.readVectors(calibrationSampleSize);
            this.index.calibrate(samples);
        }

        await this.fill();

        const buffered = this.bufferedEvents ? this.bufferedEvents : [];
        this.bufferedEvents = null;
        for (const event of buffered) {
            await this.runInQueue(() => this.handleChangeEvent(event));
        }
    }

    private get batchSize(): number {
        return this.options.batchSize ? this.options.batchSize : 100;
    }

    /**
     * Collects up to limit vectors, used for the calibration sample.
     */
    private async readVectors(limit: number): Promise<TurboQuantVector[]> {
        const ret: TurboQuantVector[] = [];
        await this.iterateDocuments(async (docData) => {
            const vector = await this.options.embedding(docData);
            if (vector) {
                ret.push(vector);
            }
            return ret.length < limit;
        });
        return ret;
    }

    private async fill() {
        await this.iterateDocuments(async (docData) => {
            const vector = await this.options.embedding(docData);
            if (vector) {
                this.index.add((docData as any)[this.collection.schema.primaryPath], vector);
            }
            return true;
        });
    }

    /**
     * Runs the handler on every non deleted document of the collection.
     * Stops when the handler returns false.
     */
    private async iterateDocuments(
        handler: (docData: RxDocumentData<RxDocType>) => Promise<boolean>
    ) {
        const batchSize = this.batchSize;
        let checkpoint: any = undefined;
        while (!this.closed) {
            const result = await getChangedDocumentsSince<RxDocType, any>(
                this.collection.storageInstance,
                batchSize,
                checkpoint
            );
            checkpoint = result.checkpoint;
            for (const docData of result.documents) {
                if (docData._deleted) {
                    continue;
                }
                const goOn = await handler(docData);
                if (!goOn) {
                    return;
                }
            }
            if (result.documents.length < batchSize) {
                return;
            }
        }
    }

    private runInQueue<T>(fn: () => Promise<T>): Promise<T> {
        const next = this.queue.then(() => fn());
        this.queue = next.catch(error => this.error$.next(error));
        return next;
    }

    private async handleChangeEvent(event: RxChangeEvent<RxDocType>) {
        if (this.closed) {
            return;
        }
        const id = event.documentId;
        if (event.operation === 'DELETE' || event.documentData._deleted) {
            this.index.remove(id);
            return;
        }
        const vector = await this.options.embedding(event.documentData);
        if (vector) {
            this.index.add(id, vector);
        } else {
            this.index.remove(id);
        }
    }

    /**
     * Waits until all pending change events have been written to the index.
     */
    async awaitInSync(): Promise<void> {
        await this.queue;
    }

    search(
        queryVector: TurboQuantVector,
        k: number,
        options?: TurboQuantSearchOptions
    ): TurboQuantSearchResult[] {
        return this.index.search(queryVector, k, options);
    }

    /**
     * Same as search() but also returns the matching RxDocuments.
     */
    async searchDocuments(
        queryVector: TurboQuantVector,
        k: number,
        options?: TurboQuantSearchOptions
    ): Promise<RxVectorIndexSearchResult<RxDocType>[]> {
        const results = this.search(queryVector, k, options);
        if (results.length === 0) {
            return [];
        }
        const documents = await this.collection.findByIds(results.map(result => result.id)).exec();
        const ret: RxVectorIndexSearchResult<RxDocType>[] = [];
        for (const result of results) {
            const document = documents.get(result.id);
            if (document) {
                ret.push({
                    id: result.id,
                    score: result.score,
                    document: document as RxDocument<RxDocType>
                });
            }
        }
        return ret;
    }

    async close() {
        if (this.closed) {
            return;
        }
        this.closed = true;
        this.subscriptions.forEach(subscription => subscription.unsubscribe());
        this.error$.complete();
        const byCollection = VECTOR_INDEX_BY_COLLECTION.get(this.collection);
        if (byCollection) {
            byCollection.delete(this.identifier);
        }
        await this.queue;
        this.index.clear();
    }
}

export async function addVectorIndex<RxDocType>(
    this: RxCollection<RxDocType>,
    options: RxVectorIndexOptions<RxDocType>
): Promise<RxVectorIndex<RxDocType>> {
    const byCollection = getFromMapOrCreate(
        VECTOR_INDEX_BY_COLLECTION,
        this,
        () => new Map<string, RxVectorIndex<any>>()
    );
    if (byCollection.has(options.identifier)) {
        throw newRxError('VQ7', {
            id: options.identifier,
            collection: this.name
        });
    }
    const vectorIndex = new RxVectorIndex<RxDocType>(this, options);
    byCollection.set(options.identifier, vectorIndex);
    await vectorIndex.init();
    return vectorIndex;
}

/**
 * Returns a vector index that was added before with addVectorIndex().
 */
export function getVectorIndex<RxDocType>(
    collection: RxCollection<RxDocType>,
    identifier: string
): RxVectorIndex<RxDocType> {
    const byCollection = VECTOR_INDEX_BY_COLLECTION.get(collection);
    const vectorIndex = byCollection ? byCollection.get(identifier) : undefined;
    if (!vectorIndex) {
        throw newRxError('VQ8', {
            id: identifier,
            collection: collection.name
        });
    }
    return vectorIndex;
}
