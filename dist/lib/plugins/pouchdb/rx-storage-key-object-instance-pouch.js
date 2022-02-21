"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageKeyObjectInstancePouch = void 0;

var _rxjs = require("rxjs");

var _rxError = require("../../rx-error");

var _util = require("../../util");

var _pouchdbHelper = require("./pouchdb-helper");

function _catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }

  if (result && result.then) {
    return result.then(void 0, recover);
  }

  return result;
}

var RxStorageKeyObjectInstancePouch = /*#__PURE__*/function () {
  function RxStorageKeyObjectInstancePouch(databaseName, collectionName, internals, options) {
    this.changes$ = new _rxjs.Subject();
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.internals = internals;
    this.options = options;

    _pouchdbHelper.OPEN_POUCHDB_STORAGE_INSTANCES.add(this);
  }

  var _proto = RxStorageKeyObjectInstancePouch.prototype;

  _proto.close = function close() {
    _pouchdbHelper.OPEN_POUCHDB_STORAGE_INSTANCES["delete"](this); // TODO this did not work because a closed pouchdb cannot be recreated in the same process run
    // await this.internals.pouch.close();


    return _util.PROMISE_RESOLVE_VOID;
  };

  _proto.remove = function remove() {
    try {
      var _this2 = this;

      _pouchdbHelper.OPEN_POUCHDB_STORAGE_INSTANCES["delete"](_this2);

      return Promise.resolve(_this2.internals.pouch.destroy()).then(function () {});
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.bulkWrite = function bulkWrite(documentWrites) {
    try {
      var _this4 = this;

      if (documentWrites.length === 0) {
        throw (0, _rxError.newRxError)('P2', {
          args: {
            documentWrites: documentWrites
          }
        });
      }

      var writeRowById = new Map();
      var insertDocs = documentWrites.map(function (writeRow) {
        writeRowById.set(writeRow.document._id, writeRow);
        /**
         * add local prefix
         * Local documents always have _id as primary
         */

        var storeDocumentData = (0, _pouchdbHelper.localDocumentToPouch)(writeRow.document); // if previous document exists, we have to send the previous revision to pouchdb.

        if (writeRow.previous) {
          storeDocumentData._rev = writeRow.previous._rev;
        }

        return storeDocumentData;
      });
      var startTime = (0, _util.now)();
      return Promise.resolve(_this4.internals.pouch.bulkDocs(insertDocs)).then(function (pouchResult) {
        var endTime = (0, _util.now)();
        var ret = {
          success: {},
          error: {}
        };
        var eventBulk = {
          id: (0, _util.randomCouchString)(10),
          events: []
        };
        pouchResult.forEach(function (resultRow) {
          resultRow.id = (0, _pouchdbHelper.pouchStripLocalFlagFromPrimary)(resultRow.id);
          var writeRow = (0, _util.getFromMapOrThrow)(writeRowById, resultRow.id);

          if (resultRow.error) {
            var err = {
              isError: true,
              status: 409,
              documentId: resultRow.id,
              writeRow: writeRow
            };
            ret.error[resultRow.id] = err;
          } else {
            var pushObj = (0, _util.flatClone)(writeRow.document);
            pushObj._rev = resultRow.rev; // local document cannot have attachments

            pushObj._attachments = {};
            ret.success[resultRow.id] = pushObj;
            /**
             * Emit a write event to the changestream.
             * We do this here and not by observing the internal pouchdb changes
             * because here we have the previous document data and do
             * not have to fill previous with 'UNKNOWN'.
             */

            var event;

            if (!writeRow.previous) {
              // was insert
              event = {
                operation: 'INSERT',
                doc: pushObj,
                id: resultRow.id,
                previous: null
              };
            } else if (writeRow.document._deleted) {
              // was delete
              // we need to add the new revision to the previous doc
              // so that the eventkey is calculated correctly.
              // Is this a hack? idk.
              var previousDoc = (0, _util.flatClone)(writeRow.previous);
              previousDoc._rev = resultRow.rev;
              event = {
                operation: 'DELETE',
                doc: null,
                id: resultRow.id,
                previous: previousDoc
              };
            } else {
              // was update
              event = {
                operation: 'UPDATE',
                doc: pushObj,
                id: resultRow.id,
                previous: writeRow.previous
              };
            }

            if (writeRow.document._deleted && (!writeRow.previous || writeRow.previous._deleted)) {
              /**
               * A deleted document was newly added to the storage engine,
               * do not emit an event.
               */
            } else {
              var doc = event.operation === 'DELETE' ? event.previous : event.doc;
              var eventId = (0, _pouchdbHelper.getEventKey)(true, doc._id, doc._rev ? doc._rev : '');
              var storageChangeEvent = {
                eventId: eventId,
                documentId: resultRow.id,
                change: event,
                startTime: startTime,
                endTime: endTime
              };
              eventBulk.events.push(storageChangeEvent);
            }
          }
        });

        _this4.changes$.next(eventBulk);

        return ret;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.findLocalDocumentsById = function findLocalDocumentsById(ids, withDeleted) {
    try {
      var _this6 = this;

      var pouch = _this6.internals.pouch;
      var pouchIds = ids.map(function (id) {
        return _pouchdbHelper.POUCHDB_LOCAL_PREFIX + id;
      });
      var ret = {};
      /**
       * Pouchdb is not able to bulk-request local documents
       * with the pouch.allDocs() method.
       * so we need to get each by a single call.
       * TODO create an issue at the pouchdb repo
       */

      return Promise.resolve(Promise.all(pouchIds.map(function (pouchId) {
        try {
          var _temp2 = _catch(function () {
            return Promise.resolve(pouch.get(pouchId)).then(function (docData) {
              docData = (0, _pouchdbHelper.localDocumentFromPouch)(docData);

              if (withDeleted || !docData._deleted) {
                ret[docData._id] = docData;
              }
            });
          }, function () {});

          return Promise.resolve(_temp2 && _temp2.then ? _temp2.then(function () {}) : void 0);
        } catch (e) {
          return Promise.reject(e);
        }
      }))).then(function () {
        return ret;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };

  return RxStorageKeyObjectInstancePouch;
}();

exports.RxStorageKeyObjectInstancePouch = RxStorageKeyObjectInstancePouch;
//# sourceMappingURL=rx-storage-key-object-instance-pouch.js.map