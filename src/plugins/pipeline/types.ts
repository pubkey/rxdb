import type {
    MaybePromise,
    RxCollection,
    RxDocument
} from '../../types';


export type RxPipelineHandler<RxDocType> = (
    docs: RxDocument<RxDocType>[]
) => MaybePromise<any>;

export type RxPipelineOptions<RxDocType> = {
    /**
     * The identifier of the pipeline. Used when
     * metadata of the pipeline is stored. Changing the identifier.
     */
    identifier: string;
    destination: RxCollection<any>;
    handler: RxPipelineHandler<RxDocType>;
    waitForLeadership?: boolean;
    batchSize?: number;
}


export type CheckpointDocData<CheckpointType = any> = {
    checkpoint: CheckpointType;
    lastDocTime: number;
};
