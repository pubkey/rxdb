import type { ChangeEvent } from 'event-reduce-js';
import { Observable, Subject } from 'rxjs';
import { newRxError } from '../../rx-error';
import type {
    BulkWriteLocalRow,
    LokiSettings,
    LokiStorageInternals,
    RxLocalDocumentData,
    RxLocalStorageBulkWriteResponse,
    RxStorageBulkWriteError,
    RxStorageBulkWriteLocalError,
    RxStorageChangeEvent,
    RxStorageKeyObjectInstance
} from '../../types';
import {
    createRevision,
    flatClone,
    now,
    parseRevision,
    promiseWait
} from '../../util';
import {
    CHANGES_COLLECTION_SUFFIX,
    CHANGES_LOCAL_SUFFIX,
    closeLokiCollections,
    getLokiEventKey,
    OPEN_LOKIJS_STORAGE_INSTANCES
} from './lokijs-helper';


export class RxStorageKeyObjectInstanceLoki implements RxStorageKeyObjectInstance<LokiStorageInternals, LokiSettings> {

    private changes$: Subject<RxStorageChangeEvent<RxLocalDocumentData>> = new Subject();

    constructor(
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly internals: Readonly<LokiStorageInternals>,
        public readonly options: Readonly<LokiSettings>
    ) {
        OPEN_LOKIJS_STORAGE_INSTANCES.add(this);
    }

    async bulkWrite<RxDocType>(documentWrites: BulkWriteLocalRow<RxDocType>[]): Promise<RxLocalStorageBulkWriteResponse<RxDocType>> {
        if (documentWrites.length === 0) {
            throw newRxError('P2', {
                args: {
                    documentWrites
                }
            });
        }

        const collection = this.internals.collection;
        const startTime = now();
        await promiseWait(0);

        const ret: RxLocalStorageBulkWriteResponse<RxDocType> = {
            success: new Map(),
            error: new Map()
        };
        const writeRowById: Map<string, BulkWriteLocalRow<RxDocType>> = new Map();
        documentWrites.forEach(writeRow => {
            const id = writeRow.document._id;
            writeRowById.set(id, writeRow);
            const writeDoc = flatClone(writeRow.document);
            const docInDb = collection.by('_id', id);
            const previous = writeRow.previous ? writeRow.previous : collection.by('_id', id);
            const newRevHeight = previous ? parseRevision(previous._rev).height + 1 : 1;
            const newRevision = newRevHeight + '-' + createRevision(writeRow.document, true);
            writeDoc._rev = newRevision;
            if (docInDb) {
                if (
                    !writeRow.previous ||
                    docInDb._rev !== writeRow.previous._rev
                ) {
                    // conflict error
                    const err: RxStorageBulkWriteLocalError<RxDocType> = {
                        isError: true,
                        status: 409,
                        documentId: id,
                        writeRow: writeRow
                    };
                    ret.error.set(id, err);
                    return;
                } else {
                    const toLoki: any = flatClone(writeDoc);
                    toLoki.$loki = docInDb.$loki;
                    collection.update(toLoki);
                }
            } else {
                collection.insert(writeDoc);
            }

            ret.success.set(id, writeDoc);

            const endTime = now();

            let event: ChangeEvent<RxLocalDocumentData<RxDocType>>;
            if (!writeRow.previous) {
                // was insert
                event = {
                    operation: 'INSERT',
                    doc: writeDoc,
                    id: id,
                    previous: null
                };
            } else if (writeRow.document._deleted) {
                // was delete

                // we need to add the new revision to the previous doc
                // so that the eventkey is calculated correctly.
                // Is this a hack? idk.
                const previousDoc = flatClone(writeRow.previous);
                previousDoc._rev = newRevision;

                event = {
                    operation: 'DELETE',
                    doc: null,
                    id,
                    previous: previousDoc
                };
            } else {
                // was update
                event = {
                    operation: 'UPDATE',
                    doc: writeDoc,
                    id: id,
                    previous: writeRow.previous
                };
            }

            if (
                writeRow.document._deleted &&
                (
                    !writeRow.previous ||
                    writeRow.previous._deleted
                )
            ) {
                /**
                 * An already deleted document was added to the storage engine,
                 * do not emit an event because it does not affect anything.
                 */
            } else {
                const doc: RxLocalDocumentData<RxDocType> = event.operation === 'DELETE' ? event.previous as any : event.doc as any;
                const eventId = getLokiEventKey(true, doc._id, doc._rev ? doc._rev : '');
                const storageChangeEvent: RxStorageChangeEvent<RxLocalDocumentData<RxDocType>> = {
                    eventId,
                    documentId: id,
                    change: event,
                    startTime,
                    endTime
                };
                this.changes$.next(storageChangeEvent);
            }

        });


        return ret;
    }
    async findLocalDocumentsById<RxDocType = any>(ids: string[]): Promise<Map<string, RxLocalDocumentData<RxDocType>>> {
        await promiseWait(0);
        const collection = this.internals.collection;

        const ret: Map<string, RxLocalDocumentData<RxDocType>> = new Map();
        ids.forEach(id => {
            const documentInDb = collection.by('_id', id);
            if (
                documentInDb &&
                !documentInDb._deleted
            ) {
                ret.set(id, documentInDb);
            }
        });
        return ret;
    }
    changeStream(): Observable<RxStorageChangeEvent<RxLocalDocumentData<{ [key: string]: any; }>>> {
        return this.changes$.asObservable();
    }
    async close(): Promise<void> {
        this.changes$.complete();
        OPEN_LOKIJS_STORAGE_INSTANCES.delete(this);
        await closeLokiCollections(
            this.databaseName,
            [
                this.internals.collection,
                this.internals.changesCollection
            ]
        );
    }
    async remove(): Promise<void> {
        this.internals.loki.removeCollection(this.collectionName + CHANGES_LOCAL_SUFFIX);
        this.internals.loki.removeCollection(this.internals.changesCollection.name);
    }
}
