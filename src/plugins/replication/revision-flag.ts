/**
 * The replication handler needs to know
 * which local documents have been lastly written locally
 * and which came from the remote.
 * To determine this, we 'flag' the document
 * by setting a specially crafted revision string.
 */

import type { DeepReadonly, RxDocumentData, RxDocumentWriteData } from '../../types';
import {
    parseRevision
} from '../../util';

export function getPullReplicationFlag(
    replicationIdentifierHash: string
) {
    return 'rep-' + replicationIdentifierHash;
}

/**
 * Sets the pull replication flag to the _meta
 * to contain the next revision height.
 * Used to identify the document as 'pulled-from-remote'
 * so we do not send it to remote again.
 */
export function setLastWritePullReplication<RxDocType>(
    replicationIdentifierHash: string,
    documentData: RxDocumentData<RxDocType> | RxDocumentWriteData<RxDocType>,
    /**
     * Height of the revision
     * with which the pull flag will be saved.
     */
    revisionHeight: number
) {
    documentData._meta[getPullReplicationFlag(replicationIdentifierHash)] = revisionHeight;
}

export function wasLastWriteFromPullReplication<RxDocType>(
    replicationIdentifierHash: string,
    documentData: RxDocumentData<RxDocType> | DeepReadonly<RxDocumentData<RxDocType>>
): boolean {
    const lastRevision = parseRevision(documentData._rev);
    const replicationFlagValue: number | undefined = documentData._meta[getPullReplicationFlag(replicationIdentifierHash)] as any;

    if (
        replicationFlagValue &&
        lastRevision.height === replicationFlagValue
    ) {
        return true;
    } else {
        return false;
    }
}
