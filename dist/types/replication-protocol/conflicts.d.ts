import type { RxConflictHandler, RxConflictHandlerInput, RxConflictHandlerOutput, RxDocumentData, RxStorageInstanceReplicationState } from '../types';
export declare const defaultConflictHandler: RxConflictHandler<any>;
/**
 * Resolves a conflict error or determines that the given document states are equal.
 * Returns the resolved document that must be written to the fork.
 * Then the new document state can be pushed upstream.
 * If document is not in conflict, returns undefined.
 * If error is non-409, it throws an error.
 * Conflicts are only solved in the upstream, never in the downstream.
 */
export declare function resolveConflictError<RxDocType>(state: RxStorageInstanceReplicationState<RxDocType>, input: RxConflictHandlerInput<RxDocType>, forkState: RxDocumentData<RxDocType>): Promise<{
    resolvedDoc: RxDocumentData<RxDocType>;
    output: RxConflictHandlerOutput<RxDocType>;
} | undefined>;
