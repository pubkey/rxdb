import { Timestamp } from 'firebase/firestore';
import { flatClone, now } from "../../plugins/utils/index.js";
export function getFirestoreSortFieldValue(docData, primaryKey) {
  var timeString = now() + '';
  return 'rxdb-' + timeString.padStart(15, '0') + '-' + docData[primaryKey];
}
export function stripServerTimestampField(serverTimestampField, docData) {
  var data = flatClone(docData);
  delete data[serverTimestampField];
  return data;
}
export function serverTimestampToIsoString(serverTimestampField, docData) {
  var timestamp = docData[serverTimestampField];
  var date = timestamp.toDate();
  return date.toISOString();
}
export function isoStringToServerTimestamp(isoString) {
  var date = new Date(isoString);
  return Timestamp.fromDate(date);
}
export function firestoreRowToDocData(serverTimestampField, primaryPath, row) {
  var docData = stripServerTimestampField(serverTimestampField, row.data());
  docData[primaryPath] = row.id;
  if (primaryPath !== 'id') {
    delete docData['id'];
  }
  return docData;
}
export function stripPrimaryKey(primaryPath, docData) {
  docData = flatClone(docData);
  delete docData[primaryPath];
  return docData;
}

// https://stackoverflow.com/questions/61354866/is-there-a-workaround-for-the-firebase-query-in-limit-to-10
export function getContentByIds(ids, getQuery) {
  var batches = [];
  while (ids.length) {
    // firestore limits batches to 10
    var batch = ids.splice(0, 10);

    // add the batch request to to a queue
    batches.push(getQuery(batch));
  }

  // after all of the data is fetched, return it
  return Promise.all(batches).then(content => content.flat());
}
//# sourceMappingURL=firestore-helper.js.map