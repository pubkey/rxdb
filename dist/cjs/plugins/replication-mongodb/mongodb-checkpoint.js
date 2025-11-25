"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getCurrentResumeToken = getCurrentResumeToken;
exports.getDocsSinceChangestreamCheckpoint = getDocsSinceChangestreamCheckpoint;
exports.getDocsSinceDocumentCheckpoint = getDocsSinceDocumentCheckpoint;
exports.iterateCheckpoint = iterateCheckpoint;
var _index = require("../utils/index.js");
var _mongodbHelper = require("./mongodb-helper.js");
async function getCurrentResumeToken(mongoCollection) {
  var changeStream = mongoCollection.watch();

  // Trigger the initial batch so postBatchResumeToken is available
  await changeStream.tryNext().catch(() => {});
  var token = changeStream.resumeToken;
  changeStream.close();
  return token;
}
async function getDocsSinceChangestreamCheckpoint(primaryPath, mongoCollection,
/**
 * MongoDB has no way to start the stream from 'timestamp zero',
 * we always need a resumeToken
 */
resumeToken, limit) {
  var resultByDocId = new Map();
  var changeStream = mongoCollection.watch([], {
    resumeAfter: resumeToken,
    fullDocument: 'required',
    fullDocumentBeforeChange: 'required'
  });

  /**
   * We cannot use changeStream.resumeToken for the
   * updated token because depending on the batchSize of mongoCollection.watch()
   * it might have changes but not emitting a new token.
   */
  var nextToken = resumeToken;
  return new Promise(async (res, rej) => {
    changeStream.on('error', err => {
      rej(err);
    });
    var _loop = async function () {
      var change = await changeStream.tryNext();
      if (change) {
        nextToken = change._id;
        var docId = change.documentKey._id;
        if (change.operationType === 'delete') {
          var beforeDocMongo = (0, _index.ensureNotFalsy)(change.fullDocumentBeforeChange, 'change must have pre-deletion state');
          var beforeDoc = (0, _mongodbHelper.mongodbDocToRxDB)(primaryPath, beforeDocMongo);
          beforeDoc._deleted = true;
          resultByDocId.set(docId, Promise.resolve(beforeDoc));
        } else if (change.operationType === 'insert' || change.operationType === 'update' || change.operationType === 'replace') {
          resultByDocId.set(docId, mongoCollection.findOne({
            _id: docId
          }).then(doc => {
            if (doc) {
              return (0, _mongodbHelper.mongodbDocToRxDB)(primaryPath, doc);
            } else {
              var docFromChange = (0, _index.ensureNotFalsy)(change.fullDocument, 'change must have change.fullDocument');
              var ret = (0, _mongodbHelper.mongodbDocToRxDB)(primaryPath, docFromChange);
              ret._deleted = true;
              return ret;
            }
          }));
        }
      } else {
        return 1; // break
      }
    };
    while (resultByDocId.size < limit) {
      if (await _loop()) break;
    }
    changeStream.close();
    var docs = await Promise.all(Array.from(resultByDocId.values()));
    res({
      docs,
      nextToken: nextToken
    });
  });
}
async function getDocsSinceDocumentCheckpoint(primaryPath, mongoCollection, limit, checkpointId) {
  var query = checkpointId ? {
    [primaryPath]: {
      $gt: checkpointId
    }
  } : {};
  var docs = await mongoCollection.find(query).sort({
    [primaryPath]: 1
  }).limit(limit).toArray();
  return docs.map(d => (0, _mongodbHelper.mongodbDocToRxDB)(primaryPath, d));
}
async function iterateCheckpoint(primaryPath, mongoCollection, limit, checkpoint) {
  if (!checkpoint) {
    var token = await getCurrentResumeToken(mongoCollection);
    checkpoint = {
      iterate: 'docs-by-id',
      changestreamResumeToken: token
    };
  } else {
    checkpoint = (0, _index.clone)(checkpoint);
  }
  var docs = [];
  if (checkpoint.iterate === 'docs-by-id') {
    docs = await getDocsSinceDocumentCheckpoint(primaryPath, mongoCollection, limit, checkpoint.docId);
    var last = (0, _index.lastOfArray)(docs);
    if (last) {
      checkpoint.docId = last[primaryPath];
    }
  } else {
    var result = await getDocsSinceChangestreamCheckpoint(primaryPath, mongoCollection, checkpoint.changestreamResumeToken, limit);
    docs = result.docs;
    checkpoint.changestreamResumeToken = result.nextToken;
  }

  /**
   * If we have to toggle from docs-by-id to changestream iteration
   * mode, the docs array might not be full while we still have some docs left.
   */
  if (checkpoint.iterate === 'docs-by-id' && docs.length < limit) {
    var ids = new Set();
    docs.forEach(d => ids.add(d[primaryPath]));
    var fillUp = await getDocsSinceChangestreamCheckpoint(primaryPath, mongoCollection, checkpoint.changestreamResumeToken, limit);
    checkpoint.iterate = 'changestream';
    checkpoint.changestreamResumeToken = fillUp.nextToken;
    fillUp.docs.forEach(doc => {
      var id = doc[primaryPath];
      if (ids.has(id)) {
        docs = docs.filter(d => d[primaryPath] !== id);
      }
      docs.push(doc);
    });
  }
  return {
    docs,
    checkpoint
  };
}
//# sourceMappingURL=mongodb-checkpoint.js.map