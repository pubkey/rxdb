"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.firestoreRowToDocData = firestoreRowToDocData;
exports.getContentByIds = getContentByIds;
exports.getFirestoreSortFieldValue = getFirestoreSortFieldValue;
exports.isoStringToServerTimestamp = isoStringToServerTimestamp;
exports.serverTimestampToIsoString = serverTimestampToIsoString;
exports.stripPrimaryKey = stripPrimaryKey;
exports.stripServerTimestampField = stripServerTimestampField;
var _firestore = require("firebase/firestore");
var _index = require("../../plugins/utils/index.js");
function getFirestoreSortFieldValue(docData, primaryKey) {
  var timeString = (0, _index.now)() + '';
  return 'rxdb-' + timeString.padStart(15, '0') + '-' + docData[primaryKey];
}
function stripServerTimestampField(serverTimestampField, docData) {
  var data = (0, _index.flatClone)(docData);
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
  if (primaryPath !== 'id') {
    delete docData['id'];
  }
  return docData;
}
function stripPrimaryKey(primaryPath, docData) {
  docData = (0, _index.flatClone)(docData);
  delete docData[primaryPath];
  return docData;
}

// https://stackoverflow.com/questions/61354866/is-there-a-workaround-for-the-firebase-query-in-limit-to-10
function getContentByIds(ids, getQuery) {
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