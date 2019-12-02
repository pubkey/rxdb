"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pluginMissing = pluginMissing;
exports.fastUnsecureHash = fastUnsecureHash;
exports.hash = hash;
exports.generateId = generateId;
exports.nextTick = nextTick;
exports.promiseWait = promiseWait;
exports.toPromise = toPromise;
exports.requestIdlePromise = requestIdlePromise;
exports.promiseSeries = promiseSeries;
exports.requestIdleCallbackIfAvailable = requestIdleCallbackIfAvailable;
exports.ucfirst = ucfirst;
exports.numberToLetter = numberToLetter;
exports.trimDots = trimDots;
exports.sortObject = sortObject;
exports.stringifyFilter = stringifyFilter;
exports.randomCouchString = randomCouchString;
exports.shuffleArray = shuffleArray;
exports.removeOneFromArrayIfMatches = removeOneFromArrayIfMatches;
exports.adapterObject = adapterObject;
exports.flatClone = flatClone;
exports.flattenObject = flattenObject;
exports.getHeightOfRevision = getHeightOfRevision;
exports.LOCAL_PREFIX = exports.isElectronRenderer = exports.clone = void 0;

var _randomToken = _interopRequireDefault(require("random-token"));

var _clone = _interopRequireDefault(require("clone"));

var _sparkMd = _interopRequireDefault(require("spark-md5"));

var _isElectron = _interopRequireDefault(require("is-electron"));

/**
 * this contains a mapping to basic dependencies
 * which should be easy to change
 */

/**
 * Returns an error that indicates that a plugin is missing
 * We do not throw a RxError because this should not be handled
 * programmatically but by using the correct import
 */
function pluginMissing(pluginKey) {
  return new Error("You are using a function which must be overwritten by a plugin.\n        You should either prevent the usage of this function or add the plugin via:\n          - es5-require:\n            RxDB.plugin(require('rxdb/plugins/" + pluginKey + "'))\n          - es6-import:\n            import " + ucfirst(pluginKey) + "Plugin from 'rxdb/plugins/" + pluginKey + "';\n            RxDB.plugin(" + ucfirst(pluginKey) + "Plugin);\n        ");
}
/**
 * this is a very fast hashing but its unsecure
 * @link http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
 * @return a number as hash-result
 */


function fastUnsecureHash(obj) {
  if (typeof obj !== 'string') obj = JSON.stringify(obj);
  var hashValue = 0,
      i,
      chr,
      len;
  if (obj.length === 0) return hashValue;

  for (i = 0, len = obj.length; i < len; i++) {
    chr = obj.charCodeAt(i); // tslint:disable-next-line

    hashValue = (hashValue << 5) - hashValue + chr; // tslint:disable-next-line

    hashValue |= 0; // Convert to 32bit integer
  }

  if (hashValue < 0) hashValue = hashValue * -1;
  return hashValue;
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
 */


function generateId() {
  return (0, _randomToken["default"])(10) + ':' + new Date().getTime();
}
/**
 * returns a promise that resolves on the next tick
 */


function nextTick() {
  return new Promise(function (res) {
    return setTimeout(res, 0);
  });
}

function promiseWait() {
  var ms = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  return new Promise(function (res) {
    return setTimeout(res, ms);
  });
}

function toPromise(maybePromise) {
  if (maybePromise && typeof maybePromise.then === 'function') {
    // is promise
    return maybePromise;
  } else {
    return Promise.resolve(maybePromise);
  }
}

function requestIdlePromise() {
  var timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

  if (typeof window === 'object' && window['requestIdleCallback']) {
    return new Promise(function (res) {
      return window['requestIdleCallback'](res, {
        timeout: timeout
      });
    });
  } else return Promise.resolve();
}
/**
 * like Promise.all() but runs in series instead of parallel
 * @link https://github.com/egoist/promise.series/blob/master/index.js
 * @param tasks array with functions that return a promise
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
 */


function requestIdleCallbackIfAvailable(fun) {
  if (typeof window === 'object' && window['requestIdleCallback']) window['requestIdleCallback'](fun);
}
/**
 * uppercase first char
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
 * @param nr                                       | 10000000
 * @return the string-representation of the number | '2oMX'
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
 * deep-sort an object so its attributes are in lexical order.
 * Also sorts the arrays inside of the object if no-array-sort not set
 */


function sortObject(obj) {
  var noArraySort = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  if (!obj) return obj; // do not sort null, false or undefined
  // array

  if (!noArraySort && Array.isArray(obj)) {
    return obj.sort(function (a, b) {
      if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
      if (typeof a === 'object') return 1;else return -1;
    }).map(function (i) {
      return sortObject(i);
    });
  } // object


  if (typeof obj === 'object') {
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
 * get a random string which can be used with couchdb
 * @link http://stackoverflow.com/a/1349426/3443137
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
 */


function shuffleArray(arr) {
  return arr.sort(function () {
    return Math.random() - 0.5;
  });
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
 * transforms the given adapter into a pouch-compatible object
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
/**
 * does a flat copy on the objects,
 * is about 3 times faster then using deepClone
 * @link https://jsperf.com/object-rest-spread-vs-clone/2
 */

exports.clone = clone;

function flatClone(obj) {
  return Object.assign({}, obj);
}

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

    if (typeof ob[i] === 'object') {
      var flatObject = flattenObject(ob[i]);

      for (var _x in flatObject) {
        if (!flatObject.hasOwnProperty(_x)) continue;
        toReturn[i + '.' + _x] = flatObject[_x];
      }
    } else {
      toReturn[i] = ob[i];
    }
  }

  return toReturn;
}

function getHeightOfRevision(revString) {
  var first = revString.split('-')[0];
  return parseInt(first, 10);
}
/**
 * prefix of local documents
 * TODO check if this variable exists somewhere else
 */


var LOCAL_PREFIX = '_local/';
exports.LOCAL_PREFIX = LOCAL_PREFIX;

//# sourceMappingURL=util.js.map