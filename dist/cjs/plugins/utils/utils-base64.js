"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.arrayBufferToBase64 = arrayBufferToBase64;
exports.b64DecodeUnicode = b64DecodeUnicode;
exports.b64EncodeUnicode = b64EncodeUnicode;
exports.base64ToArrayBuffer = base64ToArrayBuffer;
var _jsBase = require("js-base64");
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
 * @link https://stackoverflow.com/a/21797381
 */
function base64ToArrayBuffer(base64) {
  var binary_string = atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}
//# sourceMappingURL=utils-base64.js.map