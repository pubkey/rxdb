import { adapterObject, getFromMapOrThrow, isMaybeReadonlyArray } from '../../util';
import { addPouchPlugin, isLevelDown, PouchDB } from './pouch-db';
import { newRxError } from '../../rx-error';
import { RxStorageInstancePouch } from './rx-storage-instance-pouch';
import { getPouchIndexDesignDocNameByIndex, openPouchId, OPEN_POUCH_INSTANCES, RX_STORAGE_NAME_POUCHDB } from './pouchdb-helper';
import PouchDBFind from 'pouchdb-find';
import { RxStoragePouchStatics } from './pouch-statics';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
import { addCustomEventsPluginToPouch } from './custom-events-plugin';
import { addRxStorageMultiInstanceSupport } from '../../rx-storage-multiinstance';
import { ensureRxStorageInstanceParamsAreCorrect } from '../../rx-storage-helper';
/**
 * Creates the indexes of the schema inside of the pouchdb instance.
 * Will skip indexes that already exist.
 */
export var createIndexesOnPouch = function createIndexesOnPouch(pouch, schema) {
  try {
    if (!schema.indexes) {
      return Promise.resolve();
    }
    var primaryKey = getPrimaryFieldOfPrimaryKey(schema.primaryKey);
    return Promise.resolve(pouch.getIndexes()).then(function (before) {
      var existingIndexes = new Set(before.indexes.map(function (idx) {
        return idx.name;
      }));
      return Promise.resolve(Promise.all(schema.indexes.map(function (indexMaybeArray) {
        var indexArray = isMaybeReadonlyArray(indexMaybeArray) ? indexMaybeArray : [indexMaybeArray];

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
        var indexName = getPouchIndexDesignDocNameByIndex(indexArray);
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
export var RxStoragePouch = /*#__PURE__*/function () {
  function RxStoragePouch(adapter) {
    var pouchSettings = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.name = RX_STORAGE_NAME_POUCHDB;
    this.statics = RxStoragePouchStatics;
    this.adapter = adapter;
    this.pouchSettings = pouchSettings;
    checkPouchAdapter(adapter);
  }
  var _proto = RxStoragePouch.prototype;
  _proto.createPouch = function createPouch(location, options) {
    var pouchDbParameters = {
      location: location,
      adapter: adapterObject(this.adapter),
      settings: options
    };
    var pouchDBOptions = Object.assign({}, pouchDbParameters.adapter, this.pouchSettings, pouchDbParameters.settings);
    var pouch = new PouchDB(pouchDbParameters.location, pouchDBOptions);

    /**
     * In the past we found some errors where the PouchDB is not directly usable
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
      ensureRxStorageInstanceParamsAreCorrect(params);
      var pouchLocation = getPouchLocation(params.databaseName, params.collectionName, params.schema.version);
      return Promise.resolve(_this2.createPouch(pouchLocation, params.options)).then(function (pouch) {
        return Promise.resolve(createIndexesOnPouch(pouch, params.schema)).then(function () {
          var pouchInstanceId = openPouchId(params.databaseInstanceToken, params.databaseName, params.collectionName, params.schema.version);
          var instance = new RxStorageInstancePouch(_this2, params.databaseName, params.collectionName, params.schema, {
            pouch: pouch,
            pouchInstanceId: pouchInstanceId
          }, params.options);
          OPEN_POUCH_INSTANCES.set(pouchInstanceId, pouch);
          addRxStorageMultiInstanceSupport(RX_STORAGE_NAME_POUCHDB, params, instance);
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
export function checkPouchAdapter(adapter) {
  if (typeof adapter === 'string') {
    if (!PouchDB.adapters || !PouchDB.adapters[adapter]) {
      throw newRxError('DB9', {
        adapter: adapter
      });
    }
  } else {
    isLevelDown(adapter);
    if (!PouchDB.adapters || !PouchDB.adapters.leveldb) {
      throw newRxError('DB10', {
        adapter: adapter
      });
    }
  }
}
export function getPouchLocation(dbName, collectionName, schemaVersion) {
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
export function getPouchDBOfRxCollection(collection) {
  var id = openPouchId(collection.database.token, collection.database.name, collection.name, collection.schema.version);
  var pouch = getFromMapOrThrow(OPEN_POUCH_INSTANCES, id);
  return pouch;
}
var addedRxDBPouchPlugins = false;

/**
 * @deprecated PouchDB RxStorage is deprecated, see
 * @link https://rxdb.info/questions-answers.html#why-is-the-pouchdb-rxstorage-deprecated
 */
export function getRxStoragePouch(adapter, pouchSettings) {
  if (!addedRxDBPouchPlugins) {
    addedRxDBPouchPlugins = true;
    addPouchPlugin(PouchDBFind);
    addCustomEventsPluginToPouch();
  }
  if (!adapter) {
    throw new Error('adapter missing');
  }
  var storage = new RxStoragePouch(adapter, pouchSettings);
  return storage;
}
//# sourceMappingURL=rx-storage-pouchdb.js.map