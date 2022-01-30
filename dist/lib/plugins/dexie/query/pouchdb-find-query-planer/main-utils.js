"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.arrayEquals = arrayEquals;
exports.arrayToObject = arrayToObject;
exports.flatten = void 0;
exports.max = max;
exports.mergeObjects = mergeObjects;
exports.oneArrayIsStrictSubArrayOfOther = oneArrayIsStrictSubArrayOfOther;
exports.oneArrayIsSubArrayOfOther = oneArrayIsSubArrayOfOther;
exports.oneSetIsSubArrayOfOther = oneSetIsSubArrayOfOther;
exports.uniq = uniq;

function getArguments(fun) {
  return function () {
    var len = arguments.length;
    var args = new Array(len);
    var i = -1;

    while (++i < len) {
      args[i] = arguments[i];
    }

    var ret = fun.call(undefined, args);
    return ret;
  };
}

var flatten = getArguments(function (args) {
  var res = [];

  for (var i = 0, len = args.length; i < len; i++) {
    var subArr = args[i];

    if (Array.isArray(subArr)) {
      res = res.concat(flatten.apply(null, subArr));
    } else {
      res.push(subArr);
    }
  }

  return res;
});
exports.flatten = flatten;

function mergeObjects(arr) {
  var res = {};

  for (var i = 0, len = arr.length; i < len; i++) {
    res = Object.assign(res, arr[i]);
  }

  return res;
} // e.g. ['a'], ['a', 'b'] is true, but ['b'], ['a', 'b'] is false


function oneArrayIsSubArrayOfOther(left, right) {
  for (var i = 0, len = Math.min(left.length, right.length); i < len; i++) {
    if (left[i] !== right[i]) {
      return false;
    }
  }

  return true;
} // e.g.['a', 'b', 'c'], ['a', 'b'] is false


function oneArrayIsStrictSubArrayOfOther(left, right) {
  if (left.length > right.length) {
    return false;
  }

  return oneArrayIsSubArrayOfOther(left, right);
} // same as above, but treat the left array as an unordered set
// e.g. ['b', 'a'], ['a', 'b', 'c'] is true, but ['c'], ['a', 'b', 'c'] is false


function oneSetIsSubArrayOfOther(left, right) {
  left = left.slice();

  for (var i = 0, len = right.length; i < len; i++) {
    var field = right[i];

    if (!left.length) {
      break;
    }

    var leftIdx = left.indexOf(field);

    if (leftIdx === -1) {
      return false;
    } else {
      left.splice(leftIdx, 1);
    }
  }

  return true;
}

function arrayToObject(arr) {
  var res = {};

  for (var i = 0, len = arr.length; i < len; i++) {
    res[arr[i]] = true;
  }

  return res;
}

function max(arr, fun) {
  var max = null;
  var maxScore = -1;

  for (var i = 0, len = arr.length; i < len; i++) {
    var element = arr[i];
    var score = fun(element);

    if (score > maxScore) {
      maxScore = score;
      max = element;
    }
  }

  return max;
}

function arrayEquals(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }

  for (var i = 0, len = arr1.length; i < len; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }

  return true;
}

function uniq(arr) {
  var obj = {};

  for (var i = 0; i < arr.length; i++) {
    obj['$' + arr[i]] = true;
  }

  return Object.keys(obj).map(function (key) {
    return key.substring(1);
  });
}
//# sourceMappingURL=main-utils.js.map