import { flatClone } from '../../plugins/utils';

// does nothing
export var DEFAULT_MODIFIER = d => Promise.resolve(d);
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