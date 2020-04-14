import { RxCollection } from '../../types';
/**
 * @return last sequence checkpoint
 */
export declare function getLastPushSequence(collection: RxCollection, endpointHash: string): Promise<number>;
export declare function setLastPushSequence(collection: RxCollection, endpointHash: string, seq: any): Promise<any>;
export declare function getChangesSinceLastPushSequence(collection: RxCollection, endpointHash: string, lastPulledRevField: string, batchSize?: number, syncRevisions?: boolean): Promise<{
    results: {
        id: string;
        seq: number;
        changes: {
            rev: string;
        }[];
    }[];
    last_seq: number;
}>;
export declare function getLastPullDocument(collection: RxCollection, endpointHash: string): Promise<any>;
export declare function setLastPullDocument(collection: RxCollection, endpointHash: string, doc: any): Promise<any>;
