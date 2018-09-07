"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isLevelDown = isLevelDown;
exports.fastUnsecureHash = fastUnsecureHash;
exports.hash = hash;
exports.generateId = generateId;
exports.nextTick = nextTick;
exports.promiseWait = promiseWait;
exports.requestIdlePromise = requestIdlePromise;
exports.promiseSeries = promiseSeries;
exports.requestIdleCallbackIfAvailable = requestIdleCallbackIfAvailable;
exports.ucfirst = ucfirst;
exports.numberToLetter = numberToLetter;
exports.trimDots = trimDots;
exports.validateCouchDBString = validateCouchDBString;
exports.sortObject = sortObject;
exports.stringifyFilter = stringifyFilter;
exports.pouchReplicationFunction = pouchReplicationFunction;
exports.randomCouchString = randomCouchString;
exports.shuffleArray = shuffleArray;
exports.adapterObject = adapterObject;
exports.flattenObject = flattenObject;
exports.getHeightOfRevision = getHeightOfRevision;
exports.isElectronRenderer = exports.clone = void 0;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _randomToken = _interopRequireDefault(require("random-token"));

var _rxError = _interopRequireDefault(require("./rx-error"));

var _clone = _interopRequireDefault(require("clone"));

var _sparkMd = _interopRequireDefault(require("spark-md5"));

var _isElectron = _interopRequireDefault(require("is-electron"));

/**
 * this contains a mapping to basic dependencies
 * which should be easy to change
 */

/**
 * check if the given module is a leveldown-adapter
 * throws if not
 */
function isLevelDown(adapter) {
  if (!adapter || typeof adapter.super_ !== 'function') {
    throw _rxError["default"].newRxError('UT4', {
      adapter: adapter
    });
  }
}
/**
 * this is a very fast hashing but its unsecure
 * @link http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
 * @param  {object} obj
 * @return {number} a number as hash-result
 */


function fastUnsecureHash(obj) {
  if (typeof obj !== 'string') obj = JSON.stringify(obj);
  var hash = 0,
      i,
      chr,
      len;
  if (obj.length === 0) return hash;

  for (i = 0, len = obj.length; i < len; i++) {
    chr = obj.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }

  if (hash < 0) hash = hash * -1;
  return hash;
}
/**
 *  spark-md5 is used here
 *  because pouchdb uses the same
 *  and build-size could be reduced by 9kb
 */


function hash(obj) {
  var msg = obj;
  if (typeof obj !== 'string') msg = JSON.stringify(obj);
  return _sparkMd["default"].hash(msg);
}
/**
 * generate a new _id as db-primary-key
 * @return {string}
 */


function generateId() {
  return (0, _randomToken["default"])(10) + ':' + new Date().getTime();
}
/**
 * returns a promise that resolves on the next tick
 * @return {Promise}
 */


function nextTick() {
  return new Promise(function (res) {
    return setTimeout(res, 0);
  });
}
/**
 * [promiseWait description]
 * @param  {Number}  [ms=0]
 * @return {Promise}
 */


function promiseWait() {
  var ms = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  return new Promise(function (res) {
    return setTimeout(res, ms);
  });
}

function requestIdlePromise() {
  var timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

  if ((typeof window === "undefined" ? "undefined" : (0, _typeof2["default"])(window)) === 'object' && window.requestIdleCallback) {
    return new Promise(function (res) {
      return window.requestIdleCallback(res, {
        timeout: timeout
      });
    });
  } else return Promise.resolve();
}
/**
 * like Promise.all() but runs in series instead of parallel
 * @link https://github.com/egoist/promise.series/blob/master/index.js
 * @param {Function[]} tasks array with functions that return a promise
 * @return {Promise<Array>}
 */


function promiseSeries(tasks, initial) {
  return tasks.reduce(function (current, next) {
    return current.then(next);
  }, Promise.resolve(initial));
}
/**
 * run the callback if requestIdleCallback available
 * do nothing if not
 * @link https://developer.mozilla.org/de/docs/Web/API/Window/requestIdleCallback
 * @param  {function} fun
 * @return {void}
 */


function requestIdleCallbackIfAvailable(fun) {
  if ((typeof window === "undefined" ? "undefined" : (0, _typeof2["default"])(window)) === 'object' && window.requestIdleCallback) window.requestIdleCallback(fun);
}
/**
 * uppercase first char
 * @param  {string} str
 * @return {string} Str
 */


function ucfirst(str) {
  str += '';
  var f = str.charAt(0).toUpperCase();
  return f + str.substr(1);
}
/**
 * @link https://de.wikipedia.org/wiki/Base58
 * this does not start with the numbers to generate valid variable-names
 */


var base58Chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ123456789';
var base58Length = base58Chars.length;
/**
 * transform a number to a string by using only base58 chars
 * @link https://github.com/matthewmueller/number-to-letter/blob/master/index.js
 * @param {number} nr                                       | 10000000
 * @return {string} the string-representation of the number | '2oMX'
 */

