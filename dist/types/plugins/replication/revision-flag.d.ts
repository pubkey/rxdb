/**
 * The replication handler needs to know
 * which local documents have been lastly written locally
 * and which came from the remote.
 * To determine this, we 'flag' the document
 * by setting a specially crafted revision string.
 */
/**
 * Returns a new revision key without the revision height.
 * The revision is crafted for the graphql replication
 * and contains the information that this document data was pulled
 * from the remote server and not saved by the client.
 */
export declare function createRevisionForPulledDocument(replicationIdentifier: string, doc: any): string;
export declare function wasRevisionfromPullReplication(replicationIdentifier: string, revision: string): boolean;
