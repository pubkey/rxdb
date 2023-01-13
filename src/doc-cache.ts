import type {
    RxChangeEvent,
    RxDocument,
    RxDocumentData
} from './types';
import {
    getFromMapOrFill,
    getFromMapOrThrow,
    getHeightOfRevision
} from './plugins/utils';
import {
    overwritable
} from './overwritable';
import { getDocumentDataOfRxChangeEvent } from './rx-change-event';
import { Observable } from 'rxjs';

declare type CacheItem<RxDocType, OrmMethods> = {
    /**
     * Store the different document states of time
     * based on their revision height.
     * We store WeakRefs so that we can later clean up
     * document states that are no longer needed.
     */
    documentByRevisionHeight: Map<number, WeakRef<RxDocument<RxDocType, OrmMethods>>>;

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
    latestDoc: RxDocumentData<RxDocType>;
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
    private registry?: FinalizationRegistry<FinalizationRegistryValue> = typeof FinalizationRegistry === 'function' ?
        new FinalizationRegistry<FinalizationRegistryValue>(docMeta => {
            const docId = docMeta.docId;
            const cacheItem = this.cacheItemByDocId.get(docId);
            if (cacheItem) {
                cacheItem.documentByRevisionHeight.delete(docMeta.revisionHeight);
                if (cacheItem.documentByRevisionHeight.size === 0) {
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
                cacheItem.latestDoc = documentData;
            }
        });
    }

    /**
     * Get the RxDocument from the cache
     * and create a new one if not exits before.
     */
    public getCachedRxDocument(docData: RxDocumentData<RxDocType>): RxDocument<RxDocType, OrmMethods> {
        const docId: string = (docData as any)[this.primaryPath];
        const revisionHeight = getHeightOfRevision(docData._rev);
        const cacheItem = getFromMapOrFill<string, CacheItem<RxDocType, OrmMethods>>(
            this.cacheItemByDocId,
            docId,
            () => getNewCacheItem<RxDocType, OrmMethods>(docData)
        );

        const cachedRxDocumentWeakRef: WeakRef<RxDocument<RxDocType, OrmMethods>> | undefined = cacheItem.documentByRevisionHeight.get(revisionHeight);
        let cachedRxDocument = cachedRxDocumentWeakRef ? cachedRxDocumentWeakRef.deref() : undefined;
        if (!cachedRxDocument) {
            docData = overwritable.deepFreezeWhenDevMode(docData) as any;
            cachedRxDocument = this.documentCreator(docData) as RxDocument<RxDocType, OrmMethods>;
            cacheItem.documentByRevisionHeight.set(revisionHeight, createWeakRefWithFallback(cachedRxDocument));

            if (this.registry) {
                this.registry.register(cachedRxDocument, {
                    docId,
                    revisionHeight
                });
            }
        }
        return cachedRxDocument;
    }

    /**
     * Throws if not exists
     */
    public getLatestDocumentData(docId: string): RxDocumentData<RxDocType> {
        const cacheItem = getFromMapOrThrow(this.cacheItemByDocId, docId);
        return cacheItem.latestDoc;
    }

    public getLatestDocumentDataIfExists(docId: string): RxDocumentData<RxDocType> | undefined {
        const cacheItem = this.cacheItemByDocId.get(docId);
        if (cacheItem) {
            return cacheItem.latestDoc;
        }
    }
}


function getNewCacheItem<RxDocType, OrmMethods>(docData: RxDocumentData<RxDocType>): CacheItem<RxDocType, OrmMethods> {
    return {
        documentByRevisionHeight: new Map(),
        latestDoc: docData
    };
}


/**
 * Fallback for JavaScript runtimes that do not support WeakRef.
 * The fallback will keep the items in cache forever,
 * but at least works.
 */
const HAS_WEAK_REF = typeof WeakRef === 'function';
function createWeakRefWithFallback<T extends object>(obj: T): WeakRef<T> {
    if (HAS_WEAK_REF) {
        return new WeakRef(obj) as any;
    } else {
        return {
            deref() {
                return obj;
            }
        } as any;
    }
}
