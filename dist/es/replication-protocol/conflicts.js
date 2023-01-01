import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import deepEqual from 'fast-deep-equal';
import { getDefaultRevision, createRevision, now, flatClone } from '../plugins/utils';
export var defaultConflictHandler = function defaultConflictHandler(i, _context) {
  /**
   * If the documents are deep equal,
   * we have no conflict.
   * On your custom conflict handler you might only
   * check some properties, like the updatedAt time,
   * for better performance, because deepEqual is expensive.
   */
  if (deepEqual(i.newDocumentState, i.realMasterState)) {
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
export function resolveConflictError(_x, _x2, _x3) {
  return _resolveConflictError.apply(this, arguments);
}
function _resolveConflictError() {
  _resolveConflictError = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(state, input, forkState) {
    var conflictHandler, conflictHandlerOutput, resolvedDoc;
    return _regeneratorRuntime.wrap(function _callee$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          conflictHandler = state.input.conflictHandler;
          _context2.next = 3;
          return conflictHandler(input, 'replication-resolve-conflict');
        case 3:
          conflictHandlerOutput = _context2.sent;
          if (!conflictHandlerOutput.isEqual) {
            _context2.next = 8;
            break;
          }
          return _context2.abrupt("return", undefined);
        case 8:
          /**
           * We have a resolved conflict,
           * use the resolved document data.
           */
          resolvedDoc = Object.assign({}, conflictHandlerOutput.documentData, {
            /**
             * Because the resolved conflict is written to the fork,
             * we have to keep/update the forks _meta data, not the masters.
             */
            _meta: flatClone(forkState._meta),
            _rev: getDefaultRevision(),
            _attachments: flatClone(forkState._attachments)
          });
          resolvedDoc._meta.lwt = now();
          resolvedDoc._rev = createRevision(state.input.identifier, forkState);
          return _context2.abrupt("return", {
            resolvedDoc: resolvedDoc,
            output: conflictHandlerOutput
          });
        case 12:
        case "end":
          return _context2.stop();
      }
    }, _callee);
  }));
  return _resolveConflictError.apply(this, arguments);
}
//# sourceMappingURL=conflicts.js.map