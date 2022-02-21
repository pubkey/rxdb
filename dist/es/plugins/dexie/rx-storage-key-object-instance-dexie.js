import { Subject } from 'rxjs';
import { createRevision, flatClone, now, parseRevision, randomCouchString } from '../../util';
import { closeDexieDb, getDexieDbWithTables, getDexieEventKey } from './dexie-helper';
export var createDexieKeyObjectStorageInstance = function createDexieKeyObjectStorageInstance(storage, params, settings) {
  try {
    var _internals = getDexieDbWithTables(params.databaseName, params.collectionName, settings, {
      version: 0,
      primaryKey: '_id',
      type: 'object',
      properties: {}
    });

    var instance = new RxStorageKeyObjectInstanceDexie(storage, params.databaseName, params.collectionName, _internals, params.options, settings);
    return Promise.resolve(instance);
  } catch (e) {
    return Promise.reject(e);
  }
};
var instanceId = 1;
export var RxStorageKeyObjectInstanceDexie = /*#__PURE__*/function () {
  function RxStorageKeyObjectInstanceDexie(storage, databaseName, collectionName, internals, options, settings) {
    this.changes$ = new Subject();
    this.instanceId = instanceId++;
    this.closed = false;
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.internals = internals;
    this.options = options;
    this.settings = settings;
  }

  var _proto = RxStorageKeyObjectInstanceDexie.prototype;

  _proto.bulkWrite = function bulkWrite(documentWrites) {
    try {
      var _this2 = this;

      return Promise.resolve(_this2.internals).then(function (state) {
        var ret = {
          success: {},
          error: {}
        };
        var eventBulk = {
          id: randomCouchString(10),
          events: []
        };
        var documentKeys = documentWrites.map(function (writeRow) {
          return writeRow.document._id;
        });
        var bulkPutData = [];
        return Promise.resolve(state.dexieDb.transaction('rw', state.dexieTable, function () {
          try {
            var startTime = now();
            return Promise.resolve(state.dexieTable.bulkGet(documentKeys)).then(function (docsInDb) {
              var successDocs = [];
              documentWrites.forEach(function (writeRow, writeRowIdx) {
                var writeDoc = flatClone(writeRow.document);
                var id = writeDoc._id;
                var docInDb = docsInDb[writeRowIdx];
                var previous = writeRow.previous ? writeRow.previous : docInDb;
                var newRevHeight = previous ? parseRevision(previous._rev).height + 1 : 1;
                var newRevision = newRevHeight + '-' + createRevision(writeRow.document);
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
                    bulkPutData.push(writeDoc);
                  }
                } else {
                  bulkPutData.push(writeDoc);
                }

                ret.success[id] = writeDoc;
                successDocs.push({
                  writeRow: writeRow,
                  previous: previous,
                  newRevision: newRevision
                });
              });
              return Promise.resolve(state.dexieTable.bulkPut(bulkPutData)).then(function () {
                var endTime = now();
                successDocs.forEach(function (sucessRow) {
                  var writeRow = sucessRow.writeRow;
                  var writeDoc = writeRow.document;
                  var id = writeDoc._id;
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
                    var previousDoc = flatClone(writeRow.previous);
                    previousDoc._rev = sucessRow.newRevision;
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
                    var eventId = getDexieEventKey(true, doc._id, doc._rev ? doc._rev : '');
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
              });
            });
          } catch (e) {
            return Promise.reject(e);
          }
        })).then(function () {
          _this2.changes$.next(eventBulk);

          return ret;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.findLocalDocumentsById = function findLocalDocumentsById(ids, withDeleted) {
    try {
      var _this4 = this;

      return Promise.resolve(_this4.internals).then(function (state) {
        var ret = {};
        return Promise.resolve(state.dexieTable.bulkGet(ids)).then(function (docsInDb) {
          ids.forEach(function (id, idx) {
            var documentInDb = docsInDb[idx];

            if (documentInDb && (withDeleted || !documentInDb._deleted)) {
              ret[id] = documentInDb;
            }
          });
          return ret;
        });
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
      var _this6 = this;

      _this6.closed = true;

      _this6.changes$.complete();

      closeDexieDb(_this6.internals);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.remove = function remove() {
    try {
      var _this8 = this;

      return Promise.resolve(_this8.internals).then(function (state) {
        return Promise.resolve(Promise.all([state.dexieChangesTable.clear(), state.dexieTable.clear()])).then(function () {
          return _this8.close();
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return RxStorageKeyObjectInstanceDexie;
}();
//# sourceMappingURL=rx-storage-key-object-instance-dexie.js.map