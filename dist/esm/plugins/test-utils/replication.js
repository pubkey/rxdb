import { rxStorageInstanceToReplicationHandler } from "../../replication-protocol/index.js";
import { deepEqual } from "../utils/index.js";

/**
 * Creates a pull handler that always returns
 * all documents.
*/
export function getPullHandler(remoteCollection) {
  var helper = rxStorageInstanceToReplicationHandler(remoteCollection.storageInstance, remoteCollection.database.conflictHandler, remoteCollection.database.token);
  var handler = async (latestPullCheckpoint, batchSize) => {
    var result = await helper.masterChangesSince(latestPullCheckpoint, batchSize);
    return result;
  };
  return handler;
}
export function getPullStream(remoteCollection) {
  var helper = rxStorageInstanceToReplicationHandler(remoteCollection.storageInstance, remoteCollection.conflictHandler, remoteCollection.database.token);
  return helper.masterChangeStream$;
}
export function getPushHandler(remoteCollection) {
  var helper = rxStorageInstanceToReplicationHandler(remoteCollection.storageInstance, remoteCollection.conflictHandler, remoteCollection.database.token);
  var handler = async rows => {
    var result = await helper.masterWrite(rows);
    return result;
  };
  return handler;
}
export async function ensureEqualState(collectionA, collectionB, context) {
  var [docsA, docsB] = await Promise.all([collectionA.find().exec().then(docs => docs.map(d => d.toJSON(true))), collectionB.find().exec().then(docs => docs.map(d => d.toJSON(true)))]);
  docsA.forEach((docA, idx) => {
    var docB = docsB[idx];
    var cleanDocToCompare = doc => {
      return Object.assign({}, doc, {
        _meta: undefined,
        _rev: undefined
      });
    };
    if (!deepEqual(cleanDocToCompare(docA), cleanDocToCompare(docB))) {
      console.log('## ERROR: State not equal (context: "' + context + '")');
      console.log(JSON.stringify(docA, null, 4));
      console.log(JSON.stringify(docB, null, 4));
      throw new Error('STATE not equal (context: "' + context + '")');
    }
  });
}
//# sourceMappingURL=replication.js.map