"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DEFAULT_MODIFIER = void 0;
exports.awaitRetry = awaitRetry;
exports.swapDefaultDeletedTodeletedField = swapDefaultDeletedTodeletedField;
exports.swapdeletedFieldToDefaultDeleted = swapdeletedFieldToDefaultDeleted;
var _util = require("../../util");
// does nothing
var DEFAULT_MODIFIER = function DEFAULT_MODIFIER(d) {
  return Promise.resolve(d);
};
exports.DEFAULT_MODIFIER = DEFAULT_MODIFIER;
function swapDefaultDeletedTodeletedField(deletedField, doc) {
  if (deletedField === '_deleted') {
    return doc;
  } else {
    doc = (0, _util.flatClone)(doc);
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
    doc = (0, _util.flatClone)(doc);
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
  var _listener;
  var onlineAgain = new Promise(function (res) {
    _listener = function listener() {
      window.removeEventListener('online', _listener);
      res();
    };
    window.addEventListener('online', _listener);
  });
  return Promise.race([onlineAgain, collection.promiseWait(retryTime)]).then(function () {
    window.removeEventListener('online', _listener);
  });
}
//# sourceMappingURL=replication-helper.js.map