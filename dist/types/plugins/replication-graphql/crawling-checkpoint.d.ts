import type { RxCollection, PouchChangeRow, PouchChangeDoc } from '../../types';
/**
 * @return last sequence checkpoint
 */
export declare function getLastPushSequence(collection: RxCollection, endpointHash: string): Promise<number>;
export declare function setLastPushSequence(collection: RxCollection, endpointHash: string, seq: any): Promise<{
    ok: boolean;
    id: string;
    rev: string;
}>;
export declare function getChangesSinceLastPushSequence(collection: RxCollection, endpointHash: string, lastPulledRevField: string, batchSize?: number, syncRevisions?: boolean): Promise<{
    results: (PouchChangeRow & PouchChangeDoc)[];
    last_seq: number;
}>;
export declare function getLastPullDocument(collection: RxCollection, endpointHash: string): Promise<any>;
export declare function setLastPullDocument(collection: RxCollection, endpointHash: string, doc: any): Promise<{
    ok: boolean;
    id: string;
    rev: string;
}>;
