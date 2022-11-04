"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RX_META_LWT_MINIMUM = exports.RXJS_SHARE_REPLAY_DEFAULTS = exports.RANDOM_STRING = exports.PROMISE_RESOLVE_VOID = exports.PROMISE_RESOLVE_TRUE = exports.PROMISE_RESOLVE_NULL = exports.PROMISE_RESOLVE_FALSE = void 0;
exports.adapterObject = adapterObject;
exports.areRxDocumentArraysEqual = areRxDocumentArraysEqual;
exports.arrayBufferToBase64 = arrayBufferToBase64;
exports.arrayFilterNotEmpty = arrayFilterNotEmpty;
exports.b64DecodeUnicode = b64DecodeUnicode;
exports.b64EncodeUnicode = b64EncodeUnicode;
exports.batchArray = batchArray;
exports.clone = exports.blobBufferUtil = void 0;
exports.createRevision = createRevision;
exports.deepFreeze = deepFreeze;
exports.defaultHashFunction = defaultHashFunction;
exports.ensureInteger = ensureInteger;
exports.ensureNotFalsy = ensureNotFalsy;
exports.fastUnsecureHash = fastUnsecureHash;
exports.firstPropertyNameOfObject = firstPropertyNameOfObject;
exports.firstPropertyValueOfObject = firstPropertyValueOfObject;
exports.flatClone = flatClone;
exports.flattenObject = flattenObject;
exports.getDefaultRevision = getDefaultRevision;
exports.getDefaultRxDocumentMeta = getDefaultRxDocumentMeta;
exports.getFromMapOrThrow = getFromMapOrThrow;
exports.getFromObjectOrThrow = getFromObjectOrThrow;
exports.getHeightOfRevision = getHeightOfRevision;
exports.getSortDocumentsByLastWriteTimeComparator = getSortDocumentsByLastWriteTimeComparator;
exports.isElectronRenderer = void 0;
exports.isFolderPath = isFolderPath;
exports.isMaybeReadonlyArray = isMaybeReadonlyArray;
exports.lastOfArray = lastOfArray;
exports.nextTick = nextTick;
exports.now = now;
exports.objectPathMonad = objectPathMonad;
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
exports.sortDocumentsByLastWriteTime = sortDocumentsByLastWriteTime;
exports.sortObject = sortObject;
exports.stringifyFilter = stringifyFilter;
exports.toPromise = toPromise;
exports.trimDots = trimDots;
exports.ucfirst = ucfirst;
var _clone = _interopRequireDefault(require("clone"));
var _isElectron = _interopRequireDefault(require("is-electron"));
var _jsBase = require("js-base64");
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
 * This is a very fast hash method
 * but it is not cryptographically secure.
 * For each run it will append a number between 0 and 2147483647 (=biggest 32 bit int).
 * @link http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
 * @return a string as hash-result
 */
function fastUnsecureHash(inputString,
// used to test the polyfill
doNotUseTextEncoder) {
  var hashValue = 0,
    i,
    chr,
    len;

  /**
   * For better performance we first transform all
   * chars into their ascii numbers at once.
   * 
   * This is what makes the murmurhash implementation such fast.
   * @link https://github.com/perezd/node-murmurhash/blob/master/murmurhash.js#L4
   */
  var encoded;

  /**
   * All modern browsers support the TextEncoder
   * @link https://caniuse.com/textencoder
   * But to make RxDB work in other JavaScript runtimes,
   * like when using it in flutter or QuickJS, we need to
   * make it work even when there is no TextEncoder.
   */
  if (typeof TextEncoder !== 'undefined' && !doNotUseTextEncoder) {
    encoded = new TextEncoder().encode(inputString);
  } else {
    encoded = [];
    for (var _i = 0; _i < inputString.length; _i++) {
      encoded.push(inputString.charCodeAt(_i));
    }
  }
  for (i = 0, len = inputString.length; i < len; i++) {
    chr = encoded[i];
    hashValue = (hashValue << 5) - hashValue + chr;
    hashValue |= 0; // Convert to 32bit integer
  }

  if (hashValue < 0) {
    hashValue = hashValue * -1;
  }

  /**
   * To make the output smaller
   * but still have it to represent the same value,
   * we use the biggest radix of 36 instead of just
   * transforming it into a hex string.
   */
  return hashValue.toString(36);
}

/**
 * Default hash method used to create revision hashes
 * that do not have to be cryptographically secure.
 * IMPORTANT: Changing the default hashing method
 * requires a BREAKING change!
 */
function defaultHashFunction(input) {
  return fastUnsecureHash(input);
}

/**
 * Returns the current unix time in milliseconds (with two decmials!)
 * Because the accuracy of getTime() in javascript is bad,
 * and we cannot rely on performance.now() on all platforms,
 * this method implements a way to never return the same value twice.
 * This ensures that when now() is called often, we do not loose the information
 * about which call came first and which came after.
 * 
 * We had to move from having no decimals, to having two decimal
 * because it turned out that some storages are such fast that
 * calling this method too often would return 'the future'.
 */
