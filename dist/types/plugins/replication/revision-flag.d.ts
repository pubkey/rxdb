/**
 * The replication handler needs to know
 * which local documents have been lastly written locally
 * and which came from the remote.
 * To determine this, we 'flag' the document
 * by setting a specially crafted revision string.
 */
import type { DeepReadonly, RxDocumentData, RxDocumentWriteData } from '../../types';
export declare function getPullReplicationFlag(replicationIdentifierHash: string): string;
/**
 * Sets the pull replication flag to the _meta
 * to contain the next revision height.
 * Used to identify the document as 'pulled-from-remote'
 * so we do not send it to remote again.
 */
export declare function setLastWritePullReplication<RxDocType>(replicationIdentifierHash: string, documentData: RxDocumentData<RxDocType> | RxDocumentWriteData<RxDocType>, 
/**
 * Height of the revision
 * with which the pull flag will be saved.
 */
revisionHeight: number): void;
export declare function wasLastWriteFromPullReplication<RxDocType>(replicationIdentifierHash: string, documentData: RxDocumentData<RxDocType> | DeepReadonly<RxDocumentData<RxDocType>>): boolean;
