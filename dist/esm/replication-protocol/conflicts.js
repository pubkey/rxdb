import { getDefaultRevision, createRevision, now, flatClone } from "../plugins/utils/index.js";

/**
 * Resolves a conflict error or determines that the given document states are equal.
 * Returns the resolved document that must be written to the fork.
 * Then the new document state can be pushed upstream.
 * If document is not in conflict, returns undefined.
 * If error is non-409, it throws an error.
 * Conflicts are only solved in the upstream, never in the downstream.
 */
export async function resolveConflictError(state, input, forkState) {
  var conflictHandler = state.input.conflictHandler;
  var isEqual = conflictHandler.isEqual(input.realMasterState, input.newDocumentState, 'replication-resolve-conflict');
  if (isEqual) {
    /**
     * Documents are equal,
     * so this is not a conflict -> do nothing.
     */
    return undefined;
  } else {
    var resolved = await conflictHandler.resolve(input, 'replication-resolve-conflict');
    /**
     * We have a resolved conflict,
     * use the resolved document data.
     */
    var resolvedDoc = Object.assign({}, resolved, {
      /**
       * Because the resolved conflict is written to the fork,
       * we have to keep/update the forks _meta data, not the masters.
       */
      _meta: flatClone(forkState._meta),
      _rev: getDefaultRevision(),
      _attachments: flatClone(forkState._attachments)
    });
    resolvedDoc._meta.lwt = now();
    resolvedDoc._rev = createRevision(await state.checkpointKey, forkState);
    return resolvedDoc;
  }
}
//# sourceMappingURL=conflicts.js.map