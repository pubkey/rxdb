import { flatClone } from '../../plugins/utils';

// does nothing
export var DEFAULT_MODIFIER = function DEFAULT_MODIFIER(d) {
  return Promise.resolve(d);
};
export function swapDefaultDeletedTodeletedField(deletedField, doc) {
  if (deletedField === '_deleted') {
    return doc;
  } else {
    doc = flatClone(doc);
    var isDeleted = !!doc._deleted;
    doc[deletedField] = isDeleted;
    delete doc._deleted;
    return doc;
  }
}
export function swapdeletedFieldToDefaultDeleted(deletedField, doc) {
  if (deletedField === '_deleted') {
    return doc;
  } else {
    doc = flatClone(doc);
    var isDeleted = !!doc[deletedField];
    doc._deleted = isDeleted;
    delete doc[deletedField];
    return doc;
  }
}
export function awaitRetry(collection, retryTime) {
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