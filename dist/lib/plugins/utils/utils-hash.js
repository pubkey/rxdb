"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defaultHashFunction = defaultHashFunction;
exports.fastUnsecureHash = fastUnsecureHash;
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
    for (var j = 0; j < inputString.length; j++) {
      encoded.push(inputString.charCodeAt(j));
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
//# sourceMappingURL=utils-hash.js.map