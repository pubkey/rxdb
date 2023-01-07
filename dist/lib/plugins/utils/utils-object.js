"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.clone = void 0;
exports.deepFreeze = deepFreeze;
exports.firstPropertyNameOfObject = firstPropertyNameOfObject;
exports.firstPropertyValueOfObject = firstPropertyValueOfObject;
exports.flatClone = flatClone;
exports.flattenObject = flattenObject;
exports.getFromObjectOrThrow = getFromObjectOrThrow;
exports.objectPathMonad = objectPathMonad;
exports.overwriteGetterForCaching = overwriteGetterForCaching;
exports.sortObject = sortObject;
exports.stringifyFilter = stringifyFilter;
function deepFreeze(o) {
  Object.freeze(o);
  Object.getOwnPropertyNames(o).forEach(function (prop) {
    if (o.hasOwnProperty(prop) && o[prop] !== null && (typeof o[prop] === 'object' || typeof o[prop] === 'function') && !Object.isFrozen(o[prop])) {
      deepFreeze(o[prop]);
    }
  });
  return o;
}

/**
 * To get specific nested path values from objects,
 * RxDB normally uses the 'dot-prop' npm module.
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
    return obj => obj[objectPath];
  }
  return obj => {
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
function getFromObjectOrThrow(obj, key) {
  var val = obj[key];
  if (!val) {
    throw new Error('missing value from object ' + key);
  }
  return val;
}

/**
 * returns a flattened object
 * @link https://gist.github.com/penguinboy/762197
 */
function flattenObject(ob) {
  var toReturn = {};
  for (var i in ob) {
    if (!ob.hasOwnProperty(i)) continue;
    if (typeof ob[i] === 'object') {
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
 * does a flat copy on the objects,
 * is about 3 times faster then using deepClone
 * @link https://jsperf.com/object-rest-spread-vs-clone/2
 */
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

/**
 * deep-sort an object so its attributes are in lexical order.
 * Also sorts the arrays inside of the object if no-array-sort not set
 */
function sortObject(obj, noArraySort = false) {
  if (!obj) return obj; // do not sort null, false or undefined

  // array
  if (!noArraySort && Array.isArray(obj)) {
    return obj.sort((a, b) => {
      if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
      if (typeof a === 'object') return 1;else return -1;
    }).map(i => sortObject(i, noArraySort));
  }

  // object
  // array is also of type object
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    if (obj instanceof RegExp) {
      return obj;
    }
    var out = {};
    Object.keys(obj).sort((a, b) => a.localeCompare(b)).forEach(key => {
      out[key] = sortObject(obj[key], noArraySort);
    });
    return out;
  }

  // everything else
  return obj;
}

/**
 * Deep clone a plain json object.
 * Does not work with recursive stuff
 * or non-plain-json.
 * IMPORANT: Performance of this is very important,
 * do not change it without running performance tests!
 *
 * @link https://github.com/zxdong262/deep-copy/blob/master/src/index.ts
 */
function deepClone(src) {
  if (!src) {
    return src;
  }
  if (src === null || typeof src !== 'object') {
    return src;
  }
  if (Array.isArray(src)) {
    var ret = new Array(src.length);
    var i = ret.length;
    while (i--) {
      ret[i] = deepClone(src[i]);
    }
    return ret;
  }
  var dest = {};
  // eslint-disable-next-line guard-for-in
  for (var key in src) {
    // TODO we should not be required to deep clone RegEx objects,
    // this must be fixed in RxDB.
    if (src[key] instanceof RegExp) {
      dest[key] = src[key];
    } else {
      dest[key] = deepClone(src[key]);
    }
  }
  return dest;
}
var clone = deepClone;

/**
 * overwrites the getter with the actual value
 * Mostly used for caching stuff on the first run
 */
exports.clone = clone;
function overwriteGetterForCaching(obj, getterName, value) {
  Object.defineProperty(obj, getterName, {
    get: function () {
      return value;
    }
  });
  return value;
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
//# sourceMappingURL=utils-object.js.map