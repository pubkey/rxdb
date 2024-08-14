import { RxQueryBase } from './rx-query.ts';
import type { RxDocument, RxDocumentData } from './types';
/**
 * RxDB needs the query results in multiple formats.
 * Sometimes as a Map or an array with only the documentData.
 * For better performance we work with this class
 * that initializes stuff lazily so that
 * we can directly work with the query results after RxQuery.exec()
 */
export declare class RxQuerySingleResult<RxDocType> {
    readonly query: RxQueryBase<RxDocType, unknown>;
    readonly count: number;
    /**
     * Time at which the current _result state was created.
     * Used to determine if the result set has changed since X
     * so that we do not emit the same result multiple times on subscription.
     */
    readonly time: number;
    readonly documents: RxDocument<RxDocType>[];
    constructor(query: RxQueryBase<RxDocType, unknown>, docsDataFromStorageInstance: RxDocumentData<RxDocType>[], count: number);
    /**
     * Instead of using the newResultData in the result cache,
     * we directly use the objects that are stored in the RxDocument
     * to ensure we do not store the same data twice and fill up the memory.
     * @overwrites itself with the actual value
     */
    get docsData(): RxDocumentData<RxDocType>[];
    get docsDataMap(): Map<string, RxDocumentData<RxDocType>>;
    get docsMap(): Map<string, RxDocument<RxDocType>>;
    getValue(throwIfMissing?: boolean): number | RxDocument<RxDocType> | RxDocument<RxDocType>[] | Map<string, RxDocument<RxDocType>> | null;
}
