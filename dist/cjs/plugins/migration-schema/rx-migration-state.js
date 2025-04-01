"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxMigrationState = void 0;
var _rxjs = require("rxjs");
var _rxError = require("../../rx-error.js");
var _migrationHelpers = require("./migration-helpers.js");
var _index = require("../utils/index.js");
var _rxStorageHelper = require("../../rx-storage-helper.js");
var _broadcastChannel = require("broadcast-channel");
var _index2 = require("../../replication-protocol/index.js");
var _overwritable = require("../../overwritable.js");
var _rxDatabaseInternalStore = require("../../rx-database-internal-store.js");
var _rxQueryHelper = require("../../rx-query-helper.js");
var RxMigrationState = exports.RxMigrationState = /*#__PURE__*/function () {
  function RxMigrationState(collection, migrationStrategies, statusDocKey = [collection.name, 'v', collection.schema.version].join('-')) {
    this.started = false;
    this.updateStatusHandlers = [];
    this.updateStatusQueue = _index.PROMISE_RESOLVE_TRUE;
    this.collection = collection;
    this.migrationStrategies = migrationStrategies;
    this.statusDocKey = statusDocKey;
    this.database = collection.database;
    this.oldCollectionMeta = (0, _migrationHelpers.getOldCollectionMeta)(this);
    this.mustMigrate = (0, _migrationHelpers.mustMigrate)(this);
    this.statusDocId = (0, _rxDatabaseInternalStore.getPrimaryKeyOfInternalDocument)(this.statusDocKey, _rxDatabaseInternalStore.INTERNAL_CONTEXT_MIGRATION_STATUS);
    (0, _migrationHelpers.addMigrationStateToDatabase)(this);
    this.$ = (0, _rxStorageHelper.observeSingle)(this.database.internalStore, this.statusDocId).pipe((0, _rxjs.filter)(d => !!d), (0, _rxjs.map)(d => (0, _index.ensureNotFalsy)(d).data), (0, _rxjs.shareReplay)(_index.RXJS_SHARE_REPLAY_DEFAULTS));
  }
  var _proto = RxMigrationState.prototype;
  _proto.getStatus = function getStatus() {
    return (0, _rxjs.firstValueFrom)(this.$);
  }

  /**
   * Starts the migration.
   * Returns void so that people to not get the idea to await
   * this function.
   * Instead use migratePromise() if you want to await
   * the migration. This ensures it works even if the migration
   * is run on a different browser tab.
   */;
  _proto.startMigration = async function startMigration(batchSize = _migrationHelpers.MIGRATION_DEFAULT_BATCH_SIZE) {
    var must = await this.mustMigrate;
    if (!must) {
      return;
    }
    if (this.started) {
      throw (0, _rxError.newRxError)('DM1');
    }
    this.started = true;
    var broadcastChannel = undefined;
    /**
     * To ensure that multiple tabs do not migrate the same collection,
     * we use a new broadcastChannel/leaderElector for each collection.
     * This is required because collections can be added dynamically and
     * not all tabs might know about this collection.
     */
    if (this.database.multiInstance) {
      broadcastChannel = new _broadcastChannel.BroadcastChannel(['rx-migration-state', this.database.name, this.collection.name, this.collection.schema.version].join('|'));
      var leaderElector = (0, _broadcastChannel.createLeaderElection)(broadcastChannel);
      await leaderElector.awaitLeadership();
    }

    /**
     * Instead of writing a custom migration protocol,
     * we do a push-only replication from the old collection data to the new one.
     * This also ensure that restarting the replication works without problems.
     */
    var oldCollectionMeta = await this.oldCollectionMeta;
    var oldStorageInstance = await this.database.storage.createStorageInstance({
      databaseName: this.database.name,
      collectionName: this.collection.name,
      databaseInstanceToken: this.database.token,
      multiInstance: this.database.multiInstance,
      options: {},
      schema: oldCollectionMeta.data.schema,
      password: this.database.password,
      devMode: _overwritable.overwritable.isDevMode()
    });
    var connectedInstances = await this.getConnectedStorageInstances();

    /**
     * Initially write the migration status into a meta document.
     */
    var totalCount = await this.countAllDoucments([oldStorageInstance].concat(connectedInstances.map(r => r.oldStorage)));
    await this.updateStatus(s => {
      s.count.total = totalCount;
      return s;
    });
    try {
      /**
       * First migrate the connected storages,
       * afterwards migrate the normal collection.
       */
      await Promise.all(connectedInstances.map(async connectedInstance => {
        await (0, _rxDatabaseInternalStore.addConnectedStorageToCollection)(this.collection, connectedInstance.newStorage.collectionName, connectedInstance.newStorage.schema);
        await this.migrateStorage(connectedInstance.oldStorage, connectedInstance.newStorage, batchSize);
        await connectedInstance.newStorage.close();
      }));
      await this.migrateStorage(oldStorageInstance,
      /**
       * Use the originalStorageInstance here
       * so that the _meta.lwt time keeps the same
       * and our replication checkpoints still point to the
       * correct checkpoint.
       */
      this.collection.storageInstance.originalStorageInstance, batchSize);
    } catch (err) {
      await oldStorageInstance.close();
      await this.updateStatus(s => {
        s.status = 'ERROR';
        s.error = (0, _index.errorToPlainJson)(err);
        return s;
      });
      return;
    }

    // remove old collection meta doc
    await (0, _rxStorageHelper.writeSingle)(this.database.internalStore, {
      previous: oldCollectionMeta,
      document: Object.assign({}, oldCollectionMeta, {
        _deleted: true
      })
    }, 'rx-migration-remove-collection-meta');
    await this.updateStatus(s => {
      s.status = 'DONE';
      return s;
    });
    if (broadcastChannel) {
      await broadcastChannel.close();
    }
  };
  _proto.updateStatus = function updateStatus(handler) {
    this.updateStatusHandlers.push(handler);
    this.updateStatusQueue = this.updateStatusQueue.then(async () => {
      if (this.updateStatusHandlers.length === 0) {
        return;
      }
      // re-run until no conflict
      var useHandlers = this.updateStatusHandlers;
      this.updateStatusHandlers = [];
      while (true) {
        var previous = await (0, _rxStorageHelper.getSingleDocument)(this.database.internalStore, this.statusDocId);
        var newDoc = (0, _index.clone)(previous);
        if (!previous) {
          newDoc = {
            id: this.statusDocId,
            key: this.statusDocKey,
            context: _rxDatabaseInternalStore.INTERNAL_CONTEXT_MIGRATION_STATUS,
            data: {
              collectionName: this.collection.name,
              status: 'RUNNING',
              count: {
                total: 0,
                handled: 0,
                percent: 0
              }
            },
            _deleted: false,
            _meta: (0, _index.getDefaultRxDocumentMeta)(),
            _rev: (0, _index.getDefaultRevision)(),
            _attachments: {}
          };
        }
        var status = (0, _index.ensureNotFalsy)(newDoc).data;
        for (var oneHandler of useHandlers) {
          status = oneHandler(status);
        }
        status.count.percent = Math.round(status.count.handled / status.count.total * 100);
        if (newDoc && previous && (0, _index.deepEqual)(newDoc.data, previous.data)) {
          break;
        }
        try {
          await (0, _rxStorageHelper.writeSingle)(this.database.internalStore, {
            previous,
            document: (0, _index.ensureNotFalsy)(newDoc)
          }, _rxDatabaseInternalStore.INTERNAL_CONTEXT_MIGRATION_STATUS);

          // write successful
          break;
        } catch (err) {
          // ignore conflicts
          if (!(0, _rxError.isBulkWriteConflictError)(err)) {
            throw err;
          }
        }
      }
    });
    return this.updateStatusQueue;
  };
  _proto.migrateStorage = async function migrateStorage(oldStorage, newStorage, batchSize) {
    var replicationMetaStorageInstance = await this.database.storage.createStorageInstance({
      databaseName: this.database.name,
      collectionName: 'rx-migration-state-meta-' + oldStorage.collectionName + '-' + oldStorage.schema.version,
      databaseInstanceToken: this.database.token,
      multiInstance: this.database.multiInstance,
      options: {},
      schema: (0, _index2.getRxReplicationMetaInstanceSchema)(oldStorage.schema, (0, _rxStorageHelper.hasEncryption)(oldStorage.schema)),
      password: this.database.password,
      devMode: _overwritable.overwritable.isDevMode()
    });
    var replicationHandlerBase = (0, _index2.rxStorageInstanceToReplicationHandler)(newStorage,
    /**
     * Ignore push-conflicts.
     * If this happens we drop the 'old' document state.
     */
    _index2.defaultConflictHandler, this.database.token, true);
    var replicationState = (0, _index2.replicateRxStorageInstance)({
      keepMeta: true,
      identifier: ['rx-migration-state', oldStorage.collectionName, oldStorage.schema.version, this.collection.schema.version].join('-'),
      replicationHandler: {
        masterChangesSince() {
          return Promise.resolve({
            checkpoint: null,
            documents: []
          });
        },
        masterWrite: async rows => {
          rows = await Promise.all(rows.map(async row => {
            var newDocData = row.newDocumentState;
            if (newStorage.schema.title === _index2.META_INSTANCE_SCHEMA_TITLE) {
              newDocData = row.newDocumentState.docData;
              if (row.newDocumentState.isCheckpoint === '1') {
                return {
                  assumedMasterState: undefined,
                  newDocumentState: row.newDocumentState
                };
              }
            }
            var migratedDocData = await (0, _migrationHelpers.migrateDocumentData)(this.collection, oldStorage.schema.version, newDocData);
            var newRow = {
              // drop the assumed master state, we do not have to care about conflicts here.
              assumedMasterState: undefined,
              newDocumentState: newStorage.schema.title === _index2.META_INSTANCE_SCHEMA_TITLE ? Object.assign({}, row.newDocumentState, {
                docData: migratedDocData
              }) : migratedDocData
            };
            return newRow;
          }));

          // filter out the documents where the migration strategy returned null
          rows = rows.filter(row => !!row.newDocumentState);
          var result = await replicationHandlerBase.masterWrite(rows);
          return result;
        },
        masterChangeStream$: new _rxjs.Subject().asObservable()
      },
      forkInstance: oldStorage,
      metaInstance: replicationMetaStorageInstance,
      pushBatchSize: batchSize,
      pullBatchSize: 0,
      conflictHandler: _index2.defaultConflictHandler,
      hashFunction: this.database.hashFunction
    });
    var hasError = false;
    replicationState.events.error.subscribe(err => hasError = err);

    // update replication status on each change
    replicationState.events.processed.up.subscribe(() => {
      this.updateStatus(status => {
        status.count.handled = status.count.handled + 1;
        return status;
      });
    });
    await (0, _index2.awaitRxStorageReplicationFirstInSync)(replicationState);
    await (0, _index2.awaitRxStorageReplicationInSync)(replicationState);
    await (0, _index2.cancelRxStorageReplication)(replicationState);
    await this.updateStatusQueue;
    if (hasError) {
      await replicationMetaStorageInstance.close();
      throw hasError;
    }

    // cleanup old storages
    await Promise.all([oldStorage.remove(), replicationMetaStorageInstance.remove()]);
  };
  _proto.countAllDoucments = async function countAllDoucments(storageInstances) {
    var ret = 0;
    await Promise.all(storageInstances.map(async instance => {
      var preparedQuery = (0, _rxQueryHelper.prepareQuery)(instance.schema, (0, _rxQueryHelper.normalizeMangoQuery)(instance.schema, {
        selector: {}
      }));
      var countResult = await instance.count(preparedQuery);
      ret += countResult.count;
    }));
    return ret;
  };
  _proto.getConnectedStorageInstances = async function getConnectedStorageInstances() {
    var oldCollectionMeta = await this.oldCollectionMeta;
    var ret = [];
    await Promise.all(await Promise.all(oldCollectionMeta.data.connectedStorages.map(async connectedStorage => {
      // atm we can only migrate replication states.
      if (connectedStorage.schema.title !== _index2.META_INSTANCE_SCHEMA_TITLE) {
        throw new Error('unknown migration handling for schema');
      }
      var newSchema = (0, _index2.getRxReplicationMetaInstanceSchema)((0, _index.clone)(this.collection.schema.jsonSchema), (0, _rxStorageHelper.hasEncryption)(connectedStorage.schema));
      newSchema.version = this.collection.schema.version;
      var [oldStorage, newStorage] = await Promise.all([this.database.storage.createStorageInstance({
        databaseInstanceToken: this.database.token,
        databaseName: this.database.name,
        devMode: _overwritable.overwritable.isDevMode(),
        multiInstance: this.database.multiInstance,
        options: {},
        schema: connectedStorage.schema,
        password: this.database.password,
        collectionName: connectedStorage.collectionName
      }), this.database.storage.createStorageInstance({
        databaseInstanceToken: this.database.token,
        databaseName: this.database.name,
        devMode: _overwritable.overwritable.isDevMode(),
        multiInstance: this.database.multiInstance,
        options: {},
        schema: newSchema,
        password: this.database.password,
        collectionName: connectedStorage.collectionName
      })]);
      ret.push({
        oldStorage,
        newStorage
      });
    })));
    return ret;
  };
  _proto.migratePromise = async function migratePromise(batchSize) {
    this.startMigration(batchSize);
    var must = await this.mustMigrate;
    if (!must) {
      return {
        status: 'DONE',
        collectionName: this.collection.name,
        count: {
          handled: 0,
          percent: 0,
          total: 0
        }
      };
    }
    var result = await Promise.race([(0, _rxjs.firstValueFrom)(this.$.pipe((0, _rxjs.filter)(d => d.status === 'DONE'))), (0, _rxjs.firstValueFrom)(this.$.pipe((0, _rxjs.filter)(d => d.status === 'ERROR')))]);
    if (result.status === 'ERROR') {
      throw (0, _rxError.newRxError)('DM4', {
        collection: this.collection.name,
        error: result.error
      });
    } else {
      return result;
    }
  };
  return RxMigrationState;
}();
//# sourceMappingURL=rx-migration-state.js.map