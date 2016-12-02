'use strict';
// taken from rvagg/memdown commit 2078b40
exports.sortedIndexOf = function(arr, item) {
  var low = 0;
  var high = arr.length;
  var mid;
  while (low < high) {
    mid = (low + high) >>> 1;
    if (arr[mid] < item) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
};
