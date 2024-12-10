import { RXDB_UTILS_GLOBAL } from "./utils-global.js";
import { defaultHashSha256 } from "./utils-hash.js";
import { PROMISE_RESOLVE_FALSE } from "./utils-promise.js";
export var PREMIUM_FLAG_HASH = '6da4936d1425ff3a5c44c02342c6daf791d266be3ae8479b8ec59e261df41b93';
export var NON_PREMIUM_COLLECTION_LIMIT = 16;
var hasPremiumPromise = PROMISE_RESOLVE_FALSE;
var premiumChecked = false;

/**
 * Here we check if the premium flag has been set.
 * This code exists in the open source version of RxDB.
 * Yes you are allowed to fork the repo and just overwrite this function.
 * However you might better spend this time developing your real project
 * and supporting the RxDB efforts by buying premium.
 */
export async function hasPremiumFlag() {
  if (premiumChecked) {
    return hasPremiumPromise;
  }
  premiumChecked = true;
  hasPremiumPromise = (async () => {
    if (RXDB_UTILS_GLOBAL.premium && typeof RXDB_UTILS_GLOBAL.premium === 'string' && (await defaultHashSha256(RXDB_UTILS_GLOBAL.premium)) === PREMIUM_FLAG_HASH) {
      return true;
    } else {
      return false;
    }
  })();
  return hasPremiumPromise;
}
//# sourceMappingURL=utils-premium.js.map