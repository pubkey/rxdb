"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defaultConflictHandler = void 0;
exports.resolveConflictError = resolveConflictError;
var _index = require("../plugins/utils/index.js");
var _rxStorageHelper = require("../rx-storage-helper.js");
var defaultConflictHandler = function (i, _context) {
  var newDocumentState = (0, _rxStorageHelper.stripAttachmentsDataFromDocument)(i.newDocumentState);
  var realMasterState = (0, _rxStorageHelper.stripAttachmentsDataFromDocument)(i.realMasterState);

  /**
   * If the documents are deep equal,
   * we have no conflict.
   * On your custom conflict handler you might only
   * check some properties, like the updatedAt time,
   * for better performance, because deepEqual is expensive.
   */
  if ((0, _index.deepEqual)(newDocumentState, realMasterState)) {
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
exports.defaultConflictHandler = defaultConflictHandler;
async function resolveConflictError(state, input, forkState) {
  var conflictHandler = state.input.conflictHandler;
  var conflictHandlerOutput = await conflictHandler(input, 'replication-resolve-conflict');
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
    var resolvedDoc = Object.assign({}, conflictHandlerOutput.documentData, {
      /**
       * Because the resolved conflict is written to the fork,
       * we have to keep/update the forks _meta data, not the masters.
       */
      _meta: (0, _index.flatClone)(forkState._meta),
      _rev: (0, _index.getDefaultRevision)(),
      _attachments: (0, _index.flatClone)(forkState._attachments)
    });
    resolvedDoc._meta.lwt = (0, _index.now)();
    resolvedDoc._rev = (0, _index.createRevision)(await state.checkpointKey, forkState);
    return {
      resolvedDoc,
      output: conflictHandlerOutput
    };
  }
}
//# sourceMappingURL=conflicts.js.map