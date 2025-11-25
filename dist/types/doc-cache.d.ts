import type { RxDocument, RxDocumentData, RxStorageChangeEvent } from './types/index.d.ts';
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
export declare class DocumentCache<RxDocType, OrmMethods> {
    readonly primaryPath: string;
    readonly changes$: Observable<RxStorageChangeEvent<RxDocType>[]>;
    /**
     * A method that can create a RxDocument by the given document data.
     */
    documentCreator: (docData: RxDocumentData<RxDocType>) => RxDocument<RxDocType, OrmMethods>;
    readonly cacheItemByDocId: Map<string, CacheItem<RxDocType, OrmMethods>>;
    /**
     * Process stuff lazy to not block the CPU
     * on critical paths.
     */
    readonly tasks: Set<Function>;
    /**
     * Some JavaScript runtimes like QuickJS,
     * so not have a FinalizationRegistry or WeakRef.
     * Therefore we need a workaround which might waste a lot of memory,
     * but at least works.
     */
    readonly registry?: FinalizationRegistry<FinalizationRegistryValue>;
    constructor(primaryPath: string, changes$: Observable<RxStorageChangeEvent<RxDocType>[]>, 
    /**
     * A method that can create a RxDocument by the given document data.
     */
    documentCreator: (docData: RxDocumentData<RxDocType>) => RxDocument<RxDocType, OrmMethods>);
    processTasks(): void;
    /**
     * Get the RxDocument from the cache
     * and create a new one if not exits before.
     * @overwrites itself with the actual function
     * because this is @performance relevant.
     * It is called on each document row for each write and read.
     */
    get getCachedRxDocuments(): (docsData: RxDocumentData<RxDocType>[]) => RxDocument<RxDocType, OrmMethods>[];
    get getCachedRxDocument(): (docData: RxDocumentData<RxDocType>) => RxDocument<RxDocType, OrmMethods>;
    /**
     * Throws if not exists
     */
    getLatestDocumentData(docId: string): RxDocumentData<RxDocType>;
    getLatestDocumentDataIfExists(docId: string): RxDocumentData<RxDocType> | undefined;
}
export declare function mapDocumentsDataToCacheDocs<RxDocType, OrmMethods>(docCache: DocumentCache<RxDocType, OrmMethods>, docsData: RxDocumentData<RxDocType>[]): RxDocument<RxDocType, OrmMethods>[];
export {};
