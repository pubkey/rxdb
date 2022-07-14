import { Observable } from 'rxjs';
import type { BulkWriteRow, EventBulk, PouchCheckpoint, PouchSettings, PreparedQuery, RxConflictResultionTask, RxConflictResultionTaskSolution, RxDocumentData, RxDocumentDataById, RxJsonSchema, RxStorage, RxStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageInstance, RxStorageQueryResult } from '../../types';
import { PouchStorageInternals } from './pouchdb-helper';
export declare class RxStorageInstancePouch<RxDocType> implements RxStorageInstance<RxDocType, PouchStorageInternals, PouchSettings, PouchCheckpoint> {
    readonly storage: RxStorage<PouchStorageInternals, PouchSettings>;
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>;
    readonly internals: Readonly<PouchStorageInternals>;
    readonly options: Readonly<PouchSettings>;
    readonly id: number;
    private changes$;
    private subs;
    private primaryPath;
    /**
     * Some PouchDB operations give wrong results when they run in parallel.
     * So we have to ensure they are queued up.
     */
    private nonParallelQueue;
    constructor(storage: RxStorage<PouchStorageInternals, PouchSettings>, databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>, internals: Readonly<PouchStorageInternals>, options: Readonly<PouchSettings>);
    close(): Promise<void>;
    remove(): Promise<void>;
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[], context: string): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    query(preparedQuery: PreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
    getAttachmentData(documentId: string, attachmentId: string): Promise<string>;
    findDocumentsById(ids: string[], deleted: boolean): Promise<RxDocumentDataById<RxDocType>>;
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>, PouchCheckpoint>>;
    cleanup(_minimumDeletedTime: number): Promise<boolean>;
    getChangedDocumentsSince(limit: number, checkpoint?: PouchCheckpoint): Promise<{
        document: RxDocumentData<RxDocType>;
        checkpoint: PouchCheckpoint;
    }[]>;
    conflictResultionTasks(): Observable<RxConflictResultionTask<RxDocType>>;
    resolveConflictResultionTask(_taskSolution: RxConflictResultionTaskSolution<RxDocType>): Promise<void>;
}