function numberToLetter(nr) {
  var digits = [];

  do {
    var v = nr % base58Length;
    digits.push(v);
    nr = Math.floor(nr / base58Length);
  } while (nr-- > 0);

  return digits.reverse().map(function (d) {
    return base58Chars[d];
  }).join('');
}
/**
 * removes trailing and ending dots from the string
 * @param  {string} str
 * @return {string} str without wrapping dots
 */


function trimDots(str) {
  // start
  while (str.charAt(0) === '.') {
    str = str.substr(1);
  } // end


  while (str.slice(-1) === '.') {
    str = str.slice(0, -1);
  }

  return str;
}
/**
 * validates that a given string is ok to be used with couchdb-collection-names
 * @link https://wiki.apache.org/couchdb/HTTP_database_API
 * @param  {string} name
 * @throws  {Error}
 * @return {boolean} true
 */


function validateCouchDBString(name) {
  if (typeof name !== 'string' || name.length === 0) {
    throw _rxError["default"].newRxTypeError('UT1', {
      name: name
    });
  } // do not check, if foldername is given


  if (name.includes('/') || // unix
  name.includes('\\') // windows
  ) return true;
  var regStr = '^[a-z][_$a-z0-9]*$';
  var reg = new RegExp(regStr);

  if (!name.match(reg)) {
    throw _rxError["default"].newRxError('UT2', {
      regex: regStr,
      givenName: name
    });
  }

  return true;
}
/**
 * deep-sort an object so its attributes are in lexical order.
 * Also sorts the arrays inside of the object if no-array-sort not set
 * @param  {Object} obj unsorted
 * @param  {?boolean} noArraysort
 * @return {Object} sorted
 */


function sortObject(obj) {
  var noArraySort = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  if (!obj) return obj; // do not sort null, false or undefined
  // array

  if (!noArraySort && Array.isArray(obj)) {
    return obj.sort(function (a, b) {
      if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
      if ((0, _typeof2["default"])(a) === 'object') return 1;else return -1;
    }).map(function (i) {
      return sortObject(i);
    });
  } // object


  if ((0, _typeof2["default"])(obj) === 'object') {
    if (obj instanceof RegExp) return obj;
    var out = {};
    Object.keys(obj).sort(function (a, b) {
      return a.localeCompare(b);
    }).forEach(function (key) {
      out[key] = sortObject(obj[key]);
    });
    return out;
  } // everything else


  return obj;
}
/**
 * used to JSON.stringify() objects that contain a regex
 * @link https://stackoverflow.com/a/33416684 thank you Fabian Jakobs!
 */


function stringifyFilter(key, value) {
  if (value instanceof RegExp) return value.toString();
  return value;
}
/**
 * get the correct function-name for pouchdb-replication
 * @param {object} pouch - instance of pouchdb
 * @return {function}
 */


function pouchReplicationFunction(pouch, _ref) {
  var _ref$pull = _ref.pull,
      pull = _ref$pull === void 0 ? true : _ref$pull,
      _ref$push = _ref.push,
      push = _ref$push === void 0 ? true : _ref$push;
  if (pull && push) return pouch.sync.bind(pouch);
  if (!pull && push) return pouch.replicate.to.bind(pouch);
  if (pull && !push) return pouch.replicate.from.bind(pouch);

  if (!pull && !push) {
    throw _rxError["default"].newRxError('UT3', {
      pull: pull,
      push: push
    });
  }
}
/**
 * get a random string which can be used with couchdb
 * @link http://stackoverflow.com/a/1349426/3443137
 * @param {number} [length=10] length
 * @return {string}
 */


function randomCouchString() {
  var length = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
  var text = '';
  var possible = 'abcdefghijklmnopqrstuvwxyz';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}
/**
 * shuffle the given array
 * @param  {Array<any>} arr
 * @return {Array<any>}
 */


function shuffleArray(arr) {
  return arr.sort(function () {
    return Math.random() - 0.5;
  });
}
/**
 * transforms the given adapter into a pouch-compatible object
 * @return {Object} adapterObject
 */


function adapterObject(adapter) {
  var adapterObj = {
    db: adapter
  };

  if (typeof adapter === 'string') {
    adapterObj = {
      adapter: adapter
    };
  }

  return adapterObj;
}

function recursiveDeepCopy(o) {
  if (!o) return o;
  return (0, _clone["default"])(o, false);
}

var clone = recursiveDeepCopy;
exports.clone = clone;
var isElectronRenderer = (0, _isElectron["default"])();
/**
 * returns a flattened object
 * @link https://gist.github.com/penguinboy/762197
 */

exports.isElectronRenderer = isElectronRenderer;

function flattenObject(ob) {
  var toReturn = {};

  for (var i in ob) {
    if (!ob.hasOwnProperty(i)) continue;

    if ((0, _typeof2["default"])(ob[i]) == 'object') {
      var flatObject = flattenObject(ob[i]);

      for (var x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue;
        toReturn[i + '.' + x] = flatObject[x];
      }
    } else {
      toReturn[i] = ob[i];
    }
  }

  return toReturn;
}
/**
 *
 * @param {string} revString
 * @return {number}
 */


function getHeightOfRevision(revString) {
  var first = revString.split('-')[0];
  return parseInt(first);
}
