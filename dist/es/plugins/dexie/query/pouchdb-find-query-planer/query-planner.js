import { getUserFields } from './utils';
import { getKey, compare } from 'pouchdb-selector-core';
import { arrayEquals, arrayToObject, flatten, max, mergeObjects, oneArrayIsStrictSubArrayOfOther, oneArrayIsSubArrayOfOther, oneSetIsSubArrayOfOther, uniq } from './main-utils'; // couchdb lowest collation value

var COLLATE_LO = null; // couchdb highest collation value (TODO: well not really, but close enough amirite)
// const COLLATE_HI = { '\uffff': {} };
// overwritten COLLATE_HI for dexie.js RxStorage.

var COLLATE_HI = "\uFFFF";
var SHORT_CIRCUIT_QUERY = {
  queryOpts: {
    limit: 0,
    startkey: COLLATE_HI,
    endkey: COLLATE_LO
  },
  inMemoryFields: []
}; // couchdb second-lowest collation value

function checkFieldInIndex(index, field) {
  var indexFields = index.def.fields.map(getKey);

  for (var i = 0, len = indexFields.length; i < len; i++) {
    var indexField = indexFields[i];

    if (field === indexField) {
      return true;
    }
  }

  return false;
} // so when you do e.g. $eq/$eq, we can do it entirely in the database.
// but when you do e.g. $gt/$eq, the first part can be done
// in the database, but the second part has to be done in-memory,
// because $gt has forced us to lose precision.
// so that's what this determines


function userOperatorLosesPrecision(selector, field) {
  var matcher = selector[field];
  var userOperator = getKey(matcher);
  return userOperator !== '$eq';
} // sort the user fields by their position in the index,
// if they're in the index


function sortFieldsByIndex(userFields, index) {
  var indexFields = index.def.fields.map(getKey);
  return userFields.slice().sort(function (a, b) {
    var aIdx = indexFields.indexOf(a);
    var bIdx = indexFields.indexOf(b);

    if (aIdx === -1) {
      aIdx = Number.MAX_VALUE;
    }

    if (bIdx === -1) {
      bIdx = Number.MAX_VALUE;
    }

    return compare(aIdx, bIdx);
  });
} // first pass to try to find fields that will need to be sorted in-memory


function getBasicInMemoryFields(index, selector, userFields) {
  userFields = sortFieldsByIndex(userFields, index); // check if any of the user selectors lose precision

  var needToFilterInMemory = false;

  for (var i = 0, len = userFields.length; i < len; i++) {
    var field = userFields[i];

    if (needToFilterInMemory || !checkFieldInIndex(index, field)) {
      return userFields.slice(i);
    }

    if (i < len - 1 && userOperatorLosesPrecision(selector, field)) {
      needToFilterInMemory = true;
    }
  }

  return [];
}

function getInMemoryFieldsFromNe(selector) {
  var fields = [];
  Object.keys(selector).forEach(function (field) {
    var matcher = selector[field];
    Object.keys(matcher).forEach(function (operator) {
      if (operator === '$ne') {
        fields.push(field);
      }
    });
  });
  return fields;
}

function getInMemoryFields(coreInMemoryFields, index, selector, userFields) {
  var result = flatten( // in-memory fields reported as necessary by the query planner
  coreInMemoryFields, // combine with another pass that checks for any we may have missed
  getBasicInMemoryFields(index, selector, userFields), // combine with another pass that checks for $ne's
  getInMemoryFieldsFromNe(selector));
  return sortFieldsByIndex(uniq(result), index);
} // check that at least one field in the user's query is represented
// in the index. order matters in the case of sorts


function checkIndexFieldsMatch(indexFields, sortOrder, fields) {
  if (sortOrder) {
    // array has to be a strict subarray of index array. furthermore,
    // the sortOrder fields need to all be represented in the index
    var sortMatches = oneArrayIsStrictSubArrayOfOther(sortOrder, indexFields);
    var selectorMatches = oneArrayIsSubArrayOfOther(fields, indexFields);
    return sortMatches && selectorMatches;
  } // all of the user's specified fields still need to be
  // on the left side of the index array, although the order
  // doesn't matter


  return oneSetIsSubArrayOfOther(fields, indexFields);
}

var logicalMatchers = ['$eq', '$gt', '$gte', '$lt', '$lte'];

function isNonLogicalMatcher(matcher) {
  return logicalMatchers.indexOf(matcher) === -1;
} // check all the index fields for usages of '$ne'
// e.g. if the user queries {foo: {$ne: 'foo'}, bar: {$eq: 'bar'}},
// then we can neither use an index on ['foo'] nor an index on
// ['foo', 'bar'], but we can use an index on ['bar'] or ['bar', 'foo']


