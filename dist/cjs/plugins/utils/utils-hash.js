"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defaultHashSha256 = void 0;
exports.hashStringToNumber = hashStringToNumber;
exports.nativeSha256 = nativeSha256;
var _rxError = require("../../rx-error.js");
/**
 * Cache this here so we do not have to run the try-catch
 * each time for better performance.
 * If your JavaScript runtime does not support crypto.subtle.digest,
 * provide your own hash function when calling createRxDatabase().
 */
var hashFn;
function getHashFn() {
  if (hashFn) {
    return hashFn;
  }
  if (typeof crypto === 'undefined' || typeof crypto.subtle === 'undefined' || typeof crypto.subtle.digest !== 'function') {
    throw (0, _rxError.newRxError)('UT8', {
      args: {
        typeof_crypto: typeof crypto,
        typeof_crypto_subtle: typeof crypto?.subtle,
        typeof_crypto_subtle_digest: typeof crypto?.subtle?.digest
      }
    });
  }
  hashFn = crypto.subtle.digest.bind(crypto.subtle);
  return hashFn;
}
async function nativeSha256(input) {
  var data = new TextEncoder().encode(input);
  var hashBuffer = await getHashFn()('SHA-256', data);
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