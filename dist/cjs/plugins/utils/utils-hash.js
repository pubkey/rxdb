"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defaultHashSha256 = exports.canUseCryptoSubtle = void 0;
exports.hashStringToNumber = hashStringToNumber;
exports.jsSha256 = jsSha256;
exports.nativeSha256 = nativeSha256;
var _ohash = require("ohash");
/**
 * TODO in the future we should no longer provide a
 * fallback to crypto.subtle.digest.
 * Instead users without crypto.subtle.digest support, should have to provide their own
 * hash function.
 */
function jsSha256(input) {
  return Promise.resolve((0, _ohash.sha256)(input));
}
async function nativeSha256(input) {
  var data = new TextEncoder().encode(input);
  var hashBuffer = await crypto.subtle.digest('SHA-256', data);
  /**
   * @link https://jameshfisher.com/2017/10/30/web-cryptography-api-hello-world/
   */
  var hash = Array.prototype.map.call(new Uint8Array(hashBuffer), x => ('00' + x.toString(16)).slice(-2)).join('');
  return hash;
}
var canUseCryptoSubtle = exports.canUseCryptoSubtle = typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined' && typeof crypto.subtle.digest === 'function';

/**
 * Default hash method used to hash
 * strings and do equal comparisons.
 *
 * IMPORTANT: Changing the default hashing method
 * requires a BREAKING change!
 */

var defaultHashSha256 = exports.defaultHashSha256 = canUseCryptoSubtle ? nativeSha256 : jsSha256;
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