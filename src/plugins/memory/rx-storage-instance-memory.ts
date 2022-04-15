import { Observable, Subject } from 'rxjs';
import { newRxError } from '../../rx-error';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
import { categorizeBulkWriteRows } from '../../rx-storage-helper';
import type {
    BulkWriteRow,
    EventBulk,
    RxDocumentData,
    RxJsonSchema,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageInstanceCreationParams
} from '../../types';
import { ensureNotRemoved, getMemoryCollectionKey } from './memory-helper';
import { addIndexesToInternalsState } from './memory-indexes';
import type {
    MemoryStorageInternals,
    RxStorageMemory,
    RxStorageMemoryInstanceCreationOptions,
    RxStorageMemorySettings
} from './memory-types';

export class RxStorageInstanceMemory<RxDocType> implements RxStorageInstance<
    RxDocType,
    MemoryStorageInternals<RxDocType>,
    RxStorageMemoryInstanceCreationOptions
> {

    public readonly primaryPath: keyof RxDocType;
    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>> = new Subject();
    public closed = false;

    constructor(
        public readonly storage: RxStorageMemory,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocumentData<RxDocType>>>,
        public readonly internals: MemoryStorageInternals<RxDocType>,
        public readonly options: Readonly<RxStorageMemoryInstanceCreationOptions>,
        public readonly settings: RxStorageMemorySettings
    ) {
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey) as any;
    }

    async bulkWrite(documentWrites: BulkWriteRow<RxDocType>[]): Promise<RxStorageBulkWriteResponse<RxDocType>> {
        ensureNotRemoved(this);

        const ret: RxStorageBulkWriteResponse<RxDocType> = {
            success: {},
            error: {}
        };

        const docsInDb: Map<RxDocumentData<RxDocType>[keyof RxDocType], RxDocumentData<RxDocType>> = new Map();
        documentWrites.forEach(writeRow => {
            const docId = writeRow.document[this.primaryPath];
            const docInDb = this.internals.documents.get(docId as any);
            if (docInDb) {
                docsInDb.set(docId, docInDb);
            }
        });


        const categorized = categorizeBulkWriteRows<RxDocType>(
            this,
            this.primaryPath,
            docsInDb,
            documentWrites
        );
        categorized.errors.forEach(err => {
            ret.error[err.documentId] = err;
        });

        /**
         * Do inserts/updates
         */
        categorized.bulkInsertDocs.forEach(writeRow => {
            const docId = writeRow.document[this.primaryPath];
            this.internals.documents.set(docId as any, writeRow.document);

            ret.success[docId as any] = writeRow.document;
        });
    }

    getAttachmentData(_documentId: string, _attachmentId: string): Promise<string> {
        ensureNotRemoved(this);
        throw new Error('Attachments are not implemented in the memory RxStorage. Make a pull request.');
    }

    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>> {
        ensureNotRemoved(this);
        return this.changes$.asObservable();
    }

    async remove(): Promise<void> {
        ensureNotRemoved(this);

        this.internals.removed = true;
        this.storage.collectionStates.delete(
            getMemoryCollectionKey(this.databaseName, this.collectionName)
        );
        await this.close();
    }

    async close(): Promise<void> {
        ensureNotRemoved(this);

        if (this.closed) {
            throw newRxError('SNH', {
                database: this.databaseName,
                collection: this.collectionName
            });
        }
        this.closed = true;
        this.changes$.complete();

        this.internals.refCount = this.internals.refCount - 1;
        if (this.internals.refCount === 0) {
            this.storage.collectionStates.delete(
                getMemoryCollectionKey(this.databaseName, this.collectionName)
            );
        }
    }
}



export async function createMemoryStorageInstance<RxDocType>(
    storage: RxStorageMemory,
    params: RxStorageInstanceCreationParams<RxDocType, RxStorageMemoryInstanceCreationOptions>,
    settings: RxStorageMemorySettings
): Promise<RxStorageInstanceMemory<RxDocType>> {

    const collectionKey = getMemoryCollectionKey(params.databaseName, params.collectionName);


    let internals = storage.collectionStates.get(collectionKey);
    if (!internals) {
        internals = {
            removed: false,
            refCount: 1,
            documents: new Map(),
            byIndex: {}
        };
        addIndexesToInternalsState(internals, params.schema);
        storage.collectionStates.set(collectionKey, internals);
    } else {
        internals.refCount = internals.refCount + 1;
    }

    const instance = new RxStorageInstanceMemory(
        storage,
        params.databaseName,
        params.collectionName,
        params.schema,
        internals,
        params.options,
        settings
    );
    return instance;
}
