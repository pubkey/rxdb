"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getUserFields = getUserFields;

var _pouchdbSelectorCore = require("pouchdb-selector-core");

// determine the maximum number of fields
// we're going to need to query, e.g. if the user
// has selection ['a'] and sorting ['a', 'b'], then we
// need to use the longer of the two: ['a', 'b']
function getUserFields(selector, sort) {
  var selectorFields = Object.keys(selector);
  var sortFields = sort ? sort.map(_pouchdbSelectorCore.getKey) : [];
  var userFields;

  if (selectorFields.length >= sortFields.length) {
    userFields = selectorFields;
  } else {
    userFields = sortFields;
  }

  if (sortFields.length === 0) {
    return {
      fields: userFields
    };
  } // sort according to the user's preferred sorting


  userFields = userFields.sort(function (left, right) {
    var leftIdx = sortFields.indexOf(left);

    if (leftIdx === -1) {
      leftIdx = Number.MAX_VALUE;
    }

    var rightIdx = sortFields.indexOf(right);

    if (rightIdx === -1) {
      rightIdx = Number.MAX_VALUE;
    }

    return leftIdx < rightIdx ? -1 : leftIdx > rightIdx ? 1 : 0;
  });
  return {
    fields: userFields,
    sortOrder: sort.map(_pouchdbSelectorCore.getKey)
  };
}
//# sourceMappingURL=utils.js.map