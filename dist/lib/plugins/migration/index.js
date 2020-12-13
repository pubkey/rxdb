"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "_getOldCollections", {
  enumerable: true,
  get: function get() {
    return _dataMigrator._getOldCollections;
  }
});
Object.defineProperty(exports, "getBatchOfOldCollection", {
  enumerable: true,
  get: function get() {
    return _dataMigrator.getBatchOfOldCollection;
  }
});
Object.defineProperty(exports, "migrateDocumentData", {
  enumerable: true,
  get: function get() {
    return _dataMigrator.migrateDocumentData;
  }
});
Object.defineProperty(exports, "_migrateDocument", {
  enumerable: true,
  get: function get() {
    return _dataMigrator._migrateDocument;
  }
});
Object.defineProperty(exports, "deleteOldCollection", {
  enumerable: true,
  get: function get() {
    return _dataMigrator.deleteOldCollection;
  }
});
Object.defineProperty(exports, "migrateOldCollection", {
  enumerable: true,
  get: function get() {
    return _dataMigrator.migrateOldCollection;
  }
});
Object.defineProperty(exports, "migratePromise", {
  enumerable: true,
  get: function get() {
    return _dataMigrator.migratePromise;
  }
});
Object.defineProperty(exports, "DataMigrator", {
  enumerable: true,
  get: function get() {
    return _dataMigrator.DataMigrator;
  }
});
exports.RxDBMigrationPlugin = exports.DATA_MIGRATOR_BY_COLLECTION = void 0;

var _dataMigrator = require("./data-migrator");

var DATA_MIGRATOR_BY_COLLECTION = new WeakMap();
exports.DATA_MIGRATOR_BY_COLLECTION = DATA_MIGRATOR_BY_COLLECTION;
var RxDBMigrationPlugin = {
  name: 'migration',
  rxdb: true,
  prototypes: {
    RxCollection: function RxCollection(proto) {
      proto.getDataMigrator = function () {
        if (!DATA_MIGRATOR_BY_COLLECTION.has(this)) {
          DATA_MIGRATOR_BY_COLLECTION.set(this, (0, _dataMigrator.createDataMigrator)(this.asRxCollection, this.migrationStrategies));
        }

        return DATA_MIGRATOR_BY_COLLECTION.get(this);
      };

      proto.migrationNeeded = function () {
        return (0, _dataMigrator.mustMigrate)(this.getDataMigrator());
      };
    }
  }
}; // used in tests

exports.RxDBMigrationPlugin = RxDBMigrationPlugin;

//# sourceMappingURL=index.js.map