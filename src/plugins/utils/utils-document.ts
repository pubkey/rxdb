import type {
    DeepReadonly,
    RxDocumentData,
    RxDocumentMeta,
    StringKeys,
    WithDeleted,
    WithDeletedAndAttachments
} from '../../types/index.d.ts';
import { flatClone } from './utils-object.ts';
/**
 * We use 1 as minimum so that the value is never falsy.
 * This const is used in several places because querying
 * with a value lower then the minimum could give false results.
 */
export const RX_META_LWT_MINIMUM = 1;

export function getDefaultRxDocumentMeta(): RxDocumentMeta {
    return {
        /**
         * Set this to 1 to not waste performance
         * while calling new Date()..
         * The storage wrappers will anyway update
         * the lastWrite time while calling transformDocumentDataFromRxDBToRxStorage()
         */
        lwt: RX_META_LWT_MINIMUM
    };
}

/**
 * Returns a revision that is not valid.
 * Use this to have correct typings
 * while the storage wrapper anyway will overwrite the revision.
 */
export function getDefaultRevision(): string {
    /**
     * Use a non-valid revision format,
     * to ensure that the RxStorage will throw
     * when the revision is not replaced downstream.
     */
    return '';
}


export function stripMetaDataFromDocument<RxDocType>(docData: RxDocumentData<RxDocType>): RxDocType {
    return Object.assign({}, docData, {
        _meta: undefined,
        _deleted: undefined,
        _rev: undefined
    });
}


/**
 * Faster way to check the equality of document lists
 * compared to doing a deep-equal.
 * Here we only check the ids and revisions.
 */
export function areRxDocumentArraysEqual<RxDocType>(
    primaryPath: StringKeys<RxDocumentData<RxDocType>>,
    ar1: RxDocumentData<RxDocType>[],
    ar2: RxDocumentData<RxDocType>[]
): boolean {
    if (ar1.length !== ar2.length) {
        return false;
    }
    let i = 0;
    const len = ar1.length;
    while (i < len) {
        const row1 = ar1[i];
        const row2 = ar2[i];
        i++;

        if (
            row1[primaryPath] !== row2[primaryPath] ||
            row1._rev !== row2._rev ||
            row1._meta.lwt !== row2._meta.lwt
        ) {
            return false;
        }
    }
    return true;
}



export function getSortDocumentsByLastWriteTimeComparator<RxDocType>(primaryPath: string) {
    return (a: RxDocumentData<RxDocType>, b: RxDocumentData<RxDocType>) => {
        if (a._meta.lwt === b._meta.lwt) {
            if ((b as any)[primaryPath] < (a as any)[primaryPath]) {
                return 1;
            } else {
                return -1;
            }
        } else {
            return a._meta.lwt - b._meta.lwt;
        }
    };
}
export function sortDocumentsByLastWriteTime<RxDocType>(
    primaryPath: string,
    docs: RxDocumentData<RxDocType>[]
): RxDocumentData<RxDocType>[] {
    return docs.sort(getSortDocumentsByLastWriteTimeComparator(primaryPath));
}

type AnyDocFormat<RxDocType> = RxDocType | WithDeleted<RxDocType> | RxDocumentData<RxDocType> | WithDeletedAndAttachments<RxDocType>;
export function toWithDeleted<RxDocType>(
    docData: AnyDocFormat<RxDocType> | DeepReadonly<AnyDocFormat<RxDocType>>
): WithDeleted<RxDocType> {
    docData = flatClone(docData);
    (docData as any)._deleted = !!(docData as any)._deleted;
    return Object.assign(docData as any, {
        _attachments: undefined,
        _meta: undefined,
        _rev: undefined
    }) as any;
}
