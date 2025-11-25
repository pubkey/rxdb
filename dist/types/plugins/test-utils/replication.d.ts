import { Observable } from 'rxjs';
import type { ReplicationPullHandler, ReplicationPushHandler, RxCollection, RxReplicationPullStreamItem } from '../../types';
/**
 * Creates a pull handler that always returns
 * all documents.
*/
export declare function getPullHandler<RxDocType, CheckpointType>(remoteCollection: RxCollection<RxDocType, {}, {}, {}>): ReplicationPullHandler<RxDocType, CheckpointType>;
export declare function getPullStream<RxDocType>(remoteCollection: RxCollection<RxDocType, {}, {}, {}>): Observable<RxReplicationPullStreamItem<RxDocType, any>>;
export declare function getPushHandler<RxDocType>(remoteCollection: RxCollection<RxDocType, {}, {}, {}>): ReplicationPushHandler<RxDocType>;
export declare function ensureEqualState<RxDocType>(collectionA: RxCollection<RxDocType>, collectionB: RxCollection<RxDocType>, context?: string): Promise<void>;
