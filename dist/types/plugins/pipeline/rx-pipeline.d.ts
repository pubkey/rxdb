import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import type { InternalStoreDocType, RxCollection, RxDocumentData } from '../../types';
import type { CheckpointDocData, RxPipelineHandler, RxPipelineOptions } from './types';
export declare const RX_PIPELINE_CHECKPOINT_CONTEXT = "rx-pipeline-checkpoint";
export declare class RxPipeline<RxDocType> {
    readonly identifier: string;
    readonly source: RxCollection<RxDocType>;
    readonly destination: RxCollection<any>;
    readonly handler: RxPipelineHandler<RxDocType>;
    readonly batchSize: number;
    processQueue: Promise<void>;
    subs: Subscription[];
    stopped: boolean;
    toRun: number;
    checkpointId: string;
    lastSourceDocTime: BehaviorSubject<number>;
    lastProcessedDocTime: BehaviorSubject<number>;
    somethingChanged: Subject<unknown>;
    secretFunctionName: string;
    waitBeforeWriteFn: () => Promise<void>;
    constructor(identifier: string, source: RxCollection<RxDocType>, destination: RxCollection<any>, handler: RxPipelineHandler<RxDocType>, batchSize?: number);
    trigger(): void;
    awaitIdle(): Promise<void>;
    destroy(): Promise<void>;
    /**
     * Remove the pipeline and all metadata which it has stored
     */
    remove(): Promise<void>;
}
export declare function getCheckpointDoc<RxDocType>(pipeline: RxPipeline<RxDocType>): Promise<RxDocumentData<InternalStoreDocType<CheckpointDocData>> | undefined>;
export declare function setCheckpointDoc<RxDocType>(pipeline: RxPipeline<RxDocType>, newCheckpoint: CheckpointDocData, previous?: RxDocumentData<InternalStoreDocType>): Promise<void>;
export declare function addPipeline<RxDocType>(this: RxCollection<RxDocType>, options: RxPipelineOptions<RxDocType>): Promise<RxPipeline<RxDocType>>;
