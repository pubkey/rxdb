export declare const GRAPHQL_REPLICATION_PLUGIN_IDENT = "rxdbreplicationgraphql";
export declare const DEFAULT_MODIFIER: (d: any) => Promise<any>;
/**
 * Returns a new revision key without the revision height.
 * The revision is crafted for the graphql replication
 * and contains the information that this document data was pulled
 * from the remote server and not saved by the client.
 */
export declare function createRevisionForPulledDocument(endpointHash: string, doc: any): string;
export declare function wasRevisionfromPullReplication(endpointHash: string, revision: string): boolean;
