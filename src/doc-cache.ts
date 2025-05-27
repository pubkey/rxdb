import type {
    RxDocument,
    RxDocumentData,
    RxStorageChangeEvent
} from './types/index.d.ts';
import {
    getFromMapOrThrow,
    getHeightOfRevision,
    overwriteGetterForCaching,
    requestIdlePromiseNoQueue
} from './plugins/utils/index.ts';
import {
    overwritable
} from './overwritable.ts';
import { Observable } from 'rxjs';

/**
 * Because we have to create many cache items,
 * we use an array instead of an object with properties
 * for better performance and less memory usage.
 * @link https://stackoverflow.com/questions/17295056/array-vs-object-efficiency-in-javascript
 */
declare type CacheItem<RxDocType, OrmMethods> = [
    /**
     * Store the different document states of time
     * based on their [revisionHeight+_meta.lwt] .
     * We store WeakRefs so that we can later clean up
     * document states that are no longer needed.
     * 
     * Notice that we can not only rely on the revisionHeight
     * because when cleanup is used, two document states can end up with
     * the same revision but different _meta.lwt.
     */
    Map<string, WeakRef<RxDocument<RxDocType, OrmMethods>>>,

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
    RxDocumentData<RxDocType>
];


/**
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
 */
declare type FinalizationRegistryValue = {
    docId: string;
    revisionHeight: number;
    lwt: number;
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
    public readonly cacheItemByDocId = new Map<string, CacheItem<RxDocType, OrmMethods>>();

    /**
     * Process stuff lazy to not block the CPU
     * on critical paths.
     */
    public readonly tasks = new Set<Function>();

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
                cacheItem[0].delete(docMeta.revisionHeight + docMeta.lwt + '');
                if (cacheItem[0].size === 0) {
                    /**
                     * No state of the document is cached anymore,
                     * so we can clean up.
                     */
                    this.cacheItemByDocId.delete(docId);
                }
            }
        }) :
        undefined;

    constructor(
        public readonly primaryPath: string,
        public readonly changes$: Observable<RxStorageChangeEvent<RxDocType>[]>,
        /**
         * A method that can create a RxDocument by the given document data.
         */
        public documentCreator: (docData: RxDocumentData<RxDocType>) => RxDocument<RxDocType, OrmMethods>
    ) {
        changes$.subscribe(events => {
            this.tasks.add(() => {
                const cacheItemByDocId = this.cacheItemByDocId;
                for (let index = 0; index < events.length; index++) {
                    const event = events[index];
                    const cacheItem = cacheItemByDocId.get(event.documentId);
                    if (cacheItem) {
                        let documentData = event.documentData;
                        if (!documentData) {
                            documentData = event.previousDocumentData as any;
                        }
                        cacheItem[1] = documentData;
                    }
                }
            });
            if (this.tasks.size <= 1) {
                requestIdlePromiseNoQueue().then(() => {
                    this.processTasks();
                });
            }
        });
    }

    public processTasks() {
        if (this.tasks.size === 0) {
            return;
        }
        const tasks = Array.from(this.tasks);
        tasks.forEach(task => task());
        this.tasks.clear();
    }

    /**
     * Get the RxDocument from the cache
     * and create a new one if not exits before.
     * @overwrites itself with the actual function
     * because this is @performance relevant.
     * It is called on each document row for each write and read.
     */
    get getCachedRxDocuments(): (docsData: RxDocumentData<RxDocType>[]) => RxDocument<RxDocType, OrmMethods>[] {
        const fn = getCachedRxDocumentMonad(this);
        return overwriteGetterForCaching(
            this,
            'getCachedRxDocuments',
            fn
        );
    }

    get getCachedRxDocument(): (docData: RxDocumentData<RxDocType>) => RxDocument<RxDocType, OrmMethods> {
        const fn = getCachedRxDocumentMonad(this);
        return overwriteGetterForCaching(
            this,
            'getCachedRxDocument',
            doc => fn([doc])[0]
        );
    }

    /**
     * Throws if not exists
     */
    public getLatestDocumentData(docId: string): RxDocumentData<RxDocType> {
        this.processTasks();
        const cacheItem = getFromMapOrThrow(this.cacheItemByDocId, docId);
        return cacheItem[1];
    }

    public getLatestDocumentDataIfExists(docId: string): RxDocumentData<RxDocType> | undefined {
        this.processTasks();
        const cacheItem = this.cacheItemByDocId.get(docId);
        if (cacheItem) {
            return cacheItem[1];
        }
    }
}

