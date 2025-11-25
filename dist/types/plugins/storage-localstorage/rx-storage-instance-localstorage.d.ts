import { Observable, Subject } from 'rxjs';
import type { BulkWriteRow, ById, EventBulk, PreparedQuery, RxDocumentData, RxDocumentWriteData, RxJsonSchema, RxStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageCountResult, RxStorageDefaultCheckpoint, RxStorageInstance, RxStorageInstanceCreationParams, RxStorageQueryResult, StringKeys } from '../../types/index';
import type { RxStorageLocalstorage } from './index.ts';
export declare const RX_STORAGE_NAME_LOCALSTORAGE = "localstorage";
export type LocalstorageStorageInternals<RxDocType = any> = {
    indexes: ById<IndexMeta<RxDocType>>;
};
export type LocalstorageInstanceCreationOptions = {};
export type LocalstorageStorageSettings = {
    localStorage?: typeof localStorage;
};
export type LocalstorageIndex = string[][];
export type ChangeStreamStoredData<RxDocType> = {
    databaseInstanceToken: string;
    eventBulk: EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, any>;
};
/**
 * StorageEvents are not send to the same
 * browser tab where they where created.
 * This makes it hard to write unit tests
 * so we redistribute the events here instead.
 */
export declare const storageEventStream$: Subject<{
    fromStorageEvent: boolean;
    key: string;
    newValue: string | null;
    databaseInstanceToken?: string;
}>;
export declare function getStorageEventStream(): Observable<{
    fromStorageEvent: boolean;
    key: string;
    newValue: string | null;
    databaseInstanceToken?: string;
}>;
export declare class RxStorageInstanceLocalstorage<RxDocType> implements RxStorageInstance<RxDocType, LocalstorageStorageInternals, LocalstorageInstanceCreationOptions, RxStorageDefaultCheckpoint> {
    readonly storage: RxStorageLocalstorage;
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>;
    readonly internals: LocalstorageStorageInternals;
    readonly options: Readonly<LocalstorageInstanceCreationOptions>;
    readonly settings: LocalstorageStorageSettings;
    readonly multiInstance: boolean;
    readonly databaseInstanceToken: string;
    readonly primaryPath: StringKeys<RxDocType>;
    /**
     * Under this key the whole state
     * will be stored as stringified json
     * inside of the localstorage.
     */
    readonly docsKey: string;
    readonly attachmentsKey: string;
    readonly changestreamStorageKey: string;
    readonly indexesKey: string;
    private changeStreamSub;
    private changes$;
    closed?: Promise<void>;
    readonly localStorage: typeof localStorage;
    removed: boolean;
    readonly instanceId: number;
    constructor(storage: RxStorageLocalstorage, databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>, internals: LocalstorageStorageInternals, options: Readonly<LocalstorageInstanceCreationOptions>, settings: LocalstorageStorageSettings, multiInstance: boolean, databaseInstanceToken: string);
    getDoc(docId: string | RxDocumentWriteData<RxDocType>[StringKeys<RxDocType>]): RxDocumentData<RxDocType> | undefined;
    setDoc(doc: RxDocumentData<RxDocType>): void;
    getIndex(index: string[]): LocalstorageIndex;
    setIndex(index: string[], value: LocalstorageIndex): void;
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[], context: string): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    findDocumentsById(docIds: string[], withDeleted: boolean): Promise<RxDocumentData<RxDocType>[]>;
    query(preparedQuery: PreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
    count(preparedQuery: PreparedQuery<RxDocType>): Promise<RxStorageCountResult>;
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, RxStorageDefaultCheckpoint>>;
    cleanup(minimumDeletedTime: number): Promise<boolean>;
    getAttachmentData(documentId: string, attachmentId: string): Promise<string>;
    remove(): Promise<void>;
    close(): Promise<void>;
}
export declare function createLocalstorageStorageInstance<RxDocType>(storage: RxStorageLocalstorage, params: RxStorageInstanceCreationParams<RxDocType, LocalstorageInstanceCreationOptions>, settings: LocalstorageStorageSettings): Promise<RxStorageInstanceLocalstorage<RxDocType>>;
export declare function getIndexName(index: string[]): string;
export declare const CLEANUP_INDEX: string[];
export type IndexMeta<RxDocType> = {
    indexId: string;
    indexName: string;
    index: string[];
    getIndexableString: (doc: RxDocumentData<RxDocType>) => string;
};
