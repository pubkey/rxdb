"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ensureEqualState = ensureEqualState;
exports.getPullHandler = getPullHandler;
exports.getPullStream = getPullStream;
exports.getPushHandler = getPushHandler;
var _index = require("../../replication-protocol/index.js");
var _index2 = require("../utils/index.js");
/**
 * Creates a pull handler that always returns
 * all documents.
*/
function getPullHandler(remoteCollection) {
  var helper = (0, _index.rxStorageInstanceToReplicationHandler)(remoteCollection.storageInstance, remoteCollection.database.conflictHandler, remoteCollection.database.token);
  var handler = async (latestPullCheckpoint, batchSize) => {
    var result = await helper.masterChangesSince(latestPullCheckpoint, batchSize);
    return result;
  };
  return handler;
}
function getPullStream(remoteCollection) {
  var helper = (0, _index.rxStorageInstanceToReplicationHandler)(remoteCollection.storageInstance, remoteCollection.conflictHandler, remoteCollection.database.token);
  return helper.masterChangeStream$;
}
function getPushHandler(remoteCollection) {
  var helper = (0, _index.rxStorageInstanceToReplicationHandler)(remoteCollection.storageInstance, remoteCollection.conflictHandler, remoteCollection.database.token);
  var handler = async rows => {
    var result = await helper.masterWrite(rows);
    return result;
  };
  return handler;
}
async function ensureEqualState(collectionA, collectionB, context) {
  var [docsA, docsB] = await Promise.all([collectionA.find().exec().then(docs => docs.map(d => d.toJSON(true))), collectionB.find().exec().then(docs => docs.map(d => d.toJSON(true)))]);
  docsA.forEach((docA, idx) => {
    var docB = docsB[idx];
    var cleanDocToCompare = doc => {
      return Object.assign({}, doc, {
        _meta: undefined,
        _rev: undefined
      });
    };
    if (!(0, _index2.deepEqual)(cleanDocToCompare(docA), cleanDocToCompare(docB))) {
      console.log('## ERROR: State not equal (context: "' + context + '")');
      console.log(JSON.stringify(docA, null, 4));
      console.log(JSON.stringify(docB, null, 4));
      throw new Error('STATE not equal (context: "' + context + '")');
    }
  });
}
//# sourceMappingURL=replication.js.map