/**
 * This function is called very very often.
 * @hotPath This is one of the most important methods for performance.
 * It is used in many places to transform the raw document data into RxDocuments.
 */
function getCachedRxDocumentMonad<RxDocType, OrmMethods>(
    docCache: DocumentCache<RxDocType, OrmMethods>
): (docsData: RxDocumentData<RxDocType>[]) => RxDocument<RxDocType, OrmMethods>[] {
    const primaryPath = docCache.primaryPath;
    const cacheItemByDocId = docCache.cacheItemByDocId;
    const registry = docCache.registry;
    const deepFreezeWhenDevMode = overwritable.deepFreezeWhenDevMode;
    const documentCreator = docCache.documentCreator;
    const fn: (docsData: RxDocumentData<RxDocType>[]) => RxDocument<RxDocType, OrmMethods>[] = (docsData: RxDocumentData<RxDocType>[]) => {
        const ret: RxDocument<RxDocType, OrmMethods>[] = new Array(docsData.length);
        const registryTasks: RxDocument<RxDocType, OrmMethods>[] = [];
        for (let index = 0; index < docsData.length; index++) {
            let docData = docsData[index];
            const docId: string = (docData as any)[primaryPath];

            const revisionHeight = getHeightOfRevision(docData._rev);

            let byRev: Map<string, WeakRef<RxDocument<RxDocType, OrmMethods>>>;
            let cachedRxDocumentWeakRef: WeakRef<RxDocument<RxDocType, OrmMethods>> | undefined;
            let cacheItem = cacheItemByDocId.get(docId);
            if (!cacheItem) {
                byRev = new Map();
                cacheItem = [
                    byRev,
                    docData
                ];
                cacheItemByDocId.set(docId, cacheItem);
            } else {
                byRev = cacheItem[0];
                cachedRxDocumentWeakRef = byRev.get(revisionHeight + docData._meta.lwt + '');
            }
            let cachedRxDocument = cachedRxDocumentWeakRef ? cachedRxDocumentWeakRef.deref() : undefined;
            if (!cachedRxDocument) {
                docData = deepFreezeWhenDevMode(docData) as any;
                cachedRxDocument = documentCreator(docData) as RxDocument<RxDocType, OrmMethods>;
                byRev.set(revisionHeight + docData._meta.lwt + '', createWeakRefWithFallback(cachedRxDocument));
                if (registry) {
                    registryTasks.push(cachedRxDocument);
                }
            }
            ret[index] = cachedRxDocument;
        }
        if (registryTasks.length > 0 && registry) {
            /**
             * Calling registry.register() has shown to have
             * really bad performance. So we add the cached documents
             * lazily.
             */
            docCache.tasks.add(() => {
                for (let index = 0; index < registryTasks.length; index++) {
                    const doc = registryTasks[index];
                    registry.register(doc, {
                        docId: doc.primary,
                        revisionHeight: getHeightOfRevision(doc.revision),
                        lwt: doc._data._meta.lwt
                    });
                }
            });
            if (docCache.tasks.size <= 1) {
                requestIdlePromiseNoQueue().then(() => {
                    docCache.processTasks();
                });
            }
        }
        return ret;
    };
    return fn;
}

export function mapDocumentsDataToCacheDocs<RxDocType, OrmMethods>(
    docCache: DocumentCache<RxDocType, OrmMethods>,
    docsData: RxDocumentData<RxDocType>[]
) {
    const getCachedRxDocuments = docCache.getCachedRxDocuments;
    return getCachedRxDocuments(docsData);
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
