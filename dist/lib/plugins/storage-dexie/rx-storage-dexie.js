"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageDexie = void 0;
exports.getRxStorageDexie = getRxStorageDexie;
var _dexieHelper = require("./dexie-helper");
var _rxStorageInstanceDexie = require("./rx-storage-instance-dexie");
var _rxStorageHelper = require("../../rx-storage-helper");
var RxStorageDexie = /*#__PURE__*/function () {
  function RxStorageDexie(settings) {
    this.name = _dexieHelper.RX_STORAGE_NAME_DEXIE;
    this.statics = _dexieHelper.RxStorageDexieStatics;
    this.settings = settings;
  }
  var _proto = RxStorageDexie.prototype;
  _proto.createStorageInstance = function createStorageInstance(params) {
    (0, _rxStorageHelper.ensureRxStorageInstanceParamsAreCorrect)(params);
    (0, _dexieHelper.ensureNoBooleanIndex)(params.schema);
    return (0, _rxStorageInstanceDexie.createDexieStorageInstance)(this, params, this.settings);
  };
  return RxStorageDexie;
}();
exports.RxStorageDexie = RxStorageDexie;
function getRxStorageDexie(settings = {}) {
  var storage = new RxStorageDexie(settings);
  return storage;
}
//# sourceMappingURL=rx-storage-dexie.js.map