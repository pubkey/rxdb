import { mapDocumentsDataToCacheDocs } from './doc-cache.ts';
import { now, overwriteGetterForCaching } from './plugins/utils/index.ts';
import { newRxError } from './rx-error.ts';
import { RxQueryBase } from './rx-query.ts';
import type {
    RxDocument,
    RxDocumentData
} from './types';

/**
 * RxDB needs the query results in multiple formats.
 * Sometimes as a Map or an array with only the documentData.
 * For better performance we work with this class
 * that initializes stuff lazily so that
 * we can directly work with the query results after RxQuery.exec()
 */
export class RxQuerySingleResult<RxDocType> {
    /**
     * Time at which the current _result state was created.
     * Used to determine if the result set has changed since X
     * so that we do not emit the same result multiple times on subscription.
     */
    public readonly time = now();
    public readonly documents: RxDocument<RxDocType>[];
    constructor(
        public readonly query: RxQueryBase<RxDocType, unknown>,
        // only used internally, do not use outside, use this.docsData instead
        docsDataFromStorageInstance: RxDocumentData<RxDocType>[],
        // can be overwritten for count-queries
        public readonly count: number,
    ) {
        this.documents = mapDocumentsDataToCacheDocs<RxDocType, any>(this.query.collection._docCache, docsDataFromStorageInstance);
    }


    /**
     * Instead of using the newResultData in the result cache,
     * we directly use the objects that are stored in the RxDocument
     * to ensure we do not store the same data twice and fill up the memory.
     * @overwrites itself with the actual value
     */
    get docsData(): RxDocumentData<RxDocType>[] {
        return overwriteGetterForCaching(
            this,
            'docsData',
            this.documents.map(d => d._data)
        );
    }


    // A key->document map, used in the event reduce optimization.
    get docsDataMap(): Map<string, RxDocumentData<RxDocType>> {
        const map = new Map<string, RxDocumentData<RxDocType>>();
        this.documents.forEach(d => {
            map.set(d.primary, d._data);
        });
        return overwriteGetterForCaching(
            this,
            'docsDataMap',
            map
        );
    }

    get docsMap(): Map<string, RxDocument<RxDocType>> {
        const map = new Map<string, RxDocument<RxDocType>>();
        const documents = this.documents;
        for (let i = 0; i < documents.length; i++) {
            const doc = documents[i];
            map.set(doc.primary, doc);
        }
        return overwriteGetterForCaching(
            this,
            'docsMap',
            map
        );
    }

    getValue(throwIfMissing?: boolean) {
        const op = this.query.op;
        if (op === 'count') {
            return this.count;
        } else if (op === 'findOne') {
            // findOne()-queries emit RxDocument or null
            const doc = this.documents.length === 0 ? null : this.documents[0];
            if (!doc && throwIfMissing) {
                throw newRxError('QU10', {
                    collection: this.query.collection.name,
                    query: this.query.mangoQuery,
                    op
                });
            } else {
                return doc;
            }
        } else if (op === 'findByIds') {
            return this.docsMap;
        } else {
            // find()-queries emit RxDocument[]
            // Flat copy the array so it won't matter if the user modifies it.
            return this.documents.slice(0);
        }
    }
}
