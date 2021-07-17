import {
    hash
} from '../../util';

export const GRAPHQL_REPLICATION_PLUGIN_IDENT = 'rxdbreplicationgraphql';

// does nothing
export const DEFAULT_MODIFIER = (d: any) => Promise.resolve(d);

/**
 * Returns a new revision key without the revision height.
 * The revision is crafted for the graphql replication
 * and contains the information that this document data was pulled
 * from the remote server and not saved by the client.
 */
export function createRevisionForPulledDocument(
    endpointHash: string,
    doc: any
) {
    const dataHash = hash(doc);

    const ret =
        dataHash.substring(0, 8) +
        endpointHash.substring(0, 8) +
        GRAPHQL_REPLICATION_PLUGIN_IDENT;

    return ret;
}

export function wasRevisionfromPullReplication(
    endpointHash: string,
    revision: string
) {
    const ending = endpointHash.substring(0, 8) + GRAPHQL_REPLICATION_PLUGIN_IDENT;
    const ret = revision.endsWith(ending);
    return ret;
}
