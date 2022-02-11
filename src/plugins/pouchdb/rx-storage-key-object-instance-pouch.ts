import { ChangeEvent } from 'event-reduce-js';
import {
    Subject,
    Observable
} from 'rxjs';
import { newRxError } from '../../rx-error';
import type {
    RxStorageKeyObjectInstance,
    RxStorageChangeEvent,
    RxLocalDocumentData,
    BulkWriteLocalRow,
    RxLocalStorageBulkWriteResponse,
    PouchWriteError,
    RxStorageBulkWriteLocalError,
    PouchBulkDocResultRow,
    PouchSettings,
    EventBulk
} from '../../types';
import {
    flatClone,
    getFromMapOrThrow,
    now,
    PROMISE_RESOLVE_VOID,
    randomCouchString
} from '../../util';
import {
    getEventKey,
    localDocumentFromPouch,
    localDocumentToPouch,
    OPEN_POUCHDB_STORAGE_INSTANCES,
    POUCHDB_LOCAL_PREFIX,
    PouchStorageInternals,
    pouchStripLocalFlagFromPrimary
} from './pouchdb-helper';

export class RxStorageKeyObjectInstancePouch implements RxStorageKeyObjectInstance<PouchStorageInternals, PouchSettings> {

    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxLocalDocumentData>>> = new Subject();

    constructor(
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly internals: Readonly<PouchStorageInternals>,
        public readonly options: Readonly<PouchSettings>
    ) {
        OPEN_POUCHDB_STORAGE_INSTANCES.add(this);
    }

    close(): Promise<void> {
        OPEN_POUCHDB_STORAGE_INSTANCES.delete(this);
        // TODO this did not work because a closed pouchdb cannot be recreated in the same process run
        // await this.internals.pouch.close();
        return PROMISE_RESOLVE_VOID;
    }

    async remove() {
        OPEN_POUCHDB_STORAGE_INSTANCES.delete(this);
        await this.internals.pouch.destroy();
    }

    public async bulkWrite<D = any>(
        documentWrites: BulkWriteLocalRow<D>[]
    ): Promise<RxLocalStorageBulkWriteResponse<D>> {
        if (documentWrites.length === 0) {
            throw newRxError('P2', {
                args: {
                    documentWrites
                }
            });
        }

        const writeRowById: Map<string, BulkWriteLocalRow<D>> = new Map();

        const insertDocs: RxLocalDocumentData<D>[] = documentWrites.map(writeRow => {
            writeRowById.set(writeRow.document._id, writeRow);

            /**
             * add local prefix
             * Local documents always have _id as primary
             */
            const storeDocumentData = localDocumentToPouch(writeRow.document);

            // if previous document exists, we have to send the previous revision to pouchdb.
            if (writeRow.previous) {
                storeDocumentData._rev = writeRow.previous._rev;
            }

            return storeDocumentData;
        });

        const startTime = now();
        const pouchResult = await this.internals.pouch.bulkDocs(insertDocs);
        const endTime = now();
        const ret: RxLocalStorageBulkWriteResponse<D> = {
            success: {},
            error: {}
        };

        const eventBulk: EventBulk<RxStorageChangeEvent<RxLocalDocumentData>> = {
            id: randomCouchString(10),
            events: []
        };

        pouchResult.forEach(resultRow => {
            resultRow.id = pouchStripLocalFlagFromPrimary(resultRow.id);
            const writeRow = getFromMapOrThrow(writeRowById, resultRow.id);
            if ((resultRow as PouchWriteError).error) {
                const err: RxStorageBulkWriteLocalError<D> = {
                    isError: true,
                    status: 409,
                    documentId: resultRow.id,
                    writeRow
                };
                ret.error[resultRow.id] = err;
            } else {
                const pushObj: RxLocalDocumentData<D> = flatClone(writeRow.document);
                pushObj._rev = (resultRow as PouchBulkDocResultRow).rev;
                // local document cannot have attachments
                pushObj._attachments = {};
                ret.success[resultRow.id] = pushObj;

                /**
                 * Emit a write event to the changestream.
                 * We do this here and not by observing the internal pouchdb changes
                 * because here we have the previous document data and do
                 * not have to fill previous with 'UNKNOWN'.
                 */
                let event: ChangeEvent<RxLocalDocumentData<D>>;
                if (!writeRow.previous) {
                    // was insert
                    event = {
                        operation: 'INSERT',
                        doc: pushObj,
                        id: resultRow.id,
                        previous: null
                    };
                } else if (writeRow.document._deleted) {
                    // was delete

                    // we need to add the new revision to the previous doc
                    // so that the eventkey is calculated correctly.
                    // Is this a hack? idk.
                    const previousDoc = flatClone(writeRow.previous);
                    previousDoc._rev = (resultRow as PouchBulkDocResultRow).rev;

                    event = {
                        operation: 'DELETE',
                        doc: null,
                        id: resultRow.id,
                        previous: previousDoc
                    };
                } else {
                    // was update
                    event = {
                        operation: 'UPDATE',
                        doc: pushObj,
                        id: resultRow.id,
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
                     * A deleted document was newly added to the storage engine,
                     * do not emit an event.
                     */
                } else {

                    const doc: RxLocalDocumentData<D> = event.operation === 'DELETE' ? event.previous as any : event.doc as any;
                    const eventId = getEventKey(true, doc._id, doc._rev ? doc._rev : '');

                    const storageChangeEvent: RxStorageChangeEvent<RxLocalDocumentData<D>> = {
                        eventId,
                        documentId: resultRow.id,
                        change: event,
                        startTime,
                        endTime
                    };


                    eventBulk.events.push(storageChangeEvent);
                }

            }


        });

        this.changes$.next(eventBulk);
        return ret;
    }

    async findLocalDocumentsById<D = any>(
        ids: string[],
        withDeleted: boolean
    ): Promise<{ [documentId: string]: RxLocalDocumentData<D> }> {
        const pouch = this.internals.pouch;
        const pouchIds = ids.map(id => POUCHDB_LOCAL_PREFIX + id);
        const ret: { [documentId: string]: RxLocalDocumentData<D> } = {};

        /**
         * Pouchdb is not able to bulk-request local documents
         * with the pouch.allDocs() method.
         * so we need to get each by a single call.
         * TODO create an issue at the pouchdb repo
         */
        await Promise.all(
            pouchIds.map(async (pouchId) => {
                try {
                    let docData = await pouch.get(pouchId);
                    docData = localDocumentFromPouch(docData);
                    if (
                        withDeleted ||
                        !docData._deleted
                    ) {
                        ret[docData._id] = docData;
                    }
                } catch (err) {
                    // do not add to result list on error
                }
            })
        );
        return ret;
    }

    changeStream(): Observable<EventBulk<RxStorageChangeEvent<RxLocalDocumentData>>> {
        return this.changes$.asObservable();
    }
}
