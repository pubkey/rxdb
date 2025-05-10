"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MIGRATION_DEFAULT_BATCH_SIZE = exports.DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE = void 0;
exports.addMigrationStateToDatabase = addMigrationStateToDatabase;
exports.getMigrationStateByDatabase = getMigrationStateByDatabase;
exports.getOldCollectionMeta = getOldCollectionMeta;
exports.migrateDocumentData = migrateDocumentData;
exports.mustMigrate = mustMigrate;
exports.onDatabaseClose = onDatabaseClose;
exports.runStrategyIfNotNull = runStrategyIfNotNull;
var _rxjs = require("rxjs");
var _rxDatabaseInternalStore = require("../../rx-database-internal-store.js");
var _rxSchema = require("../../rx-schema.js");
var _index = require("../utils/index.js");
async function getOldCollectionMeta(migrationState) {
  var collectionDocKeys = (0, _rxSchema.getPreviousVersions)(migrationState.collection.schema.jsonSchema).map(version => migrationState.collection.name + '-' + version);
  var found = await migrationState.database.internalStore.findDocumentsById(collectionDocKeys.map(key => (0, _rxDatabaseInternalStore.getPrimaryKeyOfInternalDocument)(key, _rxDatabaseInternalStore.INTERNAL_CONTEXT_COLLECTION)), false);

  /**
   * It can happen that a previous migration was canceled or the browser was reloaded
   * and on the next startup a new migration was added.
   * So we can have multiple collection states with different versions.
   * In this case, use the one with the lowest version number and start
   * migrating from this one upwards.
   */
  var foundById = {};
  found.forEach(f => foundById[f.key] = f);
  var oldest = collectionDocKeys.find(key => foundById[key]);
  return oldest ? foundById[oldest] : undefined;
}

/**
 * runs the doc-data through all following migrationStrategies
 * so it will match the newest schema.
 * @throws Error if final doc does not match final schema or migrationStrategy crashes
 * @return final object or null if migrationStrategy deleted it
 */
function migrateDocumentData(collection, docSchemaVersion, docData) {
  /**
   * We cannot deep-clone Blob or Buffer
   * so we just flat clone it here
   * and attach it to the deep cloned document data.
   */
  var attachmentsBefore = (0, _index.flatClone)(docData._attachments);
  var mutateableDocData = (0, _index.clone)(docData);
  var meta = mutateableDocData._meta;
  delete mutateableDocData._meta;
  mutateableDocData._attachments = attachmentsBefore;
  var nextVersion = docSchemaVersion + 1;

  // run the document through migrationStrategies
  var currentPromise = Promise.resolve(mutateableDocData);
  var _loop = function () {
    var version = nextVersion;
    currentPromise = currentPromise.then(docOrNull => runStrategyIfNotNull(collection, version, docOrNull));
    nextVersion++;
  };
  while (nextVersion <= collection.schema.version) {
    _loop();
  }
  return currentPromise.then(doc => {
    if (doc === null) {
      return _index.PROMISE_RESOLVE_NULL;
    }
    doc._meta = meta;
    return doc;
  });
}
function runStrategyIfNotNull(collection, version, docOrNull) {
  if (docOrNull === null) {
    return _index.PROMISE_RESOLVE_NULL;
  } else {
    var ret = collection.migrationStrategies[version](docOrNull, collection);
    var retPromise = (0, _index.toPromise)(ret);
    return retPromise;
  }
}

/**
 * returns true if a migration is needed
 */
async function mustMigrate(migrationState) {
  if (migrationState.collection.schema.version === 0) {
    return _index.PROMISE_RESOLVE_FALSE;
  }
  var oldColDoc = await getOldCollectionMeta(migrationState);
  return !!oldColDoc;
}
var MIGRATION_DEFAULT_BATCH_SIZE = exports.MIGRATION_DEFAULT_BATCH_SIZE = 200;
var DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE = exports.DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE = new WeakMap();
function addMigrationStateToDatabase(migrationState) {
  var allSubject = getMigrationStateByDatabase(migrationState.database);
  var allList = allSubject.getValue().slice(0);
  allList.push(migrationState);
  allSubject.next(allList);
}
function getMigrationStateByDatabase(database) {
  return (0, _index.getFromMapOrCreate)(DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE, database, () => new _rxjs.BehaviorSubject([]));
}

/**
 * Complete on database close
 * so people do not have to unsubscribe
 */
function onDatabaseClose(database) {
  var subject = DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE.get(database);
  if (subject) {
    subject.complete();
  }
}
//# sourceMappingURL=migration-helpers.js.map