function checkFieldsLogicallySound(indexFields, selector) {
  var firstField = indexFields[0];
  var matcher = selector[firstField];

  if (typeof matcher === 'undefined') {
    /* istanbul ignore next */
    return true;
  }

  var isInvalidNe = Object.keys(matcher).length === 1 && getKey(matcher) === '$ne';
  return !isInvalidNe;
}

function checkIndexMatches(index, sortOrder, fields, selector) {
  var indexFields = index.def.fields.map(getKey);
  var fieldsMatch = checkIndexFieldsMatch(indexFields, sortOrder, fields);

  if (!fieldsMatch) {
    return false;
  }

  return checkFieldsLogicallySound(indexFields, selector);
} //
// the algorithm is very simple:
// take all the fields the user supplies, and if those fields
// are a strict subset of the fields in some index,
// then use that index
//
//


function findMatchingIndexes(selector, userFields, sortOrder, indexes) {
  return indexes.filter(function (index) {
    return checkIndexMatches(index, sortOrder, userFields, selector);
  });
} // find the best index, i.e. the one that matches the most fields
// in the user's query


function findBestMatchingIndex(selector, userFields, sortOrder, indexes, useIndex) {
  var matchingIndexes = findMatchingIndexes(selector, userFields, sortOrder, indexes);

  if (matchingIndexes.length === 0) {
    if (useIndex) {
      throw new Error({
        error: 'no_usable_index',
        message: 'There is no index available for this selector.'
      }.toString());
    } //return `all_docs` as a default index;
    //I'm assuming that _all_docs is always first


    var defaultIndex = indexes[0];
    defaultIndex.defaultUsed = true;
    return defaultIndex;
  }

  if (matchingIndexes.length === 1 && !useIndex) {
    return matchingIndexes[0];
  }

  var userFieldsMap = arrayToObject(userFields);

  function scoreIndex(index) {
    var indexFields = index.def.fields.map(getKey);
    var score = 0;

    for (var i = 0, len = indexFields.length; i < len; i++) {
      var indexField = indexFields[i];

      if (userFieldsMap[indexField]) {
        score++;
      }
    }

    return score;
  }

  if (useIndex) {
    var useIndexDdoc = '_design/' + useIndex[0];
    var useIndexName = useIndex.length === 2 ? useIndex[1] : false;
    var index = matchingIndexes.find(function (index) {
      if (useIndexName && index.ddoc === useIndexDdoc && useIndexName === index.name) {
        return true;
      }

      if (index.ddoc === useIndexDdoc) {
        /* istanbul ignore next */
        return true;
      }

      return false;
    });

    if (!index) {
      throw new Error({
        error: 'unknown_error',
        message: 'Could not find that index or could not use that index for the query'
      }.toString());
    }

    return index;
  }

  return max(matchingIndexes, scoreIndex);
}

function getSingleFieldQueryOptsFor(userOperator, userValue) {
  switch (userOperator) {
    case '$eq':
      return {
        key: userValue
      };

    case '$lte':
      return {
        endkey: userValue
      };

    case '$gte':
      return {
        startkey: userValue
      };

    case '$lt':
      return {
        endkey: userValue,
        inclusive_end: false
      };

    case '$gt':
      return {
        startkey: userValue,
        inclusive_start: false
      };
  }

  return {
    startkey: COLLATE_LO
  };
}

function getSingleFieldCoreQueryPlan(selector, index) {
  var field = getKey(index.def.fields[0]); //ignoring this because the test to exercise the branch is skipped at the moment

  /* istanbul ignore next */

  var matcher = selector[field] || {};
  var inMemoryFields = [];
  var userOperators = Object.keys(matcher);
  var combinedOpts;
  userOperators.forEach(function (userOperator) {
    if (isNonLogicalMatcher(userOperator)) {
      inMemoryFields.push(field);
    }

    var userValue = matcher[userOperator];
    var newQueryOpts = getSingleFieldQueryOptsFor(userOperator, userValue);

    if (combinedOpts) {
      combinedOpts = mergeObjects([combinedOpts, newQueryOpts]);
    } else {
      combinedOpts = newQueryOpts;
    }
  });
  return {
    queryOpts: combinedOpts,
    inMemoryFields: inMemoryFields
  };
}

function getMultiFieldCoreQueryPlan(userOperator, userValue) {
  switch (userOperator) {
    case '$eq':
      return {
        startkey: userValue,
        endkey: userValue
      };

    case '$lte':
      return {
        endkey: userValue
      };

    case '$gte':
      return {
        startkey: userValue
      };

    case '$lt':
      return {
        endkey: userValue,
        inclusive_end: false
      };

    case '$gt':
      return {
        startkey: userValue,
        inclusive_start: false
      };
  }
}

