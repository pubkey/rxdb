import {
    hash
} from '../../util';
import type {
    RxCollection
} from '../../types';

export const GRAPHQL_REPLICATION_PLUGIN_IDENT = 'rxdbreplicationgraphql';

// does nothing
export const DEFAULT_MODIFIER = (d: any) => Promise.resolve(d);

/**
 *
 * @return  revisions and docs, indexed by id
 */
export async function getDocsWithRevisionsFromPouch(
    collection: RxCollection,
    docIds: string[]
): Promise<{
    [k: string]: {
        deleted: boolean,
        revisions: { start: number, ids: string[] },
        doc: any
    }
}> {
    if (docIds.length === 0) {
        return {}; // optimisation shortcut
    }



    const pouch = collection.pouch;
    const allDocs = await pouch.allDocs({
        keys: docIds,
        revs: true,
        deleted: 'ok'
    });

    const docsSearch = allDocs.rows
        .filter((row: any) => !row.error)
        .map((row: any) => {
            return {
                id: row.id,
                rev: row.value.rev
            };
        });
    if (docsSearch.length === 0) return {};

    const bulkGetDocs = await pouch.bulkGet({
        docs: docsSearch,
        revs: true,
        latest: true
    });

    const ret: any = {};
    bulkGetDocs.results.forEach((result: any) => {
        const doc = result.docs[0].ok;
        const data = {
            revisions: doc._revisions,
            deleted: !!doc._deleted,
            doc
        };
        ret[result.id] = data;
    });

    return ret;
}

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