var _lastNow = 0;
/**
 * Returns the current time in milliseconds,
 * also ensures to not return the same value twice.
 */
function now() {
  var ret = new Date().getTime();
  ret = ret + 0.01;
  if (ret <= _lastNow) {
    ret = _lastNow + 0.01;
  }

  /**
   * Strip the returned number to max two decimals.
   * In theory we would not need this but
   * in practice JavaScript has no such good number precision
   * so rounding errors could add another decimal place.
   */
  var twoDecimals = parseFloat(ret.toFixed(2));
  _lastNow = twoDecimals;
  return twoDecimals;
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
  }

  // end
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
function ensureInteger(obj) {
  if (!Number.isInteger(obj)) {
    throw new Error('ensureInteger() is falsy');
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
  }

  // object
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
  }

  // everything else
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
 * Creates the next write revision for a given document.
 */
function createRevision(hashFunction, docData, previousDocData) {
  var previousRevision = previousDocData ? previousDocData._rev : null;
  var previousRevisionHeigth = previousRevision ? parseRevision(previousRevision).height : 0;
  var newRevisionHeight = previousRevisionHeigth + 1;
  var docWithoutRev = Object.assign({}, docData, {
    _rev: undefined,
    _rev_tree: undefined,
    /**
     * All _meta properties MUST NOT be part of the
     * revision hash.
     * Plugins might temporarily store data in the _meta
     * field and strip it away when the document is replicated
     * or written to another storage.
     */
    _meta: undefined
  });

  /**
   * The revision height must be part of the hash
   * as the last parameter of the document data.
   * This is required to ensure we never ever create
   * two different document states that have the same revision
   * hash. Even writing the exact same document data
   * must have to result in a different hash so that
   * the replication can known if the state just looks equal
   * or if it is really exactly the equal state in data and time.
   */
  delete docWithoutRev._rev;
  docWithoutRev._rev = previousDocData ? newRevisionHeight : 1;
  var diggestString = JSON.stringify(docWithoutRev);
  var revisionHash = hashFunction(diggestString);
  return newRevisionHeight + '-' + revisionHash;
}

/**
 * Faster way to check the equalness of document lists
 * compared to doing a deep-equal.
 * Here we only check the ids and revisions.
 */
