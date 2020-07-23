"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDocFromPouchOrNull = getDocFromPouchOrNull;
exports.getDocsWithRevisionsFromPouch = getDocsWithRevisionsFromPouch;
exports.createRevisionForPulledDocument = createRevisionForPulledDocument;
exports.wasRevisionfromPullReplication = wasRevisionfromPullReplication;
exports.DEFAULT_MODIFIER = exports.PLUGIN_IDENT = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _util = require("../../util");

var PLUGIN_IDENT = 'rxdbreplicationgraphql'; // does nothing

exports.PLUGIN_IDENT = PLUGIN_IDENT;

var DEFAULT_MODIFIER = function DEFAULT_MODIFIER(d) {
  return Promise.resolve(d);
};
/**
 * pouchdb will throw if a document is not found
 * this instead return null
 */


exports.DEFAULT_MODIFIER = DEFAULT_MODIFIER;

function getDocFromPouchOrNull(collection, id) {
  return collection.pouch.get(id, {
    open_revs: true
  }).then(function (docData) {
    return docData;
  })["catch"](function () {
    return null;
  });
}
/**
 *
 * @return  revisions and docs, indexed by id
 */


function getDocsWithRevisionsFromPouch(_x, _x2) {
  return _getDocsWithRevisionsFromPouch.apply(this, arguments);
}

function _getDocsWithRevisionsFromPouch() {
  _getDocsWithRevisionsFromPouch = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(collection, docIds) {
    var pouch, allDocs, docsSearch, bulkGetDocs, ret;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (!(docIds.length === 0)) {
              _context.next = 2;
              break;
            }

            return _context.abrupt("return", {});

          case 2:
            // optimisation shortcut
            pouch = collection.pouch;
            _context.next = 5;
            return pouch.allDocs({
              keys: docIds,
              revs: true,
              deleted: 'ok'
            });

          case 5:
            allDocs = _context.sent;
            // console.log('allDocs:');
            // console.log(JSON.stringify(allDocs, null, 2));
            docsSearch = allDocs.rows.filter(function (row) {
              return !row.error;
            }).map(function (row) {
              return {
                id: row.id,
                rev: row.value.rev
              };
            });

            if (!(docsSearch.length === 0)) {
              _context.next = 9;
              break;
            }

            return _context.abrupt("return", {});

          case 9:
            _context.next = 11;
            return pouch.bulkGet({
              docs: docsSearch,
              revs: true,
              latest: true
            });

          case 11:
            bulkGetDocs = _context.sent;
            // console.log('bulkGetDocs:');
            // console.log(JSON.stringify(bulkGetDocs, null, 2));
            ret = {};
            bulkGetDocs.results.forEach(function (result) {
              var doc = result.docs[0].ok;
              var data = {
                revisions: doc._revisions,
                deleted: !!doc._deleted,
                doc: doc
              };
              ret[result.id] = data;
            });
            return _context.abrupt("return", ret);

          case 15:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _getDocsWithRevisionsFromPouch.apply(this, arguments);
}

function createRevisionForPulledDocument(endpointHash, doc) {
  var dataHash = (0, _util.hash)(doc);
  var ret = dataHash.substring(0, 8) + endpointHash.substring(0, 8) + PLUGIN_IDENT;
  return ret;
}

function wasRevisionfromPullReplication(endpointHash, revision) {
  var ending = endpointHash.substring(0, 8) + PLUGIN_IDENT;
  var ret = revision.endsWith(ending);
  return ret;
}

//# sourceMappingURL=helper.js.map