import type { RxCollection, WithDeleted } from '../../types/index.d.ts';
import type { RxReplicationState } from './index.ts';
export declare const DEFAULT_MODIFIER: (d: any) => Promise<any>;
export declare function swapDefaultDeletedTodeletedField<RxDocType>(deletedField: string, doc: WithDeleted<RxDocType>): RxDocType;
/**
 * Must be run over all plain document data
 * that was pulled from the remote.
 * Used to fill up fields or modify the deleted field etc.
 */
export declare function handlePulledDocuments<RxDocType>(collection: RxCollection<RxDocType, unknown, unknown, unknown>, deletedField: string, docs: RxDocType[]): WithDeleted<RxDocType>[];
/**
 * Like normal promiseWait()
 * but will skip the wait time if the online-state changes.
 */
export declare function awaitRetry(collection: RxCollection<any, any, any>, retryTime: number): any;
/**
 * When a replication is running and the leading tab get hibernated
 * by the browser, the replication will be stuck.
 * To prevent this, we fire a mouseeven each X seconds while the replication is not canceled.
 *
 * If you find a better way to prevent hibernation, please make a pull request.
 */
export declare function preventHibernateBrowserTab(replicationState: RxReplicationState<any, any>): void;