function areRxDocumentArraysEqual(primaryPath, ar1, ar2) {
  if (ar1.length !== ar2.length) {
    return false;
  }
  var i = 0;
  var len = ar1.length;
  while (i < len) {
    var row1 = ar1[i];
    var row2 = ar2[i];
    i++;
    if (row1._rev !== row2._rev || row1[primaryPath] !== row2[primaryPath]) {
      return false;
    }
  }
  return true;
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
  if (name.includes('/') ||
  // unix
  name.includes('\\') // windows
  ) {
    return true;
  } else {
    return false;
  }
}
function getFromMapOrThrow(map, key) {
  var val = map.get(key);
  if (typeof val === 'undefined') {
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

/**
 * NO! We cannot just use btoa() and atob()
 * because they do not work correctly with binary data.
 * @link https://stackoverflow.com/q/30106476/3443137
 */

/**
 * atob() and btoa() do not work well with non ascii chars,
 * so we have to use these helper methods instead.
 * @link https://stackoverflow.com/a/30106551/3443137
 */
// Encoding UTF8 -> base64
function b64EncodeUnicode(str) {
  return (0, _jsBase.encode)(str);
}

// Decoding base64 -> UTF8
function b64DecodeUnicode(str) {
  return (0, _jsBase.decode)(str);
}

/**
 * @link https://stackoverflow.com/a/9458996/3443137
 */
function arrayBufferToBase64(buffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * This is an abstraction over the Blob/Buffer data structure.
 * We need this because it behaves different in different JavaScript runtimes.
 * Since RxDB 13.0.0 we switch to Blob-only because Node.js does not support
 * the Blob data structure which is also supported by the browsers.
 */
var blobBufferUtil = {
  /**
   * depending if we are on node or browser,
   * we have to use Buffer(node) or Blob(browser)
   */
  createBlobBuffer: function createBlobBuffer(data, type) {
    var blobBuffer = new Blob([data], {
      type: type
    });
    return blobBuffer;
  },
  /**
   * depending if we are on node or browser,
   * we have to use Buffer(node) or Blob(browser)
   */
  createBlobBufferFromBase64: function createBlobBufferFromBase64(base64String, type) {
    try {
      return Promise.resolve(fetch("data:" + type + ";base64," + base64String)).then(function (base64Response) {
        return Promise.resolve(base64Response.blob());
      });
    } catch (e) {
      return Promise.reject(e);
    }
  },
  isBlobBuffer: function isBlobBuffer(data) {
    if (data instanceof Blob || typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
      return true;
    } else {
      return false;
    }
  },
  toString: function toString(blobBuffer) {
    /**
     * in the electron-renderer we have a typed array insteaf of a blob
     * so we have to transform it.
     * @link https://github.com/pubkey/rxdb/issues/1371
     */
    var blobBufferType = Object.prototype.toString.call(blobBuffer);
    if (blobBufferType === '[object Uint8Array]') {
      blobBuffer = new Blob([blobBuffer]);
    }
    if (typeof blobBuffer === 'string') {
      return Promise.resolve(blobBuffer);
    }
    return blobBuffer.text();
  },
  toBase64String: function toBase64String(blobBuffer) {
    try {
      if (typeof blobBuffer === 'string') {
        return Promise.resolve(blobBuffer);
      }

      /**
       * in the electron-renderer we have a typed array insteaf of a blob
       * so we have to transform it.
       * @link https://github.com/pubkey/rxdb/issues/1371
       */
      var blobBufferType = Object.prototype.toString.call(blobBuffer);
      if (blobBufferType === '[object Uint8Array]') {
        blobBuffer = new Blob([blobBuffer]);
      }
      return Promise.resolve(fetch(URL.createObjectURL(blobBuffer)).then(function (res) {
        return res.arrayBuffer();
      })).then(arrayBufferToBase64);
    } catch (e) {
      return Promise.reject(e);
    }
  },
  size: function size(blobBuffer) {
    return blobBuffer.size;
  }
};

/**
 * Using shareReplay() without settings will not unsubscribe
 * if there are no more subscribers.
 * So we use these defaults.
 * @link https://cartant.medium.com/rxjs-whats-changed-with-sharereplay-65c098843e95
 */
exports.blobBufferUtil = blobBufferUtil;
var RXJS_SHARE_REPLAY_DEFAULTS = {
  bufferSize: 1,
  refCount: true
};

/**
 * We use 1 as minimum so that the value is never falsy.
 * This const is used in several places because querying
 * with a value lower then the minimum could give false results.
 */
exports.RXJS_SHARE_REPLAY_DEFAULTS = RXJS_SHARE_REPLAY_DEFAULTS;
var RX_META_LWT_MINIMUM = 1;
exports.RX_META_LWT_MINIMUM = RX_META_LWT_MINIMUM;
function getDefaultRxDocumentMeta() {
  return {
    /**
     * Set this to 1 to not waste performance
     * while calling new Date()..
     * The storage wrappers will anyway update
     * the lastWrite time while calling transformDocumentDataFromRxDBToRxStorage()
     */
    lwt: RX_META_LWT_MINIMUM
  };
}

/**
 * Returns a revision that is not valid.
 * Use this to have correct typings
 * while the storage wrapper anyway will overwrite the revision.
 */
function getDefaultRevision() {
  /**
   * Use a non-valid revision format,
   * to ensure that the RxStorage will throw
   * when the revision is not replaced downstream.
   */
  return '';
}
function getSortDocumentsByLastWriteTimeComparator(primaryPath) {
  return function (a, b) {
    if (a._meta.lwt === b._meta.lwt) {
      if (b[primaryPath] < a[primaryPath]) {
        return 1;
      } else {
        return -1;
      }
    } else {
      return a._meta.lwt - b._meta.lwt;
    }
  };
}
function sortDocumentsByLastWriteTime(primaryPath, docs) {
  return docs.sort(getSortDocumentsByLastWriteTimeComparator(primaryPath));
}

/**
 * To get specific nested path values from objects,
 * RxDB normally uses the 'object-path' npm module.
 * But when performance is really relevant, this is not fast enough.
 * Instead we use a monad that can prepare some stuff up front
 * and we can re-use the generated function.
 */

function objectPathMonad(objectPath) {
  var split = objectPath.split('.');

  /**
   * Performance shortcut,
   * if no nested path is used,
   * directly return the field of the object.
   */
  if (split.length === 1) {
    return function (obj) {
      return obj[objectPath];
    };
  }
  return function (obj) {
    var currentVal = obj;
    var t = 0;
    while (t < split.length) {
      var subPath = split[t];
      currentVal = currentVal[subPath];
      if (typeof currentVal === 'undefined') {
        return currentVal;
      }
      t++;
    }
    return currentVal;
  };
}
function deepFreeze(o) {
  Object.freeze(o);
  Object.getOwnPropertyNames(o).forEach(function (prop) {
    if (o.hasOwnProperty(prop) && o[prop] !== null && (typeof o[prop] === 'object' || typeof o[prop] === 'function') && !Object.isFrozen(o[prop])) {
      deepFreeze(o[prop]);
    }
  });
  return o;
}
//# sourceMappingURL=util.js.map