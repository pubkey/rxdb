import type { DeepReadonly, RxDocumentData, RxDocumentMeta, StringKeys, WithDeleted, WithDeletedAndAttachments } from '../../types/index.d.ts';
/**
 * We use 1 as minimum so that the value is never falsy.
 * This const is used in several places because querying
 * with a value lower then the minimum could give false results.
 */
export declare const RX_META_LWT_MINIMUM = 1;
export declare function getDefaultRxDocumentMeta(): RxDocumentMeta;
/**
 * Returns a revision that is not valid.
 * Use this to have correct typings
 * while the storage wrapper anyway will overwrite the revision.
 */
export declare function getDefaultRevision(): string;
export declare function stripMetaDataFromDocument<RxDocType>(docData: RxDocumentData<RxDocType>): RxDocType;
/**
 * Faster way to check the equality of document lists
 * compared to doing a deep-equal.
 * Here we only check the ids and revisions.
 */
export declare function areRxDocumentArraysEqual<RxDocType>(primaryPath: StringKeys<RxDocumentData<RxDocType>>, ar1: RxDocumentData<RxDocType>[], ar2: RxDocumentData<RxDocType>[]): boolean;
export declare function getSortDocumentsByLastWriteTimeComparator<RxDocType>(primaryPath: string): (a: RxDocumentData<RxDocType>, b: RxDocumentData<RxDocType>) => number;
export declare function sortDocumentsByLastWriteTime<RxDocType>(primaryPath: string, docs: RxDocumentData<RxDocType>[]): RxDocumentData<RxDocType>[];
type AnyDocFormat<RxDocType> = RxDocType | WithDeleted<RxDocType> | RxDocumentData<RxDocType> | WithDeletedAndAttachments<RxDocType>;
export declare function toWithDeleted<RxDocType>(docData: AnyDocFormat<RxDocType> | DeepReadonly<AnyDocFormat<RxDocType>>): WithDeleted<RxDocType>;
export {};
