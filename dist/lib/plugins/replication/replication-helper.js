"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DEFAULT_MODIFIER = void 0;
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
//# sourceMappingURL=replication-helper.js.map