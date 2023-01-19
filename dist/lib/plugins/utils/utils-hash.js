"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defaultHashSha256 = defaultHashSha256;
var _ohash = require("ohash");
/**
 * Default hash method used to hash
 * strings and do equal comparisons.
 *
 * IMPORTANT: Changing the default hashing method
 * requires a BREAKING change!
 */
function defaultHashSha256(input) {
  return (0, _ohash.sha256)(input);
}
//# sourceMappingURL=utils-hash.js.map