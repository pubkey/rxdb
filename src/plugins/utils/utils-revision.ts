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
 * Do not use `parseInt(revision.split('-')[0], 10)` because
 * only fetching the start-number chars is faster.
 */
export function getHeightOfRevision(revision: string): number {
    let useChars = '';
    for (let index = 0; index < revision.length; index++) {
        const char = revision[index];
        if (char === '-') {
            return parseInt(useChars, 10);
        }
        useChars += char;
    }
    throw new Error('malformatted revision: ' + revision);
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

