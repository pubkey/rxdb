import type { RxCollection, WithDeleted } from '../../types/index.d.ts';
export declare const DEFAULT_MODIFIER: (d: any) => Promise<any>;
export declare function swapDefaultDeletedTodeletedField<RxDocType>(deletedField: string, doc: WithDeleted<RxDocType>): RxDocType;
/**
 * Must be run over all plain document data
 * that was pulled from the remote.
 * Used to fill up fields or modify the deleted field etc.
 */
export declare function handlePulledDocuments<RxDocType>(collection: RxCollection<RxDocType>, deletedField: string, docs: RxDocType[]): WithDeleted<RxDocType>[];
/**
 * Like normal promiseWait()
 * but will skip the wait time if the online-state changes.
 */
export declare function awaitRetry(collection: RxCollection, retryTime: number): Promise<void>;
