import type {
    RxChangeEvent,
    RxDocument,
    RxDocumentData
} from './types/index.d.ts';
import {
    getFromMapOrCreate,
    getFromMapOrThrow,
    getHeightOfRevision,
    overwriteGetterForCaching,
    requestIdlePromiseNoQueue
} from './plugins/utils/index.ts';
import {
    overwritable
} from './overwritable.ts';
import { getDocumentDataOfRxChangeEvent } from './rx-change-event.ts';
import { Observable } from 'rxjs';

declare type CacheItem<RxDocType, OrmMethods> = {
    /**
     * Store the different document states of time
     * based on their revision height.
     * We store WeakRefs so that we can later clean up
     * document states that are no longer needed.
     */
    byRev: Map<number, WeakRef<RxDocument<RxDocType, OrmMethods>>>;

    /**
     * Store the latest known document state.
     * As long as any state of the document is in the cache,
     * we observe the changestream and update the latestDoc accordingly.
     * This makes it easier to optimize performance on other parts
     * because for each known document we can always get the current state
     * in the storage.
     * Also it makes it possible to call RxDocument.latest() in a non-async way
     * to retrieve the latest document state or to observe$ some property.
     *
     * To not prevent the whole cacheItem from being garbage collected,
     * we store only the document data here, but not the RxDocument.
     */
    last: RxDocumentData<RxDocType>;
};


/**
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
 */
declare type FinalizationRegistryValue = {
    docId: string;
    revisionHeight: number;
};

/**
 * The DocumentCache stores RxDocument objects
 * by their primary key and revision.
 * This is useful on client side applications where
 * it is not known how much memory can be used, so
 * we de-duplicate RxDocument states to save memory.
 * To not fill up the memory with old document states, the DocumentCache
 * only contains weak references to the RxDocuments themself.
 * @link https://caniuse.com/?search=weakref
 */
export class DocumentCache<RxDocType, OrmMethods> {
    public cacheItemByDocId = new Map<string, CacheItem<RxDocType, OrmMethods>>();

    /**
     * Some JavaScript runtimes like QuickJS,
     * so not have a FinalizationRegistry or WeakRef.
     * Therefore we need a workaround which might waste a lot of memory,
     * but at least works.
     */
    public readonly registry?: FinalizationRegistry<FinalizationRegistryValue> = typeof FinalizationRegistry === 'function' ?
        new FinalizationRegistry<FinalizationRegistryValue>(docMeta => {
            const docId = docMeta.docId;
            const cacheItem = this.cacheItemByDocId.get(docId);
            if (cacheItem) {
                cacheItem.byRev.delete(docMeta.revisionHeight);
                if (cacheItem.byRev.size === 0) {
                    /**
                     * No state of the document is cached anymore,
                     * so we can clean up.
                     */
                    this.cacheItemByDocId.delete(docId);
                }
            }
        }) :
        undefined;

    /**
     * Calling registry.register(() has shown to have
     * really bad performance. So we add the cached documents
     * lazily.
     */
    public registerIdlePromise?: Promise<any>;
    public registerIdleTasks: RxDocument<RxDocType, OrmMethods>[] = [];

    constructor(
        public readonly primaryPath: string,
        public readonly changes$: Observable<RxChangeEvent<RxDocType>>,
        /**
         * A method that can create a RxDocument by the given document data.
         */
        public documentCreator: (docData: RxDocumentData<RxDocType>) => RxDocument<RxDocType, OrmMethods>
    ) {
        changes$.subscribe(changeEvent => {
            const docId = changeEvent.documentId;
            const cacheItem = this.cacheItemByDocId.get(docId);
            if (cacheItem) {
                const documentData = getDocumentDataOfRxChangeEvent(changeEvent);
                cacheItem.last = documentData;
            }
        });
    }

    /**
     * Get the RxDocument from the cache
     * and create a new one if not exits before.
     * @overwrites itself with the actual function
     * because this is @performance relevant.
     * It is called on each document row for each write and read.
     */
    get getCachedRxDocument(): (docData: RxDocumentData<RxDocType>) => RxDocument<RxDocType, OrmMethods> {
        const fn = getCachedRxDocumentMonad(this);
        return overwriteGetterForCaching(
            this,
            'getCachedRxDocument',
            fn
        );
    }

