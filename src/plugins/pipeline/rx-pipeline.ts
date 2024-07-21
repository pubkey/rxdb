import { Subscription, filter } from 'rxjs';
import {
    InternalStoreDocType,
    RxCollection,
    RxDocumentData

} from '../../types';
import type {
    RxPipelineHandler,
    RxPipelineOptions
} from './types';
import {
    PROMISE_RESOLVE_VOID,
    clone,
    createRevision,
    now
} from '../utils';
import { getChangedDocumentsSince } from '../../rx-storage-helper';
import { mapDocumentsDataToCacheDocs } from '../../doc-cache';
import { getPrimaryKeyOfInternalDocument } from '../../rx-database-internal-store';
export const RX_PIPELINE_CHECKPOINT_CONTEXT = 'rx-pipeline-checkpoint';


export class RxPipeline<RxDocType> {

    processQueue = PROMISE_RESOLVE_VOID;
    subs: Subscription[] = [];
    stopped: boolean = false;


    toRun = 1;
    checkpointId: string;

    constructor(
        public readonly identifier: string,
        public readonly source: RxCollection<RxDocType>,
        public readonly destination: RxCollection<any>,
        public readonly handler: RxPipelineHandler<RxDocType>,
        public readonly batchSize = 100
    ) {
        this.checkpointId = 'rx-pipeline-' + identifier;
        this.source.onDestroy.push(() => this.destroy());
    }

    trigger() {
        /**
         * Do not stack up too many
         * so that fast writes to the source collection
         * do not block anything too long.
         */
        if (this.toRun > 2) {
            return;
        }
        this.toRun = this.toRun + 1;

        this.processQueue = this.processQueue.then(async () => {
            this.toRun = this.toRun - 1;

            let done = false;
            while (!done) {
                const checkpointDoc = await getCheckpointDoc(this);
                const checkoint = checkpointDoc ? checkpointDoc.data : undefined;
                const docs = await getChangedDocumentsSince(
                    this.source.storageInstance,
                    this.batchSize,
                    checkoint
                );
                const rxDocuments = mapDocumentsDataToCacheDocs(this.source._docCache, docs.documents);
                await this.handler(rxDocuments);
                await setCheckpointDoc(this, checkpointDoc, docs.checkpoint);

                if (docs.documents.length < this.batchSize) {
                    done = true;
                }
            }
        });
    }

    destroy() {
        this.stopped = true;
        this.subs.forEach(s => s.unsubscribe());
    }

    /**
     * Remove the pipeline and all metadata which it has stored
     */
    async remove() {
        const insternalStore = this.destination.database.internalStore;
        const checkpointDoc = await getCheckpointDoc(this);
        if (checkpointDoc) {
            const newDoc: RxDocumentData<InternalStoreDocType> = clone(checkpointDoc);
            newDoc._deleted = true;
            await insternalStore.bulkWrite([{
                previous: checkpointDoc,
                document: newDoc,
            }], RX_PIPELINE_CHECKPOINT_CONTEXT);
        }
        return this.destroy();
    }
}


export async function getCheckpointDoc<RxDocType>(
    pipeline: RxPipeline<RxDocType>
): Promise<RxDocumentData<InternalStoreDocType> | null> {
    const insternalStore = pipeline.destination.database.internalStore;
    const results = await insternalStore.findDocumentsById([pipeline.checkpointId], false);
    const result: RxDocumentData<InternalStoreDocType> = results[0];
    if (result) {
        return result;
    } else {
        return null;
    }
}

export async function setCheckpointDoc<RxDocType>(
    pipeline: RxPipeline<RxDocType>,
    newCheckpoint: any,
    previous?: RxDocumentData<InternalStoreDocType>
): Promise<void> {
    const insternalStore = pipeline.destination.database.internalStore;

    const newDoc: RxDocumentData<InternalStoreDocType> = previous ? clone(previous) : {
        _attachments: {},
        _deleted: false,
        _meta: {
            lwt: now()
        },
        _rev: createRevision(pipeline.destination.database.token),
        context: RX_PIPELINE_CHECKPOINT_CONTEXT,
        data: newCheckpoint,
        id: getPrimaryKeyOfInternalDocument(
            pipeline.checkpointId,
            RX_PIPELINE_CHECKPOINT_CONTEXT
        ),
        key: pipeline.checkpointId
    };

    await insternalStore.bulkWrite([{
        previous,
        document: newDoc,
    }], RX_PIPELINE_CHECKPOINT_CONTEXT);
}

export async function addPipeline<RxDocType>(this: RxCollection<RxDocType>, options: RxPipelineOptions<RxDocType>) {
    const pipeline = new RxPipeline<RxDocType>(
        options.identifier,
        this,
        options.destination,
        options.handler,
        options.batchSize
    );
    const waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;
    const startPromise = waitForLeadership ? this.database.waitForLeadership() : PROMISE_RESOLVE_VOID;
    startPromise.then(() => {
        pipeline.subs.push(
            this.database.eventBulks$.pipe(
                filter(changeEventBulk => changeEventBulk.collectionName === this.name),
                filter(bulk => {
                    if (pipeline.stopped) {
                        return false;
                    }
                    const first = bulk.events[0];
                    return !first.isLocal;
                })
            ).subscribe(() => pipeline.trigger())
        );
    });

    return pipeline;
}
