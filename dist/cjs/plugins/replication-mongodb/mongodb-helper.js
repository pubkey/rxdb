"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mongodbDocToRxDB = mongodbDocToRxDB;
exports.rxdbDocToMongo = rxdbDocToMongo;
exports.startChangeStream = startChangeStream;
var _rxError = require("../../rx-error.js");
var _index = require("../utils/index.js");
async function startChangeStream(mongoCollection, resumeToken, errorSubject) {
  var changeStream = mongoCollection.watch([], resumeToken ? {
    resumeAfter: resumeToken
  } : {});
  if (errorSubject) {
    changeStream.on('error', err => {
      var emitError = (0, _rxError.newRxError)('RC_STREAM', {
        errors: (0, _index.toArray)(err).map(er => (0, _index.errorToPlainJson)(er))
      });
      errorSubject.next(emitError);
    });
  }
  return changeStream;
}
function mongodbDocToRxDB(primaryPath, doc) {
  if (primaryPath === '_id' && typeof doc._id !== 'string') {
    throw (0, _rxError.newRxError)('MG1', {
      document: doc
    });
  }
  var useDoc = (0, _index.flatClone)(doc);
  useDoc._deleted = false;
  if (primaryPath === '_id') {
    return useDoc;
  } else {
    delete useDoc._id;
    return useDoc;
  }
}

/**
 * MongoDB operations like mongoCollection.updateOne() will mutate the input!
 * So we have to flat-clone first here.
 * Also we do not want to store RxDB-specific metadata in the mongodb database.
 */
function rxdbDocToMongo(doc) {
  var ret = (0, _index.flatClone)(doc);
  delete ret._deleted;
  delete ret._meta;
  delete ret._attachments;
  return ret;
}
//# sourceMappingURL=mongodb-helper.js.map