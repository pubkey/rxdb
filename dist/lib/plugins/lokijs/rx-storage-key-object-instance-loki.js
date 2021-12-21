"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createLokiKeyValueLocalState = exports.createLokiKeyObjectStorageInstance = exports.RxStorageKeyObjectInstanceLoki = void 0;

var _rxjs = require("rxjs");

var _rxError = require("../../rx-error");

var _util = require("../../util");

var _lokijsHelper = require("./lokijs-helper");

var createLokiKeyObjectStorageInstance = function createLokiKeyObjectStorageInstance(storage, params, databaseSettings) {
  try {
    var _temp7 = function _temp7() {
      var instance = new RxStorageKeyObjectInstanceLoki(storage, params.databaseName, params.collectionName, _internals, params.options, databaseSettings);
      /**
       * Directly create the localState if the db becomes leader.
       */

      if (params.multiInstance) {
        (0, _util.ensureNotFalsy)(_internals.leaderElector).awaitLeadership().then(function () {
          return (0, _lokijsHelper.mustUseLocalState)(instance);
        });
      }

      return instance;
    };

    var _internals = {};

    var _temp8 = function () {
      if (params.multiInstance) {
        var leaderElector = (0, _lokijsHelper.getLokiLeaderElector)(storage, params.databaseName);
        _internals.leaderElector = leaderElector;
      } else {
        // optimisation shortcut, directly create db is non multi instance.
        _internals.localState = createLokiKeyValueLocalState(params, databaseSettings);
        return Promise.resolve(_internals.localState).then(function () {});
      }
    }();

    return Promise.resolve(_temp8 && _temp8.then ? _temp8.then(_temp7) : _temp7(_temp8));
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.createLokiKeyObjectStorageInstance = createLokiKeyObjectStorageInstance;

var createLokiKeyValueLocalState = function createLokiKeyValueLocalState(params, databaseSettings) {
  try {
    if (!params.options) {
      params.options = {};
    }

    return Promise.resolve((0, _lokijsHelper.getLokiDatabase)(params.databaseName, databaseSettings)).then(function (databaseState) {
      var collectionOptions = Object.assign({}, params.options.collection, {
        indices: [],
        unique: ['_id']
      }, _lokijsHelper.LOKIJS_COLLECTION_DEFAULT_OPTIONS);
      var collection = databaseState.database.addCollection(params.collectionName, collectionOptions);
      databaseState.collections[params.collectionName] = collection;
      var changesCollectionName = params.collectionName + _lokijsHelper.CHANGES_COLLECTION_SUFFIX;
      var changesCollectionOptions = Object.assign({
        unique: ['eventId'],
        indices: ['sequence']
      }, _lokijsHelper.LOKIJS_COLLECTION_DEFAULT_OPTIONS);
      var changesCollection = databaseState.database.addCollection(changesCollectionName, changesCollectionOptions);
      databaseState.collections[changesCollectionName] = collection;
      return {
        changesCollection: changesCollection,
        collection: collection,
        databaseState: databaseState
      };
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.createLokiKeyValueLocalState = createLokiKeyValueLocalState;
var instanceId = 1;

var RxStorageKeyObjectInstanceLoki = /*#__PURE__*/function () {
  function RxStorageKeyObjectInstanceLoki(storage, databaseName, collectionName, internals, options, databaseSettings) {
    var _this = this;

    this.changes$ = new _rxjs.Subject();
    this.instanceId = instanceId++;
    this.closed = false;
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.internals = internals;
    this.options = options;
    this.databaseSettings = databaseSettings;

    _lokijsHelper.OPEN_LOKIJS_STORAGE_INSTANCES.add(this);

    if (this.internals.leaderElector) {
      this.internals.leaderElector.awaitLeadership().then(function () {
        // this instance is leader now, so it has to reply to queries from other instances
        (0, _util.ensureNotFalsy)(_this.internals.leaderElector).broadcastChannel.addEventListener('message', function (msg) {
          try {
            return Promise.resolve((0, _lokijsHelper.handleRemoteRequest)(_this, msg));
          } catch (e) {
            return Promise.reject(e);
          }
        });
      });
    }
  }

  var _proto = RxStorageKeyObjectInstanceLoki.prototype;

  _proto.bulkWrite = function bulkWrite(documentWrites) {
    try {
      var _this3 = this;

      if (documentWrites.length === 0) {
        throw (0, _rxError.newRxError)('P2', {
          args: {
            documentWrites: documentWrites
          }
        });
      }

      return Promise.resolve((0, _lokijsHelper.mustUseLocalState)(_this3)).then(function (localState) {
        if (!localState) {
          return (0, _lokijsHelper.requestRemoteInstance)(_this3, 'bulkWrite', [documentWrites]);
        }

        var startTime = (0, _util.now)();
        return Promise.resolve((0, _util.promiseWait)(0)).then(function () {
          var ret = {
            success: {},
            error: {}
          };
          var writeRowById = new Map();
          var eventBulk = {
            id: (0, _util.randomCouchString)(10),
            events: []
          };
          documentWrites.forEach(function (writeRow) {
            var id = writeRow.document._id;
            writeRowById.set(id, writeRow);
            var writeDoc = (0, _util.flatClone)(writeRow.document);
            var docInDb = localState.collection.by('_id', id);
            var previous = writeRow.previous ? writeRow.previous : localState.collection.by('_id', id);
            var newRevHeight = previous ? (0, _util.parseRevision)(previous._rev).height + 1 : 1;
            var newRevision = newRevHeight + '-' + (0, _util.createRevision)(writeRow.document);
            writeDoc._rev = newRevision;

            if (docInDb) {
              if (!writeRow.previous || docInDb._rev !== writeRow.previous._rev) {
                // conflict error
                var err = {
                  isError: true,
                  status: 409,
                  documentId: id,
                  writeRow: writeRow
                };
                ret.error[id] = err;
                return;
              } else {
                var toLoki = (0, _util.flatClone)(writeDoc);
                toLoki.$loki = docInDb.$loki;
                toLoki.$lastWriteAt = startTime;
                localState.collection.update(toLoki);
              }
            } else {
              var insertData = (0, _util.flatClone)(writeDoc);
              insertData.$lastWriteAt = startTime;
              localState.collection.insert(insertData);
            }

            ret.success[id] = (0, _lokijsHelper.stripLokiKey)(writeDoc);
            var endTime = (0, _util.now)();
            var event;

            if (!writeRow.previous) {
              // was insert
              event = {
                operation: 'INSERT',
                doc: writeDoc,
                id: id,
                previous: null
              };
            } else if (writeRow.document._deleted) {
              // was delete
              // we need to add the new revision to the previous doc
              // so that the eventkey is calculated correctly.
              // Is this a hack? idk.
              var previousDoc = (0, _util.flatClone)(writeRow.previous);
              previousDoc._rev = newRevision;
              event = {
                operation: 'DELETE',
                doc: null,
                id: id,
                previous: previousDoc
              };
            } else {
              // was update
              event = {
                operation: 'UPDATE',
                doc: writeDoc,
                id: id,
                previous: writeRow.previous
              };
            }

            if (writeRow.document._deleted && (!writeRow.previous || writeRow.previous._deleted)) {
              /**
               * An already deleted document was added to the storage engine,
               * do not emit an event because it does not affect anything.
               */
            } else {
              var doc = event.operation === 'DELETE' ? event.previous : event.doc;
              var eventId = (0, _lokijsHelper.getLokiEventKey)(true, doc._id, doc._rev ? doc._rev : '');
              var storageChangeEvent = {
                eventId: eventId,
                documentId: id,
                change: event,
                startTime: startTime,
                endTime: endTime
              };
              eventBulk.events.push(storageChangeEvent);
            }
          });
          localState.databaseState.saveQueue.addWrite();

          _this3.changes$.next(eventBulk);

          return ret;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.findLocalDocumentsById = function findLocalDocumentsById(ids) {
    try {
      var _this5 = this;

      return Promise.resolve((0, _lokijsHelper.mustUseLocalState)(_this5)).then(function (localState) {
        return localState ? Promise.resolve((0, _util.promiseWait)(0)).then(function () {
          var ret = {};
          ids.forEach(function (id) {
            var documentInDb = localState.collection.by('_id', id);

            if (documentInDb && !documentInDb._deleted) {
              ret[id] = (0, _lokijsHelper.stripLokiKey)(documentInDb);
            }
          });
          return ret;
        }) : (0, _lokijsHelper.requestRemoteInstance)(_this5, 'findLocalDocumentsById', [ids]);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };

  _proto.close = function close() {
    try {
      var _temp3 = function _temp3() {
        (0, _lokijsHelper.removeLokiLeaderElectorReference)(_this7.storage, _this7.databaseName);
      };

      var _this7 = this;

      _this7.closed = true;

      _this7.changes$.complete();

      _lokijsHelper.OPEN_LOKIJS_STORAGE_INSTANCES["delete"](_this7);

      var _temp4 = function () {
        if (_this7.internals.localState) {
          return Promise.resolve((0, _util.ensureNotFalsy)(_this7.internals.localState)).then(function (localState) {
            return Promise.resolve((0, _lokijsHelper.closeLokiCollections)(_this7.databaseName, [(0, _util.ensureNotFalsy)(localState.collection), (0, _util.ensureNotFalsy)(localState.changesCollection)])).then(function () {});
          });
        }
      }();

      return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(_temp3) : _temp3(_temp4));
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.remove = function remove() {
    try {
      var _this9 = this;

      return Promise.resolve((0, _lokijsHelper.mustUseLocalState)(_this9)).then(function (localState) {
        if (!localState) {
          return (0, _lokijsHelper.requestRemoteInstance)(_this9, 'remove', []);
        }

        localState.databaseState.database.removeCollection(localState.collection.name);
        localState.databaseState.database.removeCollection(localState.changesCollection.name);

        _this9.close();
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return RxStorageKeyObjectInstanceLoki;
}();

exports.RxStorageKeyObjectInstanceLoki = RxStorageKeyObjectInstanceLoki;
//# sourceMappingURL=rx-storage-key-object-instance-loki.js.map