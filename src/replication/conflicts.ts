import { ensureNotFalsy, flatClone } from 'event-reduce-js';
import { now } from 'oblivious-set';
import type {
    RxConflictHandler,
    RxConflictHandlerInput,
    RxConflictHandlerOutput,
    RxDocumentData,
    RxStorageBulkWriteError
} from '../types';
import { getDefaultRevision, createRevision } from '../util';

export const defaultConflictHandler: RxConflictHandler<any> = async function (
    i: RxConflictHandlerInput<any>,
    _context: string
): Promise<RxConflictHandlerOutput<any>> {
    /**
     * The default conflict handler will always
     * drop the fork state and use the master state instead.
     */
    return {
        documentData: i.realMasterState
    };
}


/**
 * Resolves a conflict error.
 * Returns the resolved document that must be written to the fork.
 * Then the new document state can be pushed upstream.
 * If document is not in conflict, returns undefined.
 * If error is non-409, it throws an error.
 * Conflicts are only solved in the upstream, never in the downstream.
 */
export async function resolveConflictError<RxDocType>(
    conflictHandler: RxConflictHandler<RxDocType>,
    error: RxStorageBulkWriteError<RxDocType>
): Promise<RxDocumentData<RxDocType> | undefined> {
    if (error.status !== 409) {
        /**
         * If this ever happens,
         * make a PR with a unit test to reproduce it.
         */
        throw new Error('Non conflict error');
    }
    const documentInDb = ensureNotFalsy(error.documentInDb);
    if (documentInDb._rev === error.writeRow.document._rev) {
        /**
         * Documents are equal,
         * so this is not a conflict -> do nothing.
         */
        return undefined;
    } else {
        /**
         * We have a conflict, resolve it!
         */
        const conflictHandlerOutput = await conflictHandler({
            assumedMasterState: error.writeRow.previous,
            newDocumentState: error.writeRow.document,
            realMasterState: documentInDb
        }, 'rx-storage-replication');

        const resolvedDoc: RxDocumentData<RxDocType> = Object.assign(
            {},
            conflictHandlerOutput.documentData,
            {
                /**
                 * Because the resolved conflict is written to the fork,
                 * we have to keep/update the forks _meta data, not the masters.
                 */
                _meta: flatClone(error.writeRow.document._meta),
                _rev: getDefaultRevision(),
                _attachments: flatClone(error.writeRow.document._attachments)
            }
        );
        resolvedDoc._meta.lwt = now();
        resolvedDoc._rev = createRevision(resolvedDoc, error.writeRow.document);
        return resolvedDoc;
    }
}
