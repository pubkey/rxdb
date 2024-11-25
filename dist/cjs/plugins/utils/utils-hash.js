"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defaultHashSha256 = void 0;
exports.hashStringToNumber = hashStringToNumber;
exports.nativeSha256 = nativeSha256;
async function nativeSha256(input) {
  var data = new TextEncoder().encode(input);
  /**
   * If your JavaScript runtime does not support crypto.subtle.digest,
   * provide your own hash function when calling createRxDatabase().
   */

  var hashBuffer = await crypto.subtle.digest('SHA-256', data);
  /**
   * @link https://jameshfisher.com/2017/10/30/web-cryptography-api-hello-world/
   */
  var hash = Array.prototype.map.call(new Uint8Array(hashBuffer), x => ('00' + x.toString(16)).slice(-2)).join('');
  return hash;
}
var defaultHashSha256 = exports.defaultHashSha256 = nativeSha256;
function hashStringToNumber(str) {
  var nr = 0;
  var len = str.length;
  for (var i = 0; i < len; i++) {
    nr = nr + str.charCodeAt(i);
    nr |= 0; // Convert to 32bit integer, improves performance
  }
  return nr;
}
//# sourceMappingURL=utils-hash.js.map