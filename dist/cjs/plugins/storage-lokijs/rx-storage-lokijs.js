"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageLoki = void 0;
exports.getRxStorageLoki = getRxStorageLoki;
var _rxStorageInstanceLoki = require("./rx-storage-instance-loki.js");
var _lokijsHelper = require("./lokijs-helper.js");
var _rxStorageHelper = require("../../rx-storage-helper.js");
var _utilsRxdbVersion = require("../utils/utils-rxdb-version.js");
var RxStorageLoki = exports.RxStorageLoki = /*#__PURE__*/function () {
  /**
   * Create one leader elector by db name.
   * This is done inside of the storage, not globally
   * to make it easier to test multi-tab behavior.
   */

  function RxStorageLoki(databaseSettings) {
    this.name = _lokijsHelper.RX_STORAGE_NAME_LOKIJS;
    this.rxdbVersion = _utilsRxdbVersion.RXDB_VERSION;
    this.leaderElectorByLokiDbName = new Map();
    this.databaseSettings = databaseSettings;
  }
  var _proto = RxStorageLoki.prototype;
  _proto.createStorageInstance = function createStorageInstance(params) {
    (0, _rxStorageHelper.ensureRxStorageInstanceParamsAreCorrect)(params);
    return (0, _rxStorageInstanceLoki.createLokiStorageInstance)(this, params, this.databaseSettings);
  };
  return RxStorageLoki;
}();
/**
 * @deprecated The lokijs RxStorage is deprecated, more info at:
 * @link https://rxdb.info/rx-storage-lokijs.html
 */
function getRxStorageLoki(databaseSettings = {}) {
  var storage = new RxStorageLoki(databaseSettings);
  return storage;
}
//# sourceMappingURL=rx-storage-lokijs.js.map