    /**
     * Throws if not exists
     */
    public getLatestDocumentData(docId: string): RxDocumentData<RxDocType> {
        const cacheItem = getFromMapOrThrow(this.cacheItemByDocId, docId);
        return cacheItem.last;
    }

    public getLatestDocumentDataIfExists(docId: string): RxDocumentData<RxDocType> | undefined {
        const cacheItem = this.cacheItemByDocId.get(docId);
        if (cacheItem) {
            return cacheItem.last;
        }
    }
}

/**
 * This function is called very very often.
 * This is likely the most important function for RxDB overall performance
 */
function getCachedRxDocumentMonad<RxDocType, OrmMethods>(
    docCache: DocumentCache<RxDocType, OrmMethods>
): (docData: RxDocumentData<RxDocType>) => RxDocument<RxDocType, OrmMethods> {
    const primaryPath = docCache.primaryPath;
    const cacheItemByDocId = docCache.cacheItemByDocId;
    const registry = docCache.registry;
    const deepFreezeWhenDevMode = overwritable.deepFreezeWhenDevMode;
    const documentCreator = docCache.documentCreator;
    const fn: (docData: RxDocumentData<RxDocType>) => RxDocument<RxDocType, OrmMethods> = (docData: RxDocumentData<RxDocType>) => {
        const docId: string = (docData as any)[primaryPath];
        const revisionHeight = getHeightOfRevision(docData._rev);
        const cacheItem = getFromMapOrCreate<string, CacheItem<RxDocType, OrmMethods>>(
            cacheItemByDocId,
            docId,
            () => getNewCacheItem<RxDocType, OrmMethods>(docData)
        );

        const byRev = cacheItem.byRev;
        const cachedRxDocumentWeakRef: WeakRef<RxDocument<RxDocType, OrmMethods>> | undefined = byRev.get(revisionHeight);
        let cachedRxDocument = cachedRxDocumentWeakRef ? cachedRxDocumentWeakRef.deref() : undefined;
        if (!cachedRxDocument) {
            docData = deepFreezeWhenDevMode(docData) as any;
            cachedRxDocument = documentCreator(docData) as RxDocument<RxDocType, OrmMethods>;
            byRev.set(revisionHeight, createWeakRefWithFallback(cachedRxDocument));
            if (registry) {
                docCache.registerIdleTasks.push(cachedRxDocument);
                if (!docCache.registerIdlePromise) {
                    docCache.registerIdlePromise = requestIdlePromiseNoQueue().then(() => {
                        docCache.registerIdlePromise = undefined;
                        const tasks = docCache.registerIdleTasks;
                        if (tasks.length === 0) {
                            return;
                        }
                        docCache.registerIdleTasks = [];
                        tasks.forEach(doc => {
                            registry.register(doc, {
                                docId: doc.primary,
                                revisionHeight: getHeightOfRevision(doc.revision)
                            });
                        });
                    });
                }
            }
        }
        return cachedRxDocument;
    };
    return fn;
}

export function mapDocumentsDataToCacheDocs<RxDocType, OrmMethods>(
    docCache: DocumentCache<RxDocType, OrmMethods>,
    docsData: RxDocumentData<RxDocType>[]
) {
    const getCachedRxDocument = docCache.getCachedRxDocument;
    const documents: RxDocument<RxDocType, OrmMethods>[] = [];
    for (let i = 0; i < docsData.length; i++) {
        const docData = docsData[i];
        const doc = getCachedRxDocument(docData);
        documents.push(doc);
    }
    return documents;
}


function getNewCacheItem<RxDocType, OrmMethods>(docData: RxDocumentData<RxDocType>): CacheItem<RxDocType, OrmMethods> {
    return {
        byRev: new Map(),
        last: docData
    };
}




/**
 * Fallback for JavaScript runtimes that do not support WeakRef.
 * The fallback will keep the items in cache forever,
 * but at least works.
 */
const HAS_WEAK_REF = typeof WeakRef === 'function';
const createWeakRefWithFallback = HAS_WEAK_REF ? createWeakRef : createWeakRefFallback;
function createWeakRef<T extends object>(obj: T): WeakRef<T> {
    return new WeakRef(obj) as any;
}
function createWeakRefFallback<T extends object>(obj: T): WeakRef<T> {
    return {
        deref() {
            return obj;
        }
    } as any;
}
