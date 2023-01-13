import type {
    RxDocumentData
} from '../../types';

export function parseRevision(revision: string): { height: number; hash: string; } {
    const split = revision.split('-');
    if (split.length !== 2) {
        throw new Error('malformated revision: ' + revision);
    }
    return {
        height: parseInt(split[0], 10),
        hash: split[1]
    };
}

/**
 * @hotPath
 */
export function getHeightOfRevision(revision: string): number {
    const ret = parseInt(revision.split('-')[0], 10);
    return ret;
}


/**
 * Creates the next write revision for a given document.
 */
export function createRevision<RxDocType>(
    databaseInstanceToken: string,
    previousDocData?: RxDocumentData<RxDocType>
): string {
    const previousRevision = previousDocData ? previousDocData._rev : null;
    const previousRevisionHeigth = previousRevision ? parseRevision(previousRevision).height : 0;
    const newRevisionHeight = previousRevisionHeigth + 1;
    return newRevisionHeight + '-' + databaseInstanceToken;
}

