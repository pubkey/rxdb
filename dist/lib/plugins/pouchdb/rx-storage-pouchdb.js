"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStoragePouch = void 0;
exports.checkPouchAdapter = checkPouchAdapter;
exports.createIndexesOnPouch = void 0;
exports.getPouchDBOfRxCollection = getPouchDBOfRxCollection;
exports.getPouchLocation = getPouchLocation;
exports.getRxStoragePouch = getRxStoragePouch;

var _util = require("../../util");

var _pouchDb = require("./pouch-db");

var _rxError = require("../../rx-error");

var _rxStorageInstancePouch = require("./rx-storage-instance-pouch");

var _pouchdbHelper = require("./pouchdb-helper");

var _pouchdbFind = _interopRequireDefault(require("pouchdb-find"));

var _pouchStatics = require("./pouch-statics");

var _rxSchemaHelper = require("../../rx-schema-helper");

var _customEventsPlugin = require("./custom-events-plugin");

var _rxStorageMultiinstance = require("../../rx-storage-multiinstance");

var _rxStorageHelper = require("../../rx-storage-helper");

/**
 * Creates the indexes of the schema inside of the pouchdb instance.
 * Will skip indexes that already exist.
 */
var createIndexesOnPouch = function createIndexesOnPouch(pouch, schema) {
  try {
    if (!schema.indexes) {
      return Promise.resolve();
    }

    var primaryKey = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
    return Promise.resolve(pouch.getIndexes()).then(function (before) {
      var existingIndexes = new Set(before.indexes.map(function (idx) {
        return idx.name;
      }));
      return Promise.resolve(Promise.all(schema.indexes.map(function (indexMaybeArray) {
        var indexArray = (0, _util.isMaybeReadonlyArray)(indexMaybeArray) ? indexMaybeArray : [indexMaybeArray];
        /**
         * replace primary key with _id
         * because that is the enforced primary key on pouchdb.
         */

        indexArray = indexArray.map(function (key) {
          if (key === primaryKey) {
            return '_id';
          } else {
            return key;
          }
        });
        var indexName = (0, _pouchdbHelper.getPouchIndexDesignDocNameByIndex)(indexArray);

        if (existingIndexes.has(indexName)) {
          // index already exists
          return;
        }
        /**
         * TODO we might have even better performance by doing a pouch.bulkDocs()
         * on index creation
         */


        return pouch.createIndex({
          name: indexName,
          ddoc: indexName,
          index: {
            fields: indexArray
          }
        });
      }))).then(function () {});
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * returns the pouchdb-database-name
 */


exports.createIndexesOnPouch = createIndexesOnPouch;

var RxStoragePouch = /*#__PURE__*/function () {
  function RxStoragePouch(adapter) {
    var pouchSettings = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.name = _pouchdbHelper.RX_STORAGE_NAME_POUCHDB;
    this.statics = _pouchStatics.RxStoragePouchStatics;
    this.adapter = adapter;
    this.pouchSettings = pouchSettings;
    checkPouchAdapter(adapter);
  }

  var _proto = RxStoragePouch.prototype;

  _proto.createPouch = function createPouch(location, options) {
    var pouchDbParameters = {
      location: location,
      adapter: (0, _util.adapterObject)(this.adapter),
      settings: options
    };
    var pouchDBOptions = Object.assign({}, pouchDbParameters.adapter, this.pouchSettings, pouchDbParameters.settings);
    var pouch = new _pouchDb.PouchDB(pouchDbParameters.location, pouchDBOptions);
    /**
     * In the past we found some errors where the PouchDB is not directly useable
     * so we we had to call .info() first to ensure it can be used.
     * I commented this out for now to get faster database/collection creation.
     * We might have to add this again if something fails.
     */
    // await pouch.info();

    return Promise.resolve(pouch);
  };

  _proto.createStorageInstance = function createStorageInstance(params) {
    try {
      var _this2 = this;

      (0, _rxStorageHelper.ensureRxStorageInstanceParamsAreCorrect)(params);
      var pouchLocation = getPouchLocation(params.databaseName, params.collectionName, params.schema.version);
      return Promise.resolve(_this2.createPouch(pouchLocation, params.options)).then(function (pouch) {
        return Promise.resolve(createIndexesOnPouch(pouch, params.schema)).then(function () {
          var pouchInstanceId = (0, _pouchdbHelper.openPouchId)(params.databaseInstanceToken, params.databaseName, params.collectionName, params.schema.version);
          var instance = new _rxStorageInstancePouch.RxStorageInstancePouch(_this2, params.databaseName, params.collectionName, params.schema, {
            pouch: pouch,
            pouchInstanceId: pouchInstanceId
          }, params.options);

          _pouchdbHelper.OPEN_POUCH_INSTANCES.set(pouchInstanceId, pouch);

          (0, _rxStorageMultiinstance.addRxStorageMultiInstanceSupport)(_pouchdbHelper.RX_STORAGE_NAME_POUCHDB, params, instance);
          return instance;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return RxStoragePouch;
}();
/**
 * Checks if all is ok with the given adapter,
 * else throws an error.
 */


exports.RxStoragePouch = RxStoragePouch;

function checkPouchAdapter(adapter) {
  if (typeof adapter === 'string') {
    if (!_pouchDb.PouchDB.adapters || !_pouchDb.PouchDB.adapters[adapter]) {
      throw (0, _rxError.newRxError)('DB9', {
        adapter: adapter
      });
    }
  } else {
    (0, _pouchDb.isLevelDown)(adapter);

    if (!_pouchDb.PouchDB.adapters || !_pouchDb.PouchDB.adapters.leveldb) {
      throw (0, _rxError.newRxError)('DB10', {
        adapter: adapter
      });
    }
  }
}

function getPouchLocation(dbName, collectionName, schemaVersion) {
  var prefix = dbName + '-rxdb-' + schemaVersion + '-';

  if (!collectionName.includes('/')) {
    return prefix + collectionName;
  } else {
    // if collectionName is a path, we have to prefix the last part only
    var split = collectionName.split('/');
    var last = split.pop();
    var ret = split.join('/');
    ret += '/' + prefix + last;
    return ret;
  }
}

function getPouchDBOfRxCollection(collection) {
  var id = (0, _pouchdbHelper.openPouchId)(collection.database.token, collection.database.name, collection.name, collection.schema.version);
  var pouch = (0, _util.getFromMapOrThrow)(_pouchdbHelper.OPEN_POUCH_INSTANCES, id);
  return pouch;
}

var addedRxDBPouchPlugins = false;

function getRxStoragePouch(adapter, pouchSettings) {
  if (!addedRxDBPouchPlugins) {
    addedRxDBPouchPlugins = true;
    (0, _pouchDb.addPouchPlugin)(_pouchdbFind["default"]);
    (0, _customEventsPlugin.addCustomEventsPluginToPouch)();
  }

  if (!adapter) {
    throw new Error('adapter missing');
  }

  var storage = new RxStoragePouch(adapter, pouchSettings);
  return storage;
}
//# sourceMappingURL=rx-storage-pouchdb.js.map