import { WithDeleted } from './rx-storage';

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
export type RxConflictHandlerOutput<RxDocType> = {
    documentData: WithDeleted<RxDocType>;
};

export type RxConflictHandler<RxDocType> = (
    i: RxConflictHandlerInput<RxDocType>,
    context: string
) => Promise<RxConflictHandlerOutput<RxDocType>>;

export type RxConflictResultionTask<RxDocType> = {
    /**
     * Unique id for that single task.
     */
    id: string;
    /**
     * Tasks must have a context
     * which makes it easy to filter/identify them again
     * with plugins or other hacky stuff.
     */
    context: string;
    input: RxConflictHandlerInput<RxDocType>;
};


export type RxConflictResultionTaskSolution<RxDocType> = {
    /**
     * Id of the RxConflictResultionTask
     */
    id: string;
    output: RxConflictHandlerOutput<RxDocType>;
};