function getMultiFieldQueryOpts(selector, index) {
  var indexFields = index.def.fields.map(getKey);
  var inMemoryFields = [];
  var startkey = [];
  var endkey = [];
  var inclusiveStart;
  var inclusiveEnd;

  function finish(i) {
    if (inclusiveStart !== false) {
      startkey.push(COLLATE_LO);
    }

    if (inclusiveEnd !== false) {
      endkey.push(COLLATE_HI);
    } // keep track of the fields where we lost specificity,
    // and therefore need to filter in-memory


    inMemoryFields = indexFields.slice(i);
  }

  for (var i = 0, len = indexFields.length; i < len; i++) {
    var indexField = indexFields[i];
    var matcher = selector[indexField];

    if (!matcher || !Object.keys(matcher).length) {
      // fewer fields in user query than in index
      finish(i);
      break;
    } else if (Object.keys(matcher).some(isNonLogicalMatcher)) {
      // non-logical are ignored
      finish(i);
      break;
    } else if (i > 0) {
      var usingGtlt = '$gt' in matcher || '$gte' in matcher || '$lt' in matcher || '$lte' in matcher;
      var previousKeys = Object.keys(selector[indexFields[i - 1]]);
      var previousWasEq = arrayEquals(previousKeys, ['$eq']);
      var previousWasSame = arrayEquals(previousKeys, Object.keys(matcher));
      var gtltLostSpecificity = usingGtlt && !previousWasEq && !previousWasSame;

      if (gtltLostSpecificity) {
        finish(i);
        break;
      }
    }

    var userOperators = Object.keys(matcher);
    var combinedOpts = null;

    for (var j = 0; j < userOperators.length; j++) {
      var userOperator = userOperators[j];
      var userValue = matcher[userOperator];
      var newOpts = getMultiFieldCoreQueryPlan(userOperator, userValue);

      if (combinedOpts) {
        combinedOpts = mergeObjects([combinedOpts, newOpts]);
      } else {
        combinedOpts = newOpts;
      }
    }

    startkey.push('startkey' in combinedOpts ? combinedOpts.startkey : COLLATE_LO);
    endkey.push('endkey' in combinedOpts ? combinedOpts.endkey : COLLATE_HI);

    if ('inclusive_start' in combinedOpts) {
      inclusiveStart = combinedOpts.inclusive_start;
    }

    if ('inclusive_end' in combinedOpts) {
      inclusiveEnd = combinedOpts.inclusive_end;
    }
  }

  var res = {
    startkey: startkey,
    endkey: endkey
  };

  if (typeof inclusiveStart !== 'undefined') {
    res.inclusive_start = inclusiveStart;
  }

  if (typeof inclusiveEnd !== 'undefined') {
    res.inclusive_end = inclusiveEnd;
  }

  return {
    queryOpts: res,
    inMemoryFields: inMemoryFields
  };
}

function shouldShortCircuit(selector) {
  // We have a field to select from, but not a valid value
  // this should result in a short circuited query 
  // just like the http adapter (couchdb) and mongodb
  // see tests for issue #7810
  var values = Object.values(selector);
  return values.some(function (val) {
    return typeof val === 'object' && Object.keys(val).length === 0;
  });
}

function getDefaultQueryPlan(selector, _idx) {
  //using default index, so all fields need to be done in memory
  return {
    queryOpts: {
      startkey: null
    },
    inMemoryFields: [Object.keys(selector)]
  };
}

function getCoreQueryPlan(selector, index) {
  if (index.defaultUsed) {
    return getDefaultQueryPlan(selector, index);
  }

  if (index.def.fields.length === 1) {
    // one field in index, so the value was indexed as a singleton
    return getSingleFieldCoreQueryPlan(selector, index);
  } // else index has multiple fields, so the value was indexed as an array


  return getMultiFieldQueryOpts(selector, index);
}

export function planQuery(request, indexes) {
  var selector = request.selector;
  var sort = request.sort;

  if (shouldShortCircuit(selector)) {
    return Object.assign({}, SHORT_CIRCUIT_QUERY, {
      index: indexes[0]
    });
  }

  var userFieldsRes = getUserFields(selector, sort);
  var userFields = userFieldsRes.fields;
  var sortOrder = userFieldsRes.sortOrder;
  var index = findBestMatchingIndex(selector, userFields, sortOrder, indexes, request.use_index);
  var coreQueryPlan = getCoreQueryPlan(selector, index);
  var queryOpts = coreQueryPlan.queryOpts;
  var coreInMemoryFields = coreQueryPlan.inMemoryFields;
  var inMemoryFields = getInMemoryFields(coreInMemoryFields, index, selector, userFields);
  var res = {
    queryOpts: queryOpts,
    index: index,
    inMemoryFields: inMemoryFields
  };
  return res;
}
//# sourceMappingURL=query-planner.js.map