import type {
    RxConflictHandler,
    RxConflictHandlerInput,
    RxConflictHandlerOutput,
    RxDocumentData,
    RxStorageInstanceReplicationState
} from '../types';
import {
    getDefaultRevision,
    createRevision,
    now,
    flatClone,
    deepEqual
} from '../plugins/utils';

export const defaultConflictHandler: RxConflictHandler<any> = function (
    i: RxConflictHandlerInput<any>,
    _context: string
): Promise<RxConflictHandlerOutput<any>> {
    /**
     * If the documents are deep equal,
     * we have no conflict.
     * On your custom conflict handler you might only
     * check some properties, like the updatedAt time,
     * for better performance, because deepEqual is expensive.
     */
    if (deepEqual(
        i.newDocumentState,
        i.realMasterState
    )) {
        return Promise.resolve({
            isEqual: true
        });
    }

    /**
     * The default conflict handler will always
     * drop the fork state and use the master state instead.
     */
    return Promise.resolve({
        isEqual: false,
        documentData: i.realMasterState
    });
};


/**
 * Resolves a conflict error or determines that the given document states are equal.
 * Returns the resolved document that must be written to the fork.
 * Then the new document state can be pushed upstream.
 * If document is not in conflict, returns undefined.
 * If error is non-409, it throws an error.
 * Conflicts are only solved in the upstream, never in the downstream.
 */
export async function resolveConflictError<RxDocType>(
    state: RxStorageInstanceReplicationState<RxDocType>,
    input: RxConflictHandlerInput<RxDocType>,
    forkState: RxDocumentData<RxDocType>
): Promise<{
    resolvedDoc: RxDocumentData<RxDocType>;
    output: RxConflictHandlerOutput<RxDocType>;
} | undefined> {
    const conflictHandler: RxConflictHandler<RxDocType> = state.input.conflictHandler;
    const conflictHandlerOutput = await conflictHandler(input, 'replication-resolve-conflict');

    if (conflictHandlerOutput.isEqual) {
        /**
         * Documents are equal,
         * so this is not a conflict -> do nothing.
         */
        return undefined;
    } else {
        /**
         * We have a resolved conflict,
         * use the resolved document data.
         */
        const resolvedDoc: RxDocumentData<RxDocType> = Object.assign(
            {},
            conflictHandlerOutput.documentData,
            {
                /**
                 * Because the resolved conflict is written to the fork,
                 * we have to keep/update the forks _meta data, not the masters.
                 */
                _meta: flatClone(forkState._meta),
                _rev: getDefaultRevision(),
                _attachments: flatClone(forkState._attachments)
            }
        );
        resolvedDoc._meta.lwt = now();
        resolvedDoc._rev = createRevision(
            state.input.identifier,
            forkState
        );
        return {
            resolvedDoc,
            output: conflictHandlerOutput
        };
    }
}
