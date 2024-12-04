"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PREMIUM_FLAG_HASH = exports.NON_PREMIUM_COLLECTION_LIMIT = void 0;
exports.hasPremiumFlag = hasPremiumFlag;
var _utilsGlobal = require("./utils-global.js");
var _utilsHash = require("./utils-hash.js");
var _utilsPromise = require("./utils-promise.js");
var PREMIUM_FLAG_HASH = exports.PREMIUM_FLAG_HASH = '6da4936d1425ff3a5c44c02342c6daf791d266be3ae8479b8ec59e261df41b93';
var NON_PREMIUM_COLLECTION_LIMIT = exports.NON_PREMIUM_COLLECTION_LIMIT = 16;
var hasPremiumPromise = _utilsPromise.PROMISE_RESOLVE_FALSE;
var premiumChecked = false;

/**
 * Here we check if the premium flag has been set.
 * This code exists in the open source version of RxDB.
 * Yes you are allowed to fork the repo and just overwrite this function.
 * However you might better spend this time developing your real project
 * and supporting the RxDB efforts by buying premium.
 */
async function hasPremiumFlag() {
  if (premiumChecked) {
    return hasPremiumPromise;
  }
  premiumChecked = true;
  hasPremiumPromise = (async () => {
    if (_utilsGlobal.RXDB_UTILS_GLOBAL.premium && typeof _utilsGlobal.RXDB_UTILS_GLOBAL.premium === 'string' && (await (0, _utilsHash.defaultHashSha256)(_utilsGlobal.RXDB_UTILS_GLOBAL.premium)) === PREMIUM_FLAG_HASH) {
      return true;
    } else {
      return false;
    }
  })();
  return hasPremiumPromise;
}
//# sourceMappingURL=utils-premium.js.map