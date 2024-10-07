"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.appendToArray = appendToArray;
exports.arrayFilterNotEmpty = arrayFilterNotEmpty;
exports.asyncFilter = asyncFilter;
exports.batchArray = batchArray;
exports.countUntilNotMatching = countUntilNotMatching;
exports.isMaybeReadonlyArray = isMaybeReadonlyArray;
exports.isOneItemOfArrayInOtherArray = isOneItemOfArrayInOtherArray;
exports.lastOfArray = lastOfArray;
exports.maxOfNumbers = maxOfNumbers;
exports.randomOfArray = randomOfArray;
exports.removeOneFromArrayIfMatches = removeOneFromArrayIfMatches;
exports.shuffleArray = shuffleArray;
exports.sortByObjectNumberProperty = sortByObjectNumberProperty;
exports.sumNumberArray = sumNumberArray;
exports.toArray = toArray;
exports.uniqueArray = uniqueArray;
function lastOfArray(ar) {
  return ar[ar.length - 1];
}

/**
 * shuffle the given array
 */
function shuffleArray(arr) {
  return arr.slice(0).sort(() => Math.random() - 0.5);
}
function randomOfArray(arr) {
  var randomElement = arr[Math.floor(Math.random() * arr.length)];
  return randomElement;
}
function toArray(input) {
  return Array.isArray(input) ? input.slice(0) : [input];
}

/**
 * Split array with items into smaller arrays with items
 * @link https://stackoverflow.com/a/7273794/3443137
 */
function batchArray(array, batchSize) {
  array = array.slice(0);
  var ret = [];
  while (array.length) {
    var batch = array.splice(0, batchSize);
    ret.push(batch);
  }
  return ret;
}

/**
 * @link https://stackoverflow.com/a/15996017
 */
function removeOneFromArrayIfMatches(ar, condition) {
  ar = ar.slice();
  var i = ar.length;
  var done = false;
  while (i-- && !done) {
    if (condition(ar[i])) {
      done = true;
      ar.splice(i, 1);
    }
  }
  return ar;
}

/**
 * returns true if the supplied argument is either an Array<T> or a Readonly<Array<T>>
 */
function isMaybeReadonlyArray(x) {
  // While this looks strange, it's a workaround for an issue in TypeScript:
  // https://github.com/microsoft/TypeScript/issues/17002
  //
  // The problem is that `Array.isArray` as a type guard returns `false` for a readonly array,
  // but at runtime the object is an array and the runtime call to `Array.isArray` would return `true`.
  // The type predicate here allows for both `Array<T>` and `Readonly<Array<T>>` to pass a type check while
  // still performing runtime type inspection.
  return Array.isArray(x);
}
function isOneItemOfArrayInOtherArray(ar1, ar2) {
  for (var i = 0; i < ar1.length; i++) {
    var el = ar1[i];
    var has = ar2.includes(el);
    if (has) {
      return true;
    }
  }
  return false;
}

/**
 * Use this in array.filter() to remove all empty slots
 * and have the correct typings afterwards.
 * @link https://stackoverflow.com/a/46700791/3443137
 */
function arrayFilterNotEmpty(value) {
  if (value === null || value === undefined) {
    return false;
  }
  return true;
}
function countUntilNotMatching(ar, matchingFn) {
  var count = 0;
  var idx = -1;
  for (var item of ar) {
    idx = idx + 1;
    var matching = matchingFn(item, idx);
    if (matching) {
      count = count + 1;
    } else {
      break;
    }
  }
  return count;
}
async function asyncFilter(array, predicate) {
  var filters = await Promise.all(array.map(predicate));
  return array.filter((...[, index]) => filters[index]);
}

/**
 * @link https://stackoverflow.com/a/3762735
 */
function sumNumberArray(array) {
  var count = 0;
  for (var i = array.length; i--;) {
    count += array[i];
  }
  return count;
}
function maxOfNumbers(arr) {
  return Math.max(...arr);
}

/**
 * Appends the given documents to the given array.
 * This will mutate the first given array.
 * Mostly used as faster alternative to Array.concat()
 * because .concat() is so slow.
 * @link https://www.measurethat.net/Benchmarks/Show/4223/0/array-concat-vs-spread-operator-vs-push#latest_results_block
 * 
 * TODO it turns out that in mid 2024 v8 has optimized Array.concat()
 * so it might be faster to just use concat() again:
 * @link https://jsperf.app/qiqawa/10
 */
function appendToArray(ar, add) {
  /**
   * Pre-increasing the array size has turned out
   * to be way faster when big arrays must be handled.
   * @link https://dev.to/uilicious/javascript-array-push-is-945x-faster-than-array-concat-1oki
   */
  var addSize = add.length;
  if (addSize === 0) {
    return;
  }
  var baseSize = ar.length;
  ar.length = baseSize + add.length;
  for (var i = 0; i < addSize; ++i) {
    ar[baseSize + i] = add[i];
  }
}

/**
 * @link https://gist.github.com/telekosmos/3b62a31a5c43f40849bb
 */
function uniqueArray(arrArg) {
  return arrArg.filter(function (elem, pos, arr) {
    return arr.indexOf(elem) === pos;
  });
}
function sortByObjectNumberProperty(property) {
  return (a, b) => {
    return b[property] - a[property];
  };
}
//# sourceMappingURL=utils-array.js.map