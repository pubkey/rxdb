"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageLokiStatics = exports.RxStorageLoki = void 0;
exports.getRxStorageLoki = getRxStorageLoki;
var _utils = require("../utils");
var _rxStorageInstanceLoki = require("./rx-storage-instance-loki");
var _lokijsHelper = require("./lokijs-helper");
var _rxStorageHelper = require("../../rx-storage-helper");
var _rxSchemaHelper = require("../../rx-schema-helper");
var RxStorageLokiStatics = {
  prepareQuery(_schema, mutateableQuery) {
    mutateableQuery = (0, _utils.flatClone)(mutateableQuery);
    if (Object.keys((0, _utils.ensureNotFalsy)(mutateableQuery.selector)).length > 0) {
      mutateableQuery.selector = {
        $and: [{
          _deleted: false
        }, mutateableQuery.selector]
      };
    } else {
      mutateableQuery.selector = {
        _deleted: false
      };
    }
    return mutateableQuery;
  },
  checkpointSchema: _rxSchemaHelper.DEFAULT_CHECKPOINT_SCHEMA
};
exports.RxStorageLokiStatics = RxStorageLokiStatics;
var RxStorageLoki = /*#__PURE__*/function () {
  /**
   * Create one leader elector by db name.
   * This is done inside of the storage, not globally
   * to make it easier to test multi-tab behavior.
   */

  function RxStorageLoki(databaseSettings) {
    this.name = _lokijsHelper.RX_STORAGE_NAME_LOKIJS;
    this.statics = RxStorageLokiStatics;
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
exports.RxStorageLoki = RxStorageLoki;
function getRxStorageLoki(databaseSettings = {}) {
  var storage = new RxStorageLoki(databaseSettings);
  return storage;
}
//# sourceMappingURL=rx-storage-lokijs.js.map