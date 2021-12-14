"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RXJS_SHARE_REPLAY_DEFAULTS = exports.RXDB_HASH_SALT = exports.RANDOM_STRING = exports.PROMISE_RESOLVE_VOID = exports.PROMISE_RESOLVE_TRUE = exports.PROMISE_RESOLVE_NULL = exports.PROMISE_RESOLVE_FALSE = void 0;
exports.adapterObject = adapterObject;
exports.batchArray = batchArray;
exports.clone = exports.blobBufferUtil = void 0;
exports.createRevision = createRevision;
exports.ensureNotFalsy = ensureNotFalsy;
exports.fastUnsecureHash = fastUnsecureHash;
exports.firstPropertyNameOfObject = firstPropertyNameOfObject;
exports.firstPropertyValueOfObject = firstPropertyValueOfObject;
exports.flatClone = flatClone;
exports.flattenObject = flattenObject;
exports.getFromMapOrThrow = getFromMapOrThrow;
exports.getFromObjectOrThrow = getFromObjectOrThrow;
exports.getHeightOfRevision = getHeightOfRevision;
exports.hash = hash;
exports.isElectronRenderer = void 0;
exports.isFolderPath = isFolderPath;
exports.lastOfArray = lastOfArray;
exports.nextTick = nextTick;
exports.now = now;
exports.overwriteGetterForCaching = overwriteGetterForCaching;
exports.parseRevision = parseRevision;
exports.pluginMissing = pluginMissing;
exports.promiseSeries = promiseSeries;
exports.promiseWait = promiseWait;
exports.randomCouchString = randomCouchString;
exports.removeOneFromArrayIfMatches = removeOneFromArrayIfMatches;
exports.requestIdleCallbackIfAvailable = requestIdleCallbackIfAvailable;
exports.requestIdlePromise = requestIdlePromise;
exports.runXTimes = runXTimes;
exports.shuffleArray = shuffleArray;
exports.sortObject = sortObject;
exports.stringifyFilter = stringifyFilter;
exports.toPromise = toPromise;
exports.trimDots = trimDots;
exports.ucfirst = ucfirst;

var _clone = _interopRequireDefault(require("clone"));

var _sparkMd = _interopRequireDefault(require("spark-md5"));

var _isElectron = _interopRequireDefault(require("is-electron"));

/**
 * Returns an error that indicates that a plugin is missing
 * We do not throw a RxError because this should not be handled
 * programmatically but by using the correct import
 */
function pluginMissing(pluginKey) {
  var keyParts = pluginKey.split('-');
  var pluginName = 'RxDB';
  keyParts.forEach(function (part) {
    pluginName += ucfirst(part);
  });
  pluginName += 'Plugin';
  return new Error("You are using a function which must be overwritten by a plugin.\n        You should either prevent the usage of this function or add the plugin via:\n            import { " + pluginName + " } from 'rxdb/plugins/" + pluginKey + "';\n            addRxPlugin(" + pluginName + ");\n        ");
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
 * Does a RxDB-specific hashing of the given data.
 * We use a static salt so using a rainbow-table
 * or google-ing the hash will not work.
 *
 * spark-md5 is used here
 * because pouchdb uses the same
 * and build-size could be reduced by 9kb
 */


var RXDB_HASH_SALT = 'rxdb-specific-hash-salt';
exports.RXDB_HASH_SALT = RXDB_HASH_SALT;

function hash(msg) {
  if (typeof msg !== 'string') {
    msg = JSON.stringify(msg);
  }

  return _sparkMd["default"].hash(RXDB_HASH_SALT + msg);
}
/**
 * Returns the current unix time in milliseconds
 * Because the accuracy of getTime() in javascript is bad,
 * and we cannot rely on performance.now() on all plattforms,
 * this method implements a way to never return the same value twice.
 * This ensures that when now() is called often, we do not loose the information
 * about which call came first and which came after.
 * Caution: Do not call this too often in a short timespan
 * because it might return 'the future'
 */


var _lastNow = 0;
/**
 * Returns the current time in milliseconds,
 * also ensures to not return the same value twice.
 */

function now() {
  var ret = new Date().getTime();

  if (ret <= _lastNow) {
    ret = _lastNow + 1;
  }

  _lastNow = ret;
  return ret;
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

var PROMISE_RESOLVE_TRUE = Promise.resolve(true);
exports.PROMISE_RESOLVE_TRUE = PROMISE_RESOLVE_TRUE;
var PROMISE_RESOLVE_FALSE = Promise.resolve(false);
exports.PROMISE_RESOLVE_FALSE = PROMISE_RESOLVE_FALSE;
var PROMISE_RESOLVE_NULL = Promise.resolve(null);
exports.PROMISE_RESOLVE_NULL = PROMISE_RESOLVE_NULL;
var PROMISE_RESOLVE_VOID = Promise.resolve();
exports.PROMISE_RESOLVE_VOID = PROMISE_RESOLVE_VOID;

function requestIdlePromise() {
  var timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

  if (typeof window === 'object' && window['requestIdleCallback']) {
    return new Promise(function (res) {
      return window['requestIdleCallback'](res, {
        timeout: timeout
      });
    });
  } else {
    return promiseWait(0);
  }
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

function runXTimes(xTimes, fn) {
  new Array(xTimes).fill(0).forEach(function (_v, idx) {
    return fn(idx);
  });
}

function ensureNotFalsy(obj) {
  if (!obj) {
    throw new Error('ensureNotFalsy() is falsy');
  }

  return obj;
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
      return sortObject(i, noArraySort);
    });
  } // object
  // array is also of type object


  if (typeof obj === 'object' && !Array.isArray(obj)) {
    if (obj instanceof RegExp) return obj;
    var out = {};
    Object.keys(obj).sort(function (a, b) {
      return a.localeCompare(b);
    }).forEach(function (key) {
      out[key] = sortObject(obj[key], noArraySort);
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
  if (value instanceof RegExp) {
    return value.toString();
  }

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
 * A random string that is never inside of any storage
 */


var RANDOM_STRING = 'Fz7SZXPmYJujkzjY1rpXWvlWBqoGAfAX';
exports.RANDOM_STRING = RANDOM_STRING;

function lastOfArray(ar) {
  return ar[ar.length - 1];
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
 * transforms the given adapter into a pouch-compatible object
 */


function adapterObject(adapter) {
  var adapterObj = {
    db: adapter
  };

  if (typeof adapter === 'string') {
    adapterObj = {
      adapter: adapter,
      db: undefined
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
/**
 * @link https://stackoverflow.com/a/11509718/3443137
 */


function firstPropertyNameOfObject(obj) {
  return Object.keys(obj)[0];
}

function firstPropertyValueOfObject(obj) {
  var key = Object.keys(obj)[0];
  return obj[key];
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

function parseRevision(revision) {
  var split = revision.split('-');
  return {
    height: parseInt(split[0], 10),
    hash: split[1]
  };
}

function getHeightOfRevision(revision) {
  return parseRevision(revision).height;
}
/**
 * Creates a revision string that does NOT include the revision height
 * Copied and adapted from pouchdb-utils/src/rev.js
 * 
 * We use our own function so RxDB usage without pouchdb RxStorage
 * does not include pouchdb code in the bundle.
 */


function createRevision(docData) {
  var docWithoutRev = Object.assign({}, docData, {
    _rev_tree: undefined
  });
  var diggestString = JSON.stringify(docWithoutRev);
  return _sparkMd["default"].hash(diggestString);
}
/**
 * overwrites the getter with the actual value
 * Mostly used for caching stuff on the first run
 */


function overwriteGetterForCaching(obj, getterName, value) {
  Object.defineProperty(obj, getterName, {
    get: function get() {
      return value;
    }
  });
  return value;
}
/**
 * returns true if the given name is likely a folder path
 */


function isFolderPath(name) {
  // do not check, if foldername is given
  if (name.includes('/') || // unix
  name.includes('\\') // windows
  ) {
    return true;
  } else {
    return false;
  }
}

function getFromMapOrThrow(map, key) {
  var val = map.get(key);

  if (!val) {
    throw new Error('missing value from map ' + key);
  }

  return val;
}

function getFromObjectOrThrow(obj, key) {
  var val = obj[key];

  if (!val) {
    throw new Error('missing value from object ' + key);
  }

  return val;
}

var blobBufferUtil = {
  /**
   * depending if we are on node or browser,
   * we have to use Buffer(node) or Blob(browser)
   */
  createBlobBuffer: function createBlobBuffer(data, type) {
    var blobBuffer;

    if (isElectronRenderer) {
      // if we are inside of electron-renderer, always use the node-buffer
      return Buffer.from(data, {
        type: type
      });
    }

    try {
      // for browsers
      blobBuffer = new Blob([data], {
        type: type
      });
    } catch (e) {
      // for node
      blobBuffer = Buffer.from(data, {
        type: type
      });
    }

    return blobBuffer;
  },
  isBlobBuffer: function isBlobBuffer(data) {
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data) || data instanceof Blob) {
      return true;
    } else {
      return false;
    }
  },
  toString: function toString(blobBuffer) {
    if (typeof Buffer !== 'undefined' && blobBuffer instanceof Buffer) {
      // node
      return nextTick().then(function () {
        return blobBuffer.toString();
      });
    }

    return new Promise(function (res) {
      // browser
      var reader = new FileReader();
      reader.addEventListener('loadend', function (e) {
        var text = e.target.result;
        res(text);
      });
      var blobBufferType = Object.prototype.toString.call(blobBuffer);
      /**
       * in the electron-renderer we have a typed array insteaf of a blob
       * so we have to transform it.
       * @link https://github.com/pubkey/rxdb/issues/1371
       */

      if (blobBufferType === '[object Uint8Array]') {
        blobBuffer = new Blob([blobBuffer]);
      }

      reader.readAsText(blobBuffer);
    });
  },
  size: function size(blobBuffer) {
    if (typeof Buffer !== 'undefined' && blobBuffer instanceof Buffer) {
      // node
      return Buffer.byteLength(blobBuffer);
    } else {
      // browser
      return blobBuffer.size;
    }
  }
};
exports.blobBufferUtil = blobBufferUtil;

/**
 * Using shareReplay() without settings will not unsubscribe
 * if there are no more subscribers.
 * So we use these defaults.
 * @link https://cartant.medium.com/rxjs-whats-changed-with-sharereplay-65c098843e95
 */
var RXJS_SHARE_REPLAY_DEFAULTS = {
  bufferSize: 1,
  refCount: true
};
exports.RXJS_SHARE_REPLAY_DEFAULTS = RXJS_SHARE_REPLAY_DEFAULTS;
//# sourceMappingURL=util.js.map