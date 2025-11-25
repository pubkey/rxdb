import { newRxError } from "../../rx-error.js";
import { errorToPlainJson, flatClone, toArray } from "../utils/index.js";
export async function startChangeStream(mongoCollection, resumeToken, errorSubject) {
  var changeStream = mongoCollection.watch([], resumeToken ? {
    resumeAfter: resumeToken
  } : {});
  if (errorSubject) {
    changeStream.on('error', err => {
      var emitError = newRxError('RC_STREAM', {
        errors: toArray(err).map(er => errorToPlainJson(er))
      });
      errorSubject.next(emitError);
    });
  }
  return changeStream;
}
export function mongodbDocToRxDB(primaryPath, doc) {
  if (primaryPath === '_id' && typeof doc._id !== 'string') {
    throw newRxError('MG1', {
      document: doc
    });
  }
  var useDoc = flatClone(doc);
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
export function rxdbDocToMongo(doc) {
  var ret = flatClone(doc);
  delete ret._deleted;
  delete ret._meta;
  delete ret._attachments;
  return ret;
}
//# sourceMappingURL=mongodb-helper.js.map