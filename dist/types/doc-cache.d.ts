import type { RxChangeEvent, RxDocument, RxDocumentData } from './types';
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
 * The DocumentCache stores RxDocument objects
 * by their primary key and revision.
 * This is useful on client side applications where
 * it is not known how much memory can be used, so
 * we de-duplicate RxDocument states to save memory.
 * To not fill up the memory with old document states, the DocumentCache
 * only contains weak references to the RxDocuments themself.
 * @link https://caniuse.com/?search=weakref
 */
export declare class DocumentCache<RxDocType, OrmMethods> {
    readonly primaryPath: string;
    readonly changes$: Observable<RxChangeEvent<RxDocType>>;
    /**
     * A method that can create a RxDocument by the given document data.
     */
    documentCreator: (docData: RxDocumentData<RxDocType>) => RxDocument<RxDocType, OrmMethods>;
    cacheItemByDocId: Map<string, CacheItem<RxDocType, OrmMethods>>;
    /**
     * Some JavaScript runtimes like QuickJS,
     * so not have a FinalizationRegistry or WeakRef.
     * Therefore we need a workaround which might waste a lot of memory,
     * but at least works.
     */
    private registry?;
    constructor(primaryPath: string, changes$: Observable<RxChangeEvent<RxDocType>>, 
    /**
     * A method that can create a RxDocument by the given document data.
     */
    documentCreator: (docData: RxDocumentData<RxDocType>) => RxDocument<RxDocType, OrmMethods>);
    /**
     * Get the RxDocument from the cache
     * and create a new one if not exits before.
     */
    getCachedRxDocument(docData: RxDocumentData<RxDocType>): RxDocument<RxDocType, OrmMethods>;
    /**
     * Throws if not exists
     */
    getLatestDocumentData(docId: string): RxDocumentData<RxDocType>;
    getLatestDocumentDataIfExists(docId: string): RxDocumentData<RxDocType> | undefined;
}
export {};
