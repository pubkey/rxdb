import type { RxDocumentData } from '../../types/index.d.ts';
/**
 * Parses the full revision.
 * Do NOT use this if you only need the revision height,
 * then use getHeightOfRevision() instead which is faster.
 */
export declare function parseRevision(revision: string): {
    height: number;
    hash: string;
};
/**
 * @hotPath Performance is very important here
 * because we need to parse the revision height very often.
 * Do not use `parseInt(revision.split('-')[0], 10)` because
 * only fetching the start-number chars is faster.
 */
export declare function getHeightOfRevision(revision: string): number;
/**
 * Creates the next write revision for a given document.
 */
export declare function createRevision<RxDocType>(databaseInstanceToken: string, previousDocData?: RxDocumentData<RxDocType>): string;
