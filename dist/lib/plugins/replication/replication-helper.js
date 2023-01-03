"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DEFAULT_MODIFIER = void 0;
exports.awaitRetry = awaitRetry;
exports.swapDefaultDeletedTodeletedField = swapDefaultDeletedTodeletedField;
exports.swapdeletedFieldToDefaultDeleted = swapdeletedFieldToDefaultDeleted;
var _utils = require("../../plugins/utils");
// does nothing
var DEFAULT_MODIFIER = d => Promise.resolve(d);
exports.DEFAULT_MODIFIER = DEFAULT_MODIFIER;
function swapDefaultDeletedTodeletedField(deletedField, doc) {
  if (deletedField === '_deleted') {
    return doc;
  } else {
    doc = (0, _utils.flatClone)(doc);
    var isDeleted = !!doc._deleted;
    doc[deletedField] = isDeleted;
    delete doc._deleted;
    return doc;
  }
}
function swapdeletedFieldToDefaultDeleted(deletedField, doc) {
  if (deletedField === '_deleted') {
    return doc;
  } else {
    doc = (0, _utils.flatClone)(doc);
    var isDeleted = !!doc[deletedField];
    doc._deleted = isDeleted;
    delete doc[deletedField];
    return doc;
  }
}
function awaitRetry(collection, retryTime) {
  if (typeof window === 'undefined' || typeof window !== 'object' || typeof window.addEventListener === 'undefined' || navigator.onLine) {
    return collection.promiseWait(retryTime);
  }
  var listener;
  var onlineAgain = new Promise(res => {
    listener = () => {
      window.removeEventListener('online', listener);
      res();
    };
    window.addEventListener('online', listener);
  });
  return Promise.race([onlineAgain, collection.promiseWait(retryTime)]).then(() => {
    window.removeEventListener('online', listener);
  });
}
//# sourceMappingURL=replication-helper.js.map