import {
    hash
} from '../../util';
import type {
    RxCollection
} from '../../types';

export const PLUGIN_IDENT = 'rxdbreplicationgraphql';

// does nothing
export const DEFAULT_MODIFIER = (d: any) => Promise.resolve(d);

/**
 * pouchdb will throw if a document is not found
 * this instead return null
 */
export function getDocFromPouchOrNull(
    collection: RxCollection,
    id: string
) {
    return collection.pouch.get(id, {
        open_revs: true
    })
        .then(docData => {
            return docData;
        })
        .catch(() => null);
}



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
    if (docIds.length === 0) return {}; // optimisation shortcut
    const pouch = collection.pouch;
    const allDocs = await pouch.allDocs({
        keys: docIds,
        revs: true,
        deleted: 'ok'
    });
    // console.log('allDocs:');
    // console.log(JSON.stringify(allDocs, null, 2));

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
    // console.log('bulkGetDocs:');
    // console.log(JSON.stringify(bulkGetDocs, null, 2));

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
        PLUGIN_IDENT;

    return ret;
}

export function wasRevisionfromPullReplication(
    endpointHash: string,
    revision: string
) {
    const ending = endpointHash.substring(0, 8) + PLUGIN_IDENT;
    const ret = revision.endsWith(ending);
    return ret;
}
