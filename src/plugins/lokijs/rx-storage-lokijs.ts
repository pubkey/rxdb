import {
    BlobBuffer,
    BulkWriteRow,
    ChangeStreamOnceOptions,
    LokiDatabaseSettings,
    LokiSettings,
    LokiStorageInternals,
    MangoQuery,
    RxDocumentData,
    RxJsonSchema,
    RxKeyObjectStorageInstanceCreationParams,
    RxLocalDocumentData,
    RxStorage,
    RxStorageBulkWriteResponse,
    RxStorageChangedDocumentMeta,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageInstanceCreationParams,
    RxStorageQueryResult
} from '../../types';
import {
    Collection
} from 'lokijs';
import { hash } from '../../util';
import { createLokiStorageInstance, RxStorageInstanceLoki } from './rx-storage-instance-loki';
import { createLokiKeyObjectStorageInstance, RxStorageKeyObjectInstanceLoki } from './rx-storage-key-object-instance-loki';
import { SortComparator, QueryMatcher } from 'event-reduce-js';
import { Observable } from 'rxjs';

export class RxStorageLoki implements RxStorage<LokiStorageInternals, LokiSettings> {
    public name = 'lokijs';

    constructor(
        public databseSettings: LokiDatabaseSettings = {}
    ) { }

    hash(data: Buffer | Blob | string): Promise<string> {
        return Promise.resolve(hash(data));
    }

    async createStorageInstance<RxDocType>(
        params: RxStorageInstanceCreationParams<RxDocType, LokiSettings>
    ): Promise<RxStorageInstanceLoki<RxDocType>> {
        return createLokiStorageInstance(params);
    }

    public async createKeyObjectStorageInstance(
        params: RxKeyObjectStorageInstanceCreationParams<LokiSettings>
    ): Promise<RxStorageKeyObjectInstanceLoki> {
        return createLokiKeyObjectStorageInstance(params);
    }
}


export class RxStorageInstanceLokiProxy<RxDocType> implements RxStorageInstance<RxDocType, LokiStorageInternals, LokiSettings> {
    constructor(
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocType>>,
        public readonly internals: Readonly<LokiStorageInternals>,
        public readonly options: Readonly<LokiSettings>,
        public readonly broadcastChannel?: BroadcastChannel
    ) {

    }
    prepareQuery(mutateableQuery: MangoQuery<RxDocType>) {
        throw new Error('Method not implemented.');
    }
    getSortComparator(query: MangoQuery<RxDocType>): SortComparator<RxDocType> {
        throw new Error('Method not implemented.');
    }
    getQueryMatcher(query: MangoQuery<RxDocType>): QueryMatcher<RxDocType> {
        throw new Error('Method not implemented.');
    }
    bulkWrite(documentWrites: BulkWriteRow<RxDocType>[]): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        throw new Error('Method not implemented.');
    }
    bulkAddRevisions(documents: RxDocumentData<RxDocType>[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
    findDocumentsById(ids: string[], deleted: boolean): Promise<Map<string, RxDocumentData<RxDocType>>> {
        throw new Error('Method not implemented.');
    }
    query(preparedQuery: any): Promise<RxStorageQueryResult<RxDocType>> {
        throw new Error('Method not implemented.');
    }
    getAttachmentData(documentId: string, attachmentId: string): Promise<BlobBuffer> {
        throw new Error('Method not implemented.');
    }
    getChangedDocuments(options: ChangeStreamOnceOptions): Promise<{ changedDocuments: RxStorageChangedDocumentMeta[]; lastSequence: number; }> {
        throw new Error('Method not implemented.');
    }
    changeStream(): Observable<RxStorageChangeEvent<RxDocumentData<RxDocType>>> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    remove(): Promise<void> {
        throw new Error('Method not implemented.');
    }


}

export function getRxStorageLoki(
    databaseSettings?: LokiDatabaseSettings
): RxStorageLoki {
    const storage = new RxStorageLoki(databaseSettings);
    return storage;
}
