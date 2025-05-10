import { BehaviorSubject } from 'rxjs';
import { INTERNAL_CONTEXT_COLLECTION, getPrimaryKeyOfInternalDocument } from "../../rx-database-internal-store.js";
import { getPreviousVersions } from "../../rx-schema.js";
import { PROMISE_RESOLVE_FALSE, PROMISE_RESOLVE_NULL, clone, flatClone, getFromMapOrCreate, toPromise } from "../utils/index.js";
export async function getOldCollectionMeta(migrationState) {
  var collectionDocKeys = getPreviousVersions(migrationState.collection.schema.jsonSchema).map(version => migrationState.collection.name + '-' + version);
  var found = await migrationState.database.internalStore.findDocumentsById(collectionDocKeys.map(key => getPrimaryKeyOfInternalDocument(key, INTERNAL_CONTEXT_COLLECTION)), false);

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
export function migrateDocumentData(collection, docSchemaVersion, docData) {
  /**
   * We cannot deep-clone Blob or Buffer
   * so we just flat clone it here
   * and attach it to the deep cloned document data.
   */
  var attachmentsBefore = flatClone(docData._attachments);
  var mutateableDocData = clone(docData);
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
      return PROMISE_RESOLVE_NULL;
    }
    doc._meta = meta;
    return doc;
  });
}
export function runStrategyIfNotNull(collection, version, docOrNull) {
  if (docOrNull === null) {
    return PROMISE_RESOLVE_NULL;
  } else {
    var ret = collection.migrationStrategies[version](docOrNull, collection);
    var retPromise = toPromise(ret);
    return retPromise;
  }
}

/**
 * returns true if a migration is needed
 */
export async function mustMigrate(migrationState) {
  if (migrationState.collection.schema.version === 0) {
    return PROMISE_RESOLVE_FALSE;
  }
  var oldColDoc = await getOldCollectionMeta(migrationState);
  return !!oldColDoc;
}
export var MIGRATION_DEFAULT_BATCH_SIZE = 200;
export var DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE = new WeakMap();
export function addMigrationStateToDatabase(migrationState) {
  var allSubject = getMigrationStateByDatabase(migrationState.database);
  var allList = allSubject.getValue().slice(0);
  allList.push(migrationState);
  allSubject.next(allList);
}
export function getMigrationStateByDatabase(database) {
  return getFromMapOrCreate(DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE, database, () => new BehaviorSubject([]));
}

/**
 * Complete on database close
 * so people do not have to unsubscribe
 */
export function onDatabaseClose(database) {
  var subject = DATA_MIGRATION_STATE_SUBJECT_BY_DATABASE.get(database);
  if (subject) {
    subject.complete();
  }
}
//# sourceMappingURL=migration-helpers.js.map