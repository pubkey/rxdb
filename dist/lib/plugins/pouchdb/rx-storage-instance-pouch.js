"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageInstancePouch = void 0;

var _obliviousSet = require("oblivious-set");

var _rxjs = require("rxjs");

var _rxError = require("../../rx-error");

var _rxSchema = require("../../rx-schema");

var _pouchdbHelper = require("./pouchdb-helper");

var _util = require("../../util");

var _customEventsPlugin = require("./custom-events-plugin");

var lastId = 0;

var RxStorageInstancePouch = /*#__PURE__*/function () {
  function RxStorageInstancePouch(databaseName, collectionName, schema, internals, options) {
    var _this = this;

    this.id = lastId++;
    this.changes$ = new _rxjs.Subject();
    this.subs = [];
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;

    _pouchdbHelper.OPEN_POUCHDB_STORAGE_INSTANCES.add(this);

    this.primaryPath = (0, _rxSchema.getPrimaryFieldOfPrimaryKey)(this.schema.primaryKey);
    /**
     * Instead of listening to pouch.changes,
     * we have overwritten pouchdbs bulkDocs()
     * and create our own event stream, this will work more relyable
     * and does not mix up with write events from other sources.
     */

    var emitter = (0, _customEventsPlugin.getCustomEventEmitterByPouch)(this.internals.pouch);
    /**
     * Contains all eventIds that of emitted events,
     * used because multi-instance pouchdbs often will reemit the same
     * event on the other browser tab so we have to de-duplicate them.
     */

    var emittedEventBulkIds = new _obliviousSet.ObliviousSet(60 * 1000);
    var eventSub = emitter.subject.subscribe(function (ev) {
      try {
        if (ev.events.length === 0 || emittedEventBulkIds.has(ev.id)) {
          return Promise.resolve();
        }

        emittedEventBulkIds.add(ev.id); // rewrite primaryPath of all events

        ev.events.forEach(function (event) {
          if (event.change.doc) {
            event.change.doc = (0, _pouchdbHelper.pouchSwapIdToPrimary)(_this.primaryPath, event.change.doc);
          }

          if (event.change.previous) {
            event.change.previous = (0, _pouchdbHelper.pouchSwapIdToPrimary)(_this.primaryPath, event.change.previous);
          }
        });

        _this.changes$.next(ev);

        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    });
    this.subs.push(eventSub);
  }

  var _proto = RxStorageInstancePouch.prototype;

  _proto.close = function close() {
    this.subs.forEach(function (sub) {
      return sub.unsubscribe();
    });

    _pouchdbHelper.OPEN_POUCHDB_STORAGE_INSTANCES["delete"](this); // TODO this did not work because a closed pouchdb cannot be recreated in the same process run
    // await this.internals.pouch.close();


    return _util.PROMISE_RESOLVE_VOID;
  };

  _proto.remove = function remove() {
    try {
      var _this3 = this;

      _this3.subs.forEach(function (sub) {
        return sub.unsubscribe();
      });

      _pouchdbHelper.OPEN_POUCHDB_STORAGE_INSTANCES["delete"](_this3);

      return Promise.resolve(_this3.internals.pouch.destroy()).then(function () {});
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.bulkAddRevisions = function bulkAddRevisions(documents) {
    try {
      var _this5 = this;

      if (documents.length === 0) {
        throw (0, _rxError.newRxError)('P3', {
          args: {
            documents: documents
          }
        });
      }

      var writeData = documents.map(function (doc) {
        return (0, _pouchdbHelper.rxDocumentDataToPouchDocumentData)(_this5.primaryPath, doc);
      }); // we do not need the response here because pouchdb returns an empty array on new_edits: false

      return Promise.resolve(_this5.internals.pouch.bulkDocs(writeData, {
        new_edits: false,
        set_new_edit_as_latest_revision: true
      })).then(function () {});
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.bulkWrite = function bulkWrite(documentWrites) {
    try {
      var _this7 = this;

      if (documentWrites.length === 0) {
        throw (0, _rxError.newRxError)('P2', {
          args: {
            documentWrites: documentWrites
          }
        });
      }

      var writeRowById = new Map();
      var insertDocs = documentWrites.map(function (writeData) {
        var primary = writeData.document[_this7.primaryPath];
        writeRowById.set(primary, writeData);
        var storeDocumentData = (0, _pouchdbHelper.rxDocumentDataToPouchDocumentData)(_this7.primaryPath, writeData.document); // if previous document exists, we have to send the previous revision to pouchdb.

        if (writeData.previous) {
          storeDocumentData._rev = writeData.previous._rev;
        }

        return storeDocumentData;
      });
      return Promise.resolve(_this7.internals.pouch.bulkDocs(insertDocs, {
        custom: {
          primaryPath: _this7.primaryPath,
          writeRowById: writeRowById
        }
      })).then(function (pouchResult) {
        var ret = {
          success: {},
          error: {}
        };
        return Promise.resolve(Promise.all(pouchResult.map(function (resultRow) {
          try {
            var writeRow = (0, _util.getFromMapOrThrow)(writeRowById, resultRow.id);

            var _temp4 = function () {
              if (resultRow.error) {
                var err = {
                  isError: true,
                  status: 409,
                  documentId: resultRow.id,
                  writeRow: writeRow
                };
                ret.error[resultRow.id] = err;
              } else {
                var _temp5 = function _temp5() {
                  ret.success[resultRow.id] = _pushObj;
                };

                var _pushObj = (0, _util.flatClone)(writeRow.document);

                _pushObj = (0, _pouchdbHelper.pouchSwapIdToPrimary)(_this7.primaryPath, _pushObj);
                _pushObj._rev = resultRow.rev; // replace the inserted attachments with their diggest

                _pushObj._attachments = {};

                var _temp6 = function () {
                  if (!writeRow.document._attachments) {
                    writeRow.document._attachments = {};
                  } else {
                    return Promise.resolve((0, _pouchdbHelper.writeAttachmentsToAttachments)(writeRow.document._attachments)).then(function (_writeAttachmentsToAt) {
                      _pushObj._attachments = _writeAttachmentsToAt;
                    });
                  }
                }();

                return _temp6 && _temp6.then ? _temp6.then(_temp5) : _temp5(_temp6);
              }
            }();

            return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(function () {}) : void 0);
          } catch (e) {
            return Promise.reject(e);
          }
        }))).then(function () {
          return ret;
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.query = function query(preparedQuery) {
    try {
      var _this9 = this;

      return Promise.resolve(_this9.internals.pouch.find(preparedQuery)).then(function (findResult) {
        var ret = {
          documents: findResult.docs.map(function (pouchDoc) {
            var useDoc = (0, _pouchdbHelper.pouchDocumentDataToRxDocumentData)(_this9.primaryPath, pouchDoc);
            return useDoc;
          })
        };
        return ret;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.getAttachmentData = function getAttachmentData(documentId, attachmentId) {
    try {
      var _this11 = this;

      return Promise.resolve(_this11.internals.pouch.getAttachment(documentId, attachmentId));
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.findDocumentsById = function findDocumentsById(ids, deleted) {
    try {
      var _temp9 = function _temp9(_result) {
        return _exit2 ? _result : Promise.resolve(_this13.internals.pouch.allDocs({
          include_docs: true,
          keys: ids
        })).then(function (pouchResult) {
          var ret = {};
          pouchResult.rows.filter(function (row) {
            return !!row.doc;
          }).forEach(function (row) {
            var docData = row.doc;
            docData = (0, _pouchdbHelper.pouchDocumentDataToRxDocumentData)(_this13.primaryPath, docData);
            ret[row.id] = docData;
          });
          return ret;
        });
      };

      var _exit2 = false;

      var _this13 = this;

      var _temp10 = function () {
        if (deleted) {
          return Promise.resolve(_this13.internals.pouch.changes({
            live: false,
            since: 0,
            doc_ids: ids,
            style: 'all_docs'
          })).then(function (viaChanges) {
            var retDocs = {};
            return Promise.resolve(Promise.all(viaChanges.results.map(function (result) {
              try {
                return Promise.resolve(_this13.internals.pouch.get(result.id, {
                  rev: result.changes[0].rev,
                  deleted: 'ok',
                  style: 'all_docs'
                })).then(function (firstDoc) {
                  var useFirstDoc = (0, _pouchdbHelper.pouchDocumentDataToRxDocumentData)(_this13.primaryPath, firstDoc);
                  retDocs[result.id] = useFirstDoc;
                });
              } catch (e) {
                return Promise.reject(e);
              }
            }))).then(function () {
              _exit2 = true;
              return retDocs;
            });
          });
        }
      }();

      /**
       * On deleted documents, pouchdb will only return the tombstone.
       * So we have to get the properties directly for each document
       * with the hack of getting the changes and then make one request per document
       * with the latest revision.
       * TODO create an issue at pouchdb on how to get the document data of deleted documents,
       * when one past revision was written via new_edits=false
       * @link https://stackoverflow.com/a/63516761/3443137
       */
      return Promise.resolve(_temp10 && _temp10.then ? _temp10.then(_temp9) : _temp9(_temp10));
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _proto.changeStream = function changeStream() {
    return this.changes$.asObservable();
  };

  _proto.getChangedDocuments = function getChangedDocuments(options) {
    try {
      var _this15 = this;

      var pouchChangesOpts = {
        live: false,
        limit: options.limit,
        include_docs: false,
        since: options.sinceSequence,
        descending: options.direction === 'before' ? true : false
      };
      return Promise.resolve(_this15.internals.pouch.changes(pouchChangesOpts)).then(function (pouchResults) {
        /**
         * TODO stripping the internal docs
         * results in having a non-full result set that maybe no longer
         * reaches the options.limit. We should fill up again
         * to ensure pagination works correctly.
         */
        var changedDocuments = pouchResults.results.filter(function (row) {
          return !row.id.startsWith(_pouchdbHelper.POUCHDB_DESIGN_PREFIX);
        }).map(function (row) {
          return {
            id: row.id,
            sequence: row.seq
          };
        });
        var lastSequence = pouchResults.last_seq;
        return {
          changedDocuments: changedDocuments,
          lastSequence: lastSequence
        };
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return RxStorageInstancePouch;
}();

exports.RxStorageInstancePouch = RxStorageInstancePouch;
//# sourceMappingURL=rx-storage-instance-pouch.js.map