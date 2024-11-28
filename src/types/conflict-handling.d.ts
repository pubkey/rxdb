import type { WithDeleted } from './rx-storage.d.ts';

/**
 * Notice that the conflict handler input/output
 * does not work on RxDocumentData<RxDocType>, but only on WithDeleted<RxDocType>.
 * This is because the _meta attributes are meant for the local storing of document data, they not replicated
 * and therefore cannot be used to resolve conflicts.
 */
export type RxConflictHandlerInput<RxDocType> = {
    assumedMasterState?: WithDeleted<RxDocType>;
    realMasterState: WithDeleted<RxDocType>;
    newDocumentState: WithDeleted<RxDocType>;
};

/**
 * The conflict handler either returns:
 * - The resolved new document state
 * - A flag to identify the given 'realMasterState' and 'newDocumentState'
 *   as being exactly equal, so no conflict has to be resolved.
 */
export type RxConflictHandlerOutput<RxDocType> = {
    isEqual: false;
    documentData: WithDeleted<RxDocType>;
} | {
    isEqual: true;
};

export type RxConflictHandlerOld<RxDocType> = (
    i: RxConflictHandlerInput<RxDocType>,
    context: string
) => Promise<RxConflictHandlerOutput<RxDocType>>;


export type RxConflictHandler<RxDocType> = {
    /**
     * This must be non-async
     * because it will be called very often and must be fast.
     */
    isEqual: (
        a: WithDeleted<RxDocType>,
        b: WithDeleted<RxDocType>,
        context: string
    ) => boolean;
    resolve: (
        i: RxConflictHandlerInput<RxDocType>,
        context: string
    ) => Promise<WithDeleted<RxDocType>>;
};
