"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.countAllUndeleted = countAllUndeleted;
exports.getBatch = getBatch;
exports.isLevelDown = isLevelDown;
exports.validateCouchDBString = validateCouchDBString;
exports.pouchReplicationFunction = pouchReplicationFunction;
exports.pouchAttachmentBinaryHash = pouchAttachmentBinaryHash;
exports.isInstanceOf = isInstanceOf;
exports.PouchDB = void 0;

var _pouchdbCore = _interopRequireDefault(require("pouchdb-core"));

var _pouchdbFind = _interopRequireDefault(require("pouchdb-find"));

var _pouchdbMd = require("pouchdb-md5");

var _rxError = require("./rx-error");

var _util = require("./util");

/**
 * this handles the pouchdb-instance
 * to easy add modules and manipulate things
 * Adapters can be found here:
 * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
 */
// pouchdb-find
_pouchdbCore["default"].plugin(_pouchdbFind["default"]);
/*
// comment in to debug
const pouchdbDebug = require('pouchdb-debug');
PouchDB.plugin(pouchdbDebug);
PouchDB.debug.enable('*');
*/


/**
 * get the number of all undeleted documents
 */
function countAllUndeleted(pouchdb) {
  return pouchdb.allDocs({
    include_docs: false,
    attachments: false
  }).then(function (docs) {
    return docs.rows.filter(function (row) {
      return !row.id.startsWith('_design/');
    }).length;
  });
}
/**
 * get a batch of documents from the pouch-instance
 */


function getBatch(pouchdb, limit) {
  if (limit <= 1) {
    throw (0, _rxError.newRxError)('P1', {
      limit: limit
    });
  }

  return pouchdb.allDocs({
    include_docs: true,
    attachments: false,
    limit: limit
  }).then(function (docs) {
    return docs.rows.map(function (row) {
      return row.doc;
    }).filter(function (doc) {
      return !doc._id.startsWith('_design');
    });
  });
}
/**
 * check if the given module is a leveldown-adapter
 * throws if not
 */


function isLevelDown(adapter) {
  if (!adapter || typeof adapter.super_ !== 'function') {
    throw (0, _rxError.newRxError)('UT4', {
      adapter: adapter
    });
  }
}

var validCouchDBStringRegexStr = '^[a-z][_$a-z0-9]*$';
var validCouchDBStringRegex = new RegExp(validCouchDBStringRegexStr);
/**
 * validates that a given string is ok to be used with couchdb-collection-names
 * @link https://wiki.apache.org/couchdb/HTTP_database_API
 * @throws  {Error}
 */

function validateCouchDBString(name) {
  if (typeof name !== 'string' || name.length === 0) {
    throw (0, _rxError.newRxTypeError)('UT1', {
      name: name
    });
  } // do not check, if foldername is given


  if ((0, _util.isFolderPath)(name)) {
    return true;
  }

  if (!name.match(validCouchDBStringRegex)) {
    throw (0, _rxError.newRxError)('UT2', {
      regex: validCouchDBStringRegexStr,
      givenName: name
    });
  }

  return true;
}
/**
 * get the correct function-name for pouchdb-replication
 */


function pouchReplicationFunction(pouch, _ref) {
  var _ref$pull = _ref.pull,
      pull = _ref$pull === void 0 ? true : _ref$pull,
      _ref$push = _ref.push,
      push = _ref$push === void 0 ? true : _ref$push;
  if (pull && push) return pouch.sync.bind(pouch);
  if (!pull && push) return pouch.replicate.to.bind(pouch);
  if (pull && !push) return pouch.replicate.from.bind(pouch);

  if (!pull && !push) {
    throw (0, _rxError.newRxError)('UT3', {
      pull: pull,
      push: push
    });
  }
}
/**
 * create the same diggest as an attachment with that data
 * would have
 */


function pouchAttachmentBinaryHash(data) {
  return new Promise(function (res) {
    (0, _pouchdbMd.binaryMd5)(data, function (d) {
      res('md5-' + d);
    });
  });
}

function isInstanceOf(obj) {
  return obj instanceof _pouchdbCore["default"];
}

var PouchDB = _pouchdbCore["default"];
exports.PouchDB = PouchDB;

//# sourceMappingURL=pouch-db.js.map