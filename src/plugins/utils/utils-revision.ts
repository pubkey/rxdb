import type {
    RxDocumentData
} from '../../types/index.d.ts';

/**
 * Parses the full revision.
 * Do NOT use this if you only need the revision height,
 * then use getHeightOfRevision() instead which is faster.
 */
export function parseRevision(revision: string): { height: number; hash: string; } {
    const split = revision.split('-');
    if (split.length !== 2) {
        throw new Error('malformatted revision: ' + revision);
    }
    return {
        height: parseInt(split[0], 10),
        hash: split[1]
    };
}

/**
 * @hotPath Performance is very important here
 * because we need to parse the revision height very often.
 * Uses indexOf + charCodeAt for maximum performance.
 * Single-digit heights (most common) use a fast path
 * that avoids parseInt entirely.
 */
export function getHeightOfRevision(revision: string): number {
    const dashIndex = revision.indexOf('-');
    if (dashIndex === -1) {
        throw new Error('malformatted revision: ' + revision);
    }
    // Fast path for single-digit revision heights (most common case)
    if (dashIndex === 1) {
        return revision.charCodeAt(0) - 48; // 48 is ASCII code for '0'
    }
    return parseInt(revision.substring(0, dashIndex), 10);
}


/**
 * Creates the next write revision for a given document.
 */
export function createRevision<RxDocType>(
    databaseInstanceToken: string,
    previousDocData?: RxDocumentData<RxDocType>
): string {
    const newRevisionHeight = !previousDocData ? 1 : getHeightOfRevision(previousDocData._rev) + 1
    return newRevisionHeight + '-' + databaseInstanceToken;
}

