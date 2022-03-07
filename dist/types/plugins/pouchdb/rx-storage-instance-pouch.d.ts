import { Observable } from 'rxjs';
import type { BulkWriteRow, ChangeStreamOnceOptions, EventBulk, PouchSettings, PreparedQuery, RxDocumentData, RxJsonSchema, RxStorageBulkWriteResponse, RxStorageChangeEvent, RxStorageInstance, RxStorageQueryResult } from '../../types';
import { PouchStorageInternals } from './pouchdb-helper';
export declare class RxStorageInstancePouch<RxDocType> implements RxStorageInstance<RxDocType, PouchStorageInternals, PouchSettings> {
    readonly databaseName: string;
    readonly collectionName: string;
    readonly schema: Readonly<RxJsonSchema<RxDocType>>;
    readonly internals: Readonly<PouchStorageInternals>;
    readonly options: Readonly<PouchSettings>;
    readonly id: number;
    private changes$;
    private subs;
    private primaryPath;
    constructor(databaseName: string, collectionName: string, schema: Readonly<RxJsonSchema<RxDocType>>, internals: Readonly<PouchStorageInternals>, options: Readonly<PouchSettings>);
    close(): Promise<void>;
    remove(): Promise<void>;
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[]): Promise<RxStorageBulkWriteResponse<RxDocType>>;
    query(preparedQuery: PreparedQuery<RxDocType>): Promise<RxStorageQueryResult<RxDocType>>;
    getAttachmentData(documentId: string, attachmentId: string): Promise<string>;
    findDocumentsById(ids: string[], deleted: boolean): Promise<{
        [documentId: string]: RxDocumentData<RxDocType>;
    }>;
    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>>;
    getChangedDocuments(options: ChangeStreamOnceOptions): Promise<{
        changedDocuments: {
            id: string;
            sequence: number;
        }[];
        lastSequence: number;
    }>;
}
