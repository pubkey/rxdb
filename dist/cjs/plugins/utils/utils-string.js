"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RANDOM_STRING = void 0;
exports.arrayBufferToString = arrayBufferToString;
exports.isFolderPath = isFolderPath;
exports.lastCharOfString = lastCharOfString;
exports.normalizeString = normalizeString;
exports.randomCouchString = randomCouchString;
exports.stringToArrayBuffer = stringToArrayBuffer;
exports.trimDots = trimDots;
exports.ucfirst = ucfirst;
var COUCH_NAME_CHARS = 'abcdefghijklmnopqrstuvwxyz';
/**
 * get a random string which can be used with couchdb
 * @link http://stackoverflow.com/a/1349426/3443137
 */
function randomCouchString(length = 10) {
  var text = '';
  for (var i = 0; i < length; i++) {
    text += COUCH_NAME_CHARS.charAt(Math.floor(Math.random() * COUCH_NAME_CHARS.length));
  }
  return text;
}

/**
 * A random string that is never inside of any storage
 */
var RANDOM_STRING = exports.RANDOM_STRING = 'Fz7SZXPmYJujkzjY1rpXWvlWBqoGAfAX';

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

/**
 * @link https://stackoverflow.com/a/44950500/3443137
 */
function lastCharOfString(str) {
  return str.charAt(str.length - 1);
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

/**
 * @link https://gist.github.com/andreburgaud/6f73fd2d690b629346b8
 * @link https://stackoverflow.com/a/76240378/3443137
 */
function arrayBufferToString(arrayBuffer) {
  var chunkSize = 8192;
  var str = '';
  var len = arrayBuffer.byteLength;
  for (var i = 0; i < len; i += chunkSize) {
    var chunk = new Uint8Array(arrayBuffer, i, Math.min(chunkSize, len - i));
    str += String.fromCharCode.apply(null, chunk);
  }
  return str;
}
function stringToArrayBuffer(str) {
  var buf = new ArrayBuffer(str.length);
  var bufView = new Uint8Array(buf);
  for (var i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}
function normalizeString(str) {
  return str.trim().replace(/[\n\s]+/g, '');
}
//# sourceMappingURL=utils-string.js.map