"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolveConflictError = exports.defaultConflictHandler = void 0;

var _fastDeepEqual = _interopRequireDefault(require("fast-deep-equal"));

var _util = require("../util");

/**
 * Resolves a conflict error or determines that the given document states are equal.
 * Returns the resolved document that must be written to the fork.
 * Then the new document state can be pushed upstream.
 * If document is not in conflict, returns undefined.
 * If error is non-409, it throws an error.
 * Conflicts are only solved in the upstream, never in the downstream.
 */
var resolveConflictError = function resolveConflictError(state, input, forkState) {
  try {
    var conflictHandler = state.input.conflictHandler;
    return Promise.resolve(conflictHandler(input, 'replication-resolve-conflict')).then(function (conflictHandlerOutput) {
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
          _meta: (0, _util.flatClone)(forkState._meta),
          _rev: (0, _util.getDefaultRevision)(),
          _attachments: (0, _util.flatClone)(forkState._attachments)
        });
        resolvedDoc._meta.lwt = (0, _util.now)();
        resolvedDoc._rev = (0, _util.createRevision)(state.input.hashFunction, resolvedDoc, forkState);
        return {
          resolvedDoc: resolvedDoc,
          output: conflictHandlerOutput
        };
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.resolveConflictError = resolveConflictError;

var defaultConflictHandler = function defaultConflictHandler(i, _context) {
  /**
   * If the documents are deep equal,
   * we have no conflict.
   * On your custom conflict handler you might only
   * check some properties, like the updatedAt time,
   * for better performance, because deepEqual is expensive.
   */
  if ((0, _fastDeepEqual["default"])(i.newDocumentState, i.realMasterState)) {
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

exports.defaultConflictHandler = defaultConflictHandler;
//# sourceMappingURL=conflicts.js.map