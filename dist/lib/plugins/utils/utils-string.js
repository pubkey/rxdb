"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RANDOM_STRING = void 0;
exports.arrayBufferToString = arrayBufferToString;
exports.isFolderPath = isFolderPath;
exports.randomCouchString = randomCouchString;
exports.stringToArrayBuffer = stringToArrayBuffer;
exports.trimDots = trimDots;
exports.ucfirst = ucfirst;
/**
 * get a random string which can be used with couchdb
 * @link http://stackoverflow.com/a/1349426/3443137
 */
function randomCouchString(length = 10) {
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

/**
 * uppercase first char
 */
exports.RANDOM_STRING = RANDOM_STRING;
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
 */
function arrayBufferToString(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}
function stringToArrayBuffer(str) {
  var buf = new ArrayBuffer(str.length * 2);
  var bufView = new Uint16Array(buf);
  for (var i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}
//# sourceMappingURL=utils-string.js.map