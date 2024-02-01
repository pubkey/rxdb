"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.migrateCollection = migrateCollection;
exports.migrateStorage = migrateStorage;
var _index = require("../../index.js");
/**
 * Migrates collections of RxDB version A and puts them
 * into a RxDatabase that is created with version B.
 * This function only works from the previous major version upwards.
 * Do not use it to migrate like rxdb v9 to v14. 
 */
async function migrateStorage(params) {
  var collections = Object.values(params.database.collections);
  var batchSize = params.batchSize ? params.batchSize : 10;
  if (params.parallel) {
    await Promise.all(collections.map(collection => migrateCollection(collection, params.oldDatabaseName, params.oldStorage, batchSize, params.afterMigrateBatch, params.logFunction)));
  } else {
    for (var collection of collections) {
      await migrateCollection(collection, params.oldDatabaseName, params.oldStorage, batchSize, params.afterMigrateBatch, params.logFunction);
    }
  }
}
async function migrateCollection(collection, oldDatabaseName, oldStorage, batchSize, afterMigrateBatch,
// to log each step, pass console.log.bind(console) here.
logFunction) {
  function log(message) {
    if (logFunction) {
      logFunction('migrateCollection(' + collection.name + ')' + message);
    }
  }
  log('start migrateCollection()');
  var schema = collection.schema.jsonSchema;
  var primaryPath = collection.schema.primaryPath;
  var oldDatabaseInstanceToken = (0, _index.randomCouchString)(10);

  /**
   * In RxDB v15 we changed how the indexes are created.
   * Before (v14), the storage prepended the _deleted field
   * to all indexes.
   * In v15, RxDB will prepend the _deleted field BEFORE sending
   * it to the storage. Therefore we have to strip these fields
   * when crating v14 storage instances.
   */
  if (!oldStorage.rxdbVersion && schema.indexes) {
    schema = (0, _index.clone)(schema);
    schema.indexes = (0, _index.ensureNotFalsy)(schema.indexes).map(index => {
      index = (0, _index.toArray)(index).filter(field => field !== '_deleted');
      if (index.includes('_meta.lwt')) {
        return null;
      }
      return index;
    }).filter(_index.arrayFilterNotEmpty);
  }
  var oldStorageInstance = await oldStorage.createStorageInstance({
    databaseName: oldDatabaseName,
    collectionName: collection.name,
    multiInstance: false,
    options: {},
    schema: schema,
    databaseInstanceToken: oldDatabaseInstanceToken,
    devMode: false
  });
  var plainQuery = {
    selector: {
      _deleted: {
        $eq: false
      }
    },
    limit: batchSize,
    sort: [{
      [primaryPath]: 'asc'
    }],
    skip: 0
  };

  /**
   * In RxDB v15 we removed statics.prepareQuery()
   * But to be downwards compatible, still use that
   * when migrating from an old storage.
   * TODO remove this in the next major version. v16.
   */
  var preparedQuery;
  if (oldStorage.statics && oldStorage.statics.prepareQuery) {
    preparedQuery = oldStorage.statics.prepareQuery(schema, plainQuery);
  } else {
    preparedQuery = (0, _index.prepareQuery)(schema, plainQuery);
  }
  var _loop = async function () {
      log('loop once');
      /**
       * Get a batch of documents
       */
      var queryResult = await oldStorageInstance.query(preparedQuery);
      var docs = queryResult.documents;
      if (docs.length === 0) {
        /**
         * No more documents to migrate
         */
        log('migration of collection done');
        await oldStorageInstance.remove();
        return {
          v: void 0
        };
      }
      var docsNonMutated = (0, _index.clone)(docs);

      /**
       * Get attachments
       * if defined in the schema.
       */
      if (schema.attachments) {
        await Promise.all(docs.map(async doc => {
          var docId = doc[primaryPath];
          await Promise.all(Object.entries(doc._attachments).map(async ([attachmentId, attachmentMeta]) => {
            var attachmentData = await oldStorageInstance.getAttachmentData(docId, attachmentId, attachmentMeta.digest);
            var attachmentDataString = await (0, _index.blobToBase64String)(attachmentData);
            doc._attachments[attachmentId] = {
              data: attachmentDataString,
              digest: attachmentMeta.digest,
              length: attachmentMeta.length,
              type: attachmentMeta.type
            };
          }));
        }));
        log('got attachments');
      }

      /**
       * Insert the documents to the new storage
       */
      var insertToNewWriteRows = docs.map(document => {
        return {
          document
        };
      });
      var writeToNewResult = await collection.storageInstance.bulkWrite(insertToNewWriteRows, 'migrate-storage');
      log('written batch to new storage');

      // TODO we should throw on non-conflict errors here.
      // if (Object.keys(writeToNewResult.error).length > 0) {
      //     throw new Error('could not write to new storage');
      // }

      /**
       * Remove the docs from the old storage
       */
      var writeToOldRows = docs.map((_doc, idx) => {
        var previous = docsNonMutated[idx];
        if (!previous._meta) {
          previous._meta = {
            lwt: new Date().getTime()
          };
        }
        var newDoc = (0, _index.clone)(previous);
        newDoc._deleted = true;
        if (!newDoc._meta) {
          newDoc._meta = {
            lwt: new Date().getTime()
          };
        }
        newDoc._meta.lwt = new Date().getTime() + 1;
        newDoc._rev = (0, _index.createRevision)(oldDatabaseInstanceToken, previous);
        return {
          previous,
          document: newDoc
        };
      });
      try {
        var writeToOldResult = await oldStorageInstance.bulkWrite(writeToOldRows, 'migrate-between-rxdb-versions');
        if (Object.keys(writeToOldResult.error).length > 0) {
          console.dir({
            writeToOldRows,
            errors: writeToOldResult.error
          });
          throw new Error('got error while deleting migrated documents on the old storage');
        }
      } catch (err) {
        log('could not delete on old instance');
        console.dir(err);
        throw err;
      }
      log('deleted batch on old storage');
      await oldStorageInstance.cleanup(0).catch(() => {
        /**
         * Migration from RxDB v14 to v15 had problem running the cleanup()
         * on the old storage because the indexing structure changed.
         * Because the periodic cleanup during migration
         * is an optional step, we just log instead of throwing an error.
         * @link https://github.com/pubkey/rxdb/issues/5565
         * 
         * TODO remove this in the next major version
         */
        log('oldStorageInstance.cleanup(0) has thrown');
      });

      // run the handler if provided
      if (afterMigrateBatch) {
        await afterMigrateBatch({
          databaseName: collection.database.name,
          collectionName: collection.name,
          oldDatabaseName,
          insertToNewWriteRows,
          writeToNewResult
        });
      }
    },
    _ret;
  while (true) {
    _ret = await _loop();
    if (_ret) return _ret.v;
  }
}
//# sourceMappingURL=index.js.map