import { Timestamp } from 'firebase/firestore';
import { flatClone, now } from '../../util';
export var FIRESTORE_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'rxdb-replication-firestore-';
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
  return docData;
}
export function stripPrimaryKey(primaryPath, docData) {
  docData = flatClone(docData);
  delete docData[primaryPath];
  return docData;
}
//# sourceMappingURL=firestore-helper.js.map