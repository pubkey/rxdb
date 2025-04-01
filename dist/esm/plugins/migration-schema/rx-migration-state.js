import { Subject, filter, firstValueFrom, map, shareReplay } from 'rxjs';
import { isBulkWriteConflictError, newRxError } from "../../rx-error.js";
import { MIGRATION_DEFAULT_BATCH_SIZE, addMigrationStateToDatabase, getOldCollectionMeta, migrateDocumentData, mustMigrate } from "./migration-helpers.js";
import { PROMISE_RESOLVE_TRUE, RXJS_SHARE_REPLAY_DEFAULTS, clone, deepEqual, ensureNotFalsy, errorToPlainJson, getDefaultRevision, getDefaultRxDocumentMeta } from "../utils/index.js";
import { getSingleDocument, hasEncryption, observeSingle, writeSingle } from "../../rx-storage-helper.js";
import { BroadcastChannel, createLeaderElection } from 'broadcast-channel';
import { META_INSTANCE_SCHEMA_TITLE, awaitRxStorageReplicationFirstInSync, awaitRxStorageReplicationInSync, cancelRxStorageReplication, defaultConflictHandler, getRxReplicationMetaInstanceSchema, replicateRxStorageInstance, rxStorageInstanceToReplicationHandler } from "../../replication-protocol/index.js";
import { overwritable } from "../../overwritable.js";
import { INTERNAL_CONTEXT_MIGRATION_STATUS, addConnectedStorageToCollection, getPrimaryKeyOfInternalDocument } from "../../rx-database-internal-store.js";
import { normalizeMangoQuery, prepareQuery } from "../../rx-query-helper.js";
export var RxMigrationState = /*#__PURE__*/function () {
  function RxMigrationState(collection, migrationStrategies, statusDocKey = [collection.name, 'v', collection.schema.version].join('-')) {
    this.started = false;
    this.updateStatusHandlers = [];
    this.updateStatusQueue = PROMISE_RESOLVE_TRUE;
    this.collection = collection;
    this.migrationStrategies = migrationStrategies;
    this.statusDocKey = statusDocKey;
    this.database = collection.database;
    this.oldCollectionMeta = getOldCollectionMeta(this);
    this.mustMigrate = mustMigrate(this);
    this.statusDocId = getPrimaryKeyOfInternalDocument(this.statusDocKey, INTERNAL_CONTEXT_MIGRATION_STATUS);
    addMigrationStateToDatabase(this);
    this.$ = observeSingle(this.database.internalStore, this.statusDocId).pipe(filter(d => !!d), map(d => ensureNotFalsy(d).data), shareReplay(RXJS_SHARE_REPLAY_DEFAULTS));
  }
  var _proto = RxMigrationState.prototype;
  _proto.getStatus = function getStatus() {
    return firstValueFrom(this.$);
  }

  /**
   * Starts the migration.
   * Returns void so that people to not get the idea to await
   * this function.
   * Instead use migratePromise() if you want to await
   * the migration. This ensures it works even if the migration
   * is run on a different browser tab.
   */;
  _proto.startMigration = async function startMigration(batchSize = MIGRATION_DEFAULT_BATCH_SIZE) {
    var must = await this.mustMigrate;
    if (!must) {
      return;
    }
    if (this.started) {
      throw newRxError('DM1');
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
      broadcastChannel = new BroadcastChannel(['rx-migration-state', this.database.name, this.collection.name, this.collection.schema.version].join('|'));
      var leaderElector = createLeaderElection(broadcastChannel);
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
      devMode: overwritable.isDevMode()
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
        await addConnectedStorageToCollection(this.collection, connectedInstance.newStorage.collectionName, connectedInstance.newStorage.schema);
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
        s.error = errorToPlainJson(err);
        return s;
      });
      return;
    }

    // remove old collection meta doc
    await writeSingle(this.database.internalStore, {
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
        var previous = await getSingleDocument(this.database.internalStore, this.statusDocId);
        var newDoc = clone(previous);
        if (!previous) {
          newDoc = {
            id: this.statusDocId,
            key: this.statusDocKey,
            context: INTERNAL_CONTEXT_MIGRATION_STATUS,
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
            _meta: getDefaultRxDocumentMeta(),
            _rev: getDefaultRevision(),
            _attachments: {}
          };
        }
        var status = ensureNotFalsy(newDoc).data;
        for (var oneHandler of useHandlers) {
          status = oneHandler(status);
        }
        status.count.percent = Math.round(status.count.handled / status.count.total * 100);
        if (newDoc && previous && deepEqual(newDoc.data, previous.data)) {
          break;
        }
        try {
          await writeSingle(this.database.internalStore, {
            previous,
            document: ensureNotFalsy(newDoc)
          }, INTERNAL_CONTEXT_MIGRATION_STATUS);

          // write successful
          break;
        } catch (err) {
          // ignore conflicts
          if (!isBulkWriteConflictError(err)) {
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
      schema: getRxReplicationMetaInstanceSchema(oldStorage.schema, hasEncryption(oldStorage.schema)),
      password: this.database.password,
      devMode: overwritable.isDevMode()
    });
    var replicationHandlerBase = rxStorageInstanceToReplicationHandler(newStorage,
    /**
     * Ignore push-conflicts.
     * If this happens we drop the 'old' document state.
     */
    defaultConflictHandler, this.database.token, true);
    var replicationState = replicateRxStorageInstance({
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
            if (newStorage.schema.title === META_INSTANCE_SCHEMA_TITLE) {
              newDocData = row.newDocumentState.docData;
              if (row.newDocumentState.isCheckpoint === '1') {
                return {
                  assumedMasterState: undefined,
                  newDocumentState: row.newDocumentState
                };
              }
            }
            var migratedDocData = await migrateDocumentData(this.collection, oldStorage.schema.version, newDocData);
            var newRow = {
              // drop the assumed master state, we do not have to care about conflicts here.
              assumedMasterState: undefined,
              newDocumentState: newStorage.schema.title === META_INSTANCE_SCHEMA_TITLE ? Object.assign({}, row.newDocumentState, {
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
        masterChangeStream$: new Subject().asObservable()
      },
      forkInstance: oldStorage,
      metaInstance: replicationMetaStorageInstance,
      pushBatchSize: batchSize,
      pullBatchSize: 0,
      conflictHandler: defaultConflictHandler,
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
    await awaitRxStorageReplicationFirstInSync(replicationState);
    await awaitRxStorageReplicationInSync(replicationState);
    await cancelRxStorageReplication(replicationState);
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
      var preparedQuery = prepareQuery(instance.schema, normalizeMangoQuery(instance.schema, {
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
      if (connectedStorage.schema.title !== META_INSTANCE_SCHEMA_TITLE) {
        throw new Error('unknown migration handling for schema');
      }
      var newSchema = getRxReplicationMetaInstanceSchema(clone(this.collection.schema.jsonSchema), hasEncryption(connectedStorage.schema));
      newSchema.version = this.collection.schema.version;
      var [oldStorage, newStorage] = await Promise.all([this.database.storage.createStorageInstance({
        databaseInstanceToken: this.database.token,
        databaseName: this.database.name,
        devMode: overwritable.isDevMode(),
        multiInstance: this.database.multiInstance,
        options: {},
        schema: connectedStorage.schema,
        password: this.database.password,
        collectionName: connectedStorage.collectionName
      }), this.database.storage.createStorageInstance({
        databaseInstanceToken: this.database.token,
        databaseName: this.database.name,
        devMode: overwritable.isDevMode(),
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
    var result = await Promise.race([firstValueFrom(this.$.pipe(filter(d => d.status === 'DONE'))), firstValueFrom(this.$.pipe(filter(d => d.status === 'ERROR')))]);
    if (result.status === 'ERROR') {
      throw newRxError('DM4', {
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