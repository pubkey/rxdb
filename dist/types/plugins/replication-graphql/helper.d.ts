import type { RxCollection } from '../../types';
export declare const PLUGIN_IDENT = "rxdbreplicationgraphql";
export declare const DEFAULT_MODIFIER: (d: any) => Promise<any>;
/**
 * pouchdb will throw if a document is not found
 * this instead return null
 */
export declare function getDocFromPouchOrNull(collection: RxCollection, id: string): Promise<any>;
/**
 *
 * @return  revisions and docs, indexed by id
 */
export declare function getDocsWithRevisionsFromPouch(collection: RxCollection, docIds: string[]): Promise<{
    [k: string]: {
        deleted: boolean;
        revisions: {
            start: number;
            ids: string[];
        };
        doc: any;
    };
}>;
export declare function createRevisionForPulledDocument(endpointHash: string, doc: any): string;
export declare function wasRevisionfromPullReplication(endpointHash: string, revision: string): boolean;
