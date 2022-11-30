"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FIRESTORE_REPLICATION_PLUGIN_IDENTITY_PREFIX = void 0;
exports.firestoreRowToDocData = firestoreRowToDocData;
exports.getFirestoreSortFieldValue = getFirestoreSortFieldValue;
exports.isoStringToServerTimestamp = isoStringToServerTimestamp;
exports.serverTimestampToIsoString = serverTimestampToIsoString;
exports.stripPrimaryKey = stripPrimaryKey;
exports.stripServerTimestampField = stripServerTimestampField;
var _firestore = require("firebase/firestore");
var _util = require("../../util");
var FIRESTORE_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'rxdb-replication-firestore-';
exports.FIRESTORE_REPLICATION_PLUGIN_IDENTITY_PREFIX = FIRESTORE_REPLICATION_PLUGIN_IDENTITY_PREFIX;
function getFirestoreSortFieldValue(docData, primaryKey) {
  var timeString = (0, _util.now)() + '';
  return 'rxdb-' + timeString.padStart(15, '0') + '-' + docData[primaryKey];
}
function stripServerTimestampField(serverTimestampField, docData) {
  var data = (0, _util.flatClone)(docData);
  delete data[serverTimestampField];
  return data;
}
function serverTimestampToIsoString(serverTimestampField, docData) {
  var timestamp = docData[serverTimestampField];
  var date = timestamp.toDate();
  return date.toISOString();
}
function isoStringToServerTimestamp(isoString) {
  var date = new Date(isoString);
  return _firestore.Timestamp.fromDate(date);
}
function firestoreRowToDocData(serverTimestampField, primaryPath, row) {
  var docData = stripServerTimestampField(serverTimestampField, row.data());
  docData[primaryPath] = row.id;
  return docData;
}
function stripPrimaryKey(primaryPath, docData) {
  docData = (0, _util.flatClone)(docData);
  delete docData[primaryPath];
  return docData;
}
//# sourceMappingURL=firestore-helper.js.map