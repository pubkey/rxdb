"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.appwriteDocToRxDB = appwriteDocToRxDB;
exports.rxdbDocToAppwrite = rxdbDocToAppwrite;
var _index = require("../utils/index.js");
function appwriteDocToRxDB(appwriteDoc, primaryKey, deletedField) {
  var useDoc = {};
  Object.keys(appwriteDoc).forEach(key => {
    if (!key.startsWith('$')) {
      useDoc[key] = appwriteDoc[key];
    }
  });
  useDoc[primaryKey] = appwriteDoc.$id;
  useDoc._deleted = appwriteDoc[deletedField];
  if (deletedField !== '_deleted') {
    delete useDoc[deletedField];
  }
  return useDoc;
}
function rxdbDocToAppwrite(rxdbDoc, primaryKey, deletedField) {
  var writeDoc = (0, _index.flatClone)(rxdbDoc);
  delete writeDoc._attachments;
  delete writeDoc[primaryKey];
  writeDoc[deletedField] = writeDoc._deleted;
  if (deletedField !== '_deleted') {
    delete writeDoc._deleted;
  }
  return writeDoc;
}
//# sourceMappingURL=appwrite-helpers.js.map