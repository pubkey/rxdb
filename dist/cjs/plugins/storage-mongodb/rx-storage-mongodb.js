"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageMongoDB = void 0;
exports.getRxStorageMongoDB = getRxStorageMongoDB;
var _rxStorageHelper = require("../../rx-storage-helper.js");
var _mongodbHelper = require("./mongodb-helper.js");
var _rxStorageInstanceMongodb = require("./rx-storage-instance-mongodb.js");
var _utilsRxdbVersion = require("../utils/utils-rxdb-version.js");
var RxStorageMongoDB = exports.RxStorageMongoDB = /*#__PURE__*/function () {
  function RxStorageMongoDB(databaseSettings) {
    this.name = _mongodbHelper.RX_STORAGE_NAME_MONGODB;
    this.rxdbVersion = _utilsRxdbVersion.RXDB_VERSION;
    this.databaseSettings = databaseSettings;
  }
  var _proto = RxStorageMongoDB.prototype;
  _proto.createStorageInstance = function createStorageInstance(params) {
    (0, _rxStorageHelper.ensureRxStorageInstanceParamsAreCorrect)(params);
    return (0, _rxStorageInstanceMongodb.createMongoDBStorageInstance)(this, params, this.databaseSettings);
  };
  return RxStorageMongoDB;
}();
function getRxStorageMongoDB(databaseSettings) {
  var storage = new RxStorageMongoDB(databaseSettings);
  return storage;
}
//# sourceMappingURL=rx-storage-mongodb.js.map