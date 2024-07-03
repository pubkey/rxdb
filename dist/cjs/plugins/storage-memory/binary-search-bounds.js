"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.boundEQ = boundEQ;
exports.boundGE = boundGE;
exports.boundGT = boundGT;
exports.boundLE = boundLE;
exports.boundLT = boundLT;
/**
 * Everything in this file was copied and adapted from
 * @link https://github.com/mikolalysenko/binary-search-bounds
 *
 * TODO We should use the original npm module instead when this bug is fixed:
 * @link https://github.com/mikolalysenko/binary-search-bounds/pull/14
 */

function ge(a, y, c, l, h) {
  var i = h + 1;
  while (l <= h) {
    var m = l + h >>> 1;
    var x = a[m];
    var p = c !== undefined ? c(x, y) : x - y;
    if (p >= 0) {
      i = m;
      h = m - 1;
    } else {
      l = m + 1;
    }
  }
  return i;
}
function gt(a, y, c, l, h) {
  var i = h + 1;
  while (l <= h) {
    var m = l + h >>> 1;
    var x = a[m];
    var p = c !== undefined ? c(x, y) : x - y;
    if (p > 0) {
      i = m;
      h = m - 1;
    } else {
      l = m + 1;
    }
  }
  return i;
}
function lt(a, y, c, l, h) {
  var i = l - 1;
  while (l <= h) {
    var m = l + h >>> 1,
      x = a[m];
    var p = c !== undefined ? c(x, y) : x - y;
    if (p < 0) {
      i = m;
      l = m + 1;
    } else {
      h = m - 1;
    }
  }
  return i;
}
function le(a, y, c, l, h) {
  var i = l - 1;
  while (l <= h) {
    var m = l + h >>> 1,
      x = a[m];
    var p = c !== undefined ? c(x, y) : x - y;
    if (p <= 0) {
      i = m;
      l = m + 1;
    } else {
      h = m - 1;
    }
  }
  return i;
}
function eq(a, y, c, l, h) {
  while (l <= h) {
    var m = l + h >>> 1,
      x = a[m];
    var p = c !== undefined ? c(x, y) : x - y;
    if (p === 0) {
      return m;
    }
    if (p <= 0) {
      l = m + 1;
    } else {
      h = m - 1;
    }
  }
  return -1;
}
function norm(a, y, c, l, h, f) {
  return f(a, y, c, l === undefined ? 0 : l | 0, h === undefined ? a.length - 1 : h | 0);
}
function boundGE(a, y, c, l, h) {
  return norm(a, y, c, l, h, ge);
}
function boundGT(a, y, c, l, h) {
  return norm(a, y, c, l, h, gt);
}
function boundLT(a, y, c, l, h) {
  return norm(a, y, c, l, h, lt);
}
function boundLE(a, y, c, l, h) {
  return norm(a, y, c, l, h, le);
}
function boundEQ(a, y, c, l, h) {
  return norm(a, y, c, l, h, eq);
}
//# sourceMappingURL=binary-search-bounds.js.map