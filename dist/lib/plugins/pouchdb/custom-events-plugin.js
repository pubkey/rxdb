"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EVENT_EMITTER_BY_POUCH_INSTANCE = void 0;
exports.addCustomEventsPluginToPouch = addCustomEventsPluginToPouch;
exports.changeEventToNormal = changeEventToNormal;
exports.eventEmitDataToStorageEvents = void 0;
exports.getCustomEventEmitterByPouch = getCustomEventEmitterByPouch;

var _pouchdbCore = _interopRequireDefault(require("pouchdb-core"));

var _rxjs = require("rxjs");

var _util = require("../../util");

var _rxError = require("../../rx-error");

var _pouchdbHelper = require("./pouchdb-helper");

/*
 * Instead of listening to pouch.changes,
 * we overwrite pouchdbs bulkDocs()
 * and create our own event stream, this will work more reliable
 * and has less strange behaviors.
 * Also we can better define what data we need for our events.
 * @link http://jsbin.com/pagebi/1/edit?js,output
 * @link https://github.com/pubkey/rxdb/blob/1f4115b69bdacbb853af9c637d70f5f184d4e474/src/rx-storage-pouchdb.ts#L273
 * @link https://hasura.io/blog/couchdb-style-conflict-resolution-rxdb-hasura/
 */
var eventEmitDataToStorageEvents = function eventEmitDataToStorageEvents(pouchDBInstance, primaryPath, emitData) {
  try {
    var ret = [];

    var _temp12 = function () {
      if (!emitData.writeOptions.custom && emitData.writeOptions.hasOwnProperty('new_edits') && emitData.writeOptions.new_edits === false) {
        return Promise.resolve(Promise.all(emitData.writeDocs.map(function (writeDoc) {
          try {
            var id = writeDoc._id;
            writeDoc = (0, _pouchdbHelper.pouchDocumentDataToRxDocumentData)(primaryPath, writeDoc);
            return Promise.resolve((0, _pouchdbHelper.writeAttachmentsToAttachments)(writeDoc._attachments)).then(function (_writeAttachmentsToAt) {
              writeDoc._attachments = _writeAttachmentsToAt;
              var previousDoc = emitData.previousDocs.get(id);

              if (previousDoc) {
                previousDoc = (0, _pouchdbHelper.pouchDocumentDataToRxDocumentData)(primaryPath, previousDoc);
              }

              if (previousDoc) {
                var parsedRevPrevious = (0, _util.parseRevision)(previousDoc._rev);
                var parsedRevNew = (0, _util.parseRevision)(writeDoc._rev);

                if (parsedRevPrevious.height > parsedRevNew.height ||
                /**
                 * If the revision height is equal,
                 * we determine the higher hash as winner.
                 */
                parsedRevPrevious.height === parsedRevNew.height && parsedRevPrevious.hash > parsedRevNew.hash) {
                  /**
                   * The newly added document was not the latest revision
                   * so we drop the write.
                   * With plain PouchDB it makes sense to store conflicting branches of the document
                   * but RxDB assumes that the conflict is resolved directly.
                   */
                  return;
                }
              }

              if (!previousDoc && writeDoc._deleted) {
                // deleted document was added as revision
                return;
              }

              if (previousDoc && previousDoc._deleted && writeDoc._deleted) {
                // delete document was deleted again
                return;
              }

              var event;

              if ((!previousDoc || previousDoc._deleted) && !writeDoc._deleted) {
                // was insert
                event = {
                  operation: 'INSERT',
                  doc: writeDoc,
                  id: id,
                  previous: null
                };
              } else if (writeDoc._deleted && previousDoc && !previousDoc._deleted) {
                // was delete
                previousDoc._rev = writeDoc._rev;
                event = {
                  operation: 'DELETE',
                  doc: null,
                  id: id,
                  previous: previousDoc
                };
              } else if (previousDoc) {
                // was update
                event = {
                  operation: 'UPDATE',
                  doc: writeDoc,
                  id: id,
                  previous: previousDoc
                };
              } else {
                throw (0, _rxError.newRxError)('SNH', {
                  args: {
                    writeDoc: writeDoc
                  }
                });
              }

              var changeEvent = changeEventToNormal(pouchDBInstance, primaryPath, event, emitData.startTime, emitData.endTime);
              ret.push(changeEvent);
            });
          } catch (e) {
            return Promise.reject(e);
          }
        }))).then(function () {});
      } else {
        var _temp13 = function () {
          if (!emitData.writeOptions.custom || emitData.writeOptions.custom && !emitData.writeOptions.custom.writeRowById) {
            var writeDocsById = new Map();
            emitData.writeDocs.forEach(function (writeDoc) {
              return writeDocsById.set(writeDoc._id, writeDoc);
            });
            return Promise.resolve(Promise.all(emitData.writeResult.map(function (resultRow) {
              try {
                var id = resultRow.id;

                if (id.startsWith(_pouchdbHelper.POUCHDB_DESIGN_PREFIX) || id.startsWith(_pouchdbHelper.POUCHDB_LOCAL_PREFIX)) {
                  return Promise.resolve();
                }

                var writeDoc = (0, _util.getFromMapOrThrow)(writeDocsById, resultRow.id);
                writeDoc = (0, _pouchdbHelper.pouchDocumentDataToRxDocumentData)(primaryPath, writeDoc);
                return Promise.resolve((0, _pouchdbHelper.writeAttachmentsToAttachments)(writeDoc._attachments)).then(function (_writeAttachmentsToAt2) {
                  writeDoc._attachments = _writeAttachmentsToAt2;
                  writeDoc = (0, _util.flatClone)(writeDoc);
                  writeDoc._rev = resultRow.rev;
                  var event = (0, _pouchdbHelper.pouchChangeRowToChangeEvent)(primaryPath, writeDoc);
                  var changeEvent = changeEventToNormal(pouchDBInstance, primaryPath, event);
                  ret.push(changeEvent);
                });
              } catch (e) {
                return Promise.reject(e);
              }
            }))).then(function () {});
          } else {
            var writeMap = emitData.writeOptions.custom.writeRowById;
            return Promise.resolve(Promise.all(emitData.writeResult.map(function (resultRow) {
              try {
                if (resultRow.error) {
                  return Promise.resolve();
                }

                var id = resultRow.id;
                var writeRow = (0, _util.getFromMapOrThrow)(writeMap, id);
                return Promise.resolve((0, _pouchdbHelper.writeAttachmentsToAttachments)(writeRow.document._attachments)).then(function (attachments) {
                  function _temp16() {
                    if (writeRow.document._deleted && (!writeRow.previous || writeRow.previous._deleted)) {} else {
                      var changeEvent = changeEventToNormal(pouchDBInstance, (0, _util.ensureNotFalsy)(emitData.writeOptions.custom).primaryPath, event, emitData.startTime, emitData.endTime);
                      ret.push(changeEvent);
                    }
                  }

                  var newDoc = Object.assign({}, writeRow.document, {
                    _attachments: attachments,
                    _rev: resultRow.rev
                  });
                  var event;

                  var _temp15 = function () {
                    if (!writeRow.previous || writeRow.previous._deleted) {
                      // was insert
                      event = {
                        operation: 'INSERT',
                        doc: newDoc,
                        id: id,
                        previous: null
                      };
                    } else {
                      var _temp17 = function () {
                        if (writeRow.document._deleted) {
                          // was delete
                          // we need to add the new revision to the previous doc
                          // so that the eventkey is calculated correctly.
                          // Is this a hack? idk.
                          return Promise.resolve((0, _pouchdbHelper.writeAttachmentsToAttachments)(writeRow.previous._attachments)).then(function (attachments) {
                            var previousDoc = Object.assign({}, writeRow.previous, {
                              _attachments: attachments
                            });
                            event = {
                              operation: 'DELETE',
                              doc: null,
                              id: resultRow.id,
                              previous: previousDoc
                            };
                          });
                        } else {
                          // was update
                          event = {
                            operation: 'UPDATE',
                            doc: newDoc,
                            id: resultRow.id,
                            previous: writeRow.previous
                          };
                        }
                      }();

                      if (_temp17 && _temp17.then) return _temp17.then(function () {});
                    }
                  }();

                  return _temp15 && _temp15.then ? _temp15.then(_temp16) : _temp16(_temp15);
                });
              } catch (e) {
                return Promise.reject(e);
              }
            }))).then(function () {});
          }
        }();

        if (_temp13 && _temp13.then) return _temp13.then(function () {});
      }
    }();

    return Promise.resolve(_temp12 && _temp12.then ? _temp12.then(function () {
      return ret;
    }) : ret);
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.eventEmitDataToStorageEvents = eventEmitDataToStorageEvents;
// ensure only added once
var addedToPouch = false;
var EVENT_EMITTER_BY_POUCH_INSTANCE = new Map();
exports.EVENT_EMITTER_BY_POUCH_INSTANCE = EVENT_EMITTER_BY_POUCH_INSTANCE;

function getCustomEventEmitterByPouch(pouch) {
  var key = [pouch.name, pouch.adapter].join('|');
  var emitter = EVENT_EMITTER_BY_POUCH_INSTANCE.get(key);

  if (!emitter) {
    emitter = {
      subject: new _rxjs.Subject()
    };
    EVENT_EMITTER_BY_POUCH_INSTANCE.set(key, emitter);
  }

  return emitter;
}
/**
 * Counter, used to debug stuff.
 */


var i = 0;
/**
 * Because we cannot force pouchdb to await bulkDocs runs
 * inside of a transaction, like done with the other RxStorage implementations,
 * we have to ensure the calls to bulkDocs() do not run in parallel. 
 * 
 * TODO this is somehow a hack. Instead of doing that, inspect how
 * PouchDB runs bulkDocs internally and adapt that transaction handling.
 */

var BULK_DOC_RUN_QUEUE = new WeakMap();
/**
 * PouchDB is like a minefield,
 * where stuff randomly does not work dependend on some conditions.
 * So instead of doing plain writes,
 * we hack into the bulkDocs() function
 * and adjust the behavior accordingly.
 */

function addCustomEventsPluginToPouch() {
  if (addedToPouch) {
    return;
  }

  addedToPouch = true;
  var oldBulkDocs = _pouchdbCore["default"].prototype.bulkDocs;
  /**
   * Ensure we do not run bulkDocs() in parallel on the same PouchDB instance.
   */

  var newBulkDocs = function newBulkDocs(body, options, callback) {
    try {
      var _this2 = this;

      var queue = BULK_DOC_RUN_QUEUE.get(_this2);

      if (!queue) {
        queue = _util.PROMISE_RESOLVE_VOID;
      }

      queue = queue.then(function () {
        try {
          return Promise.resolve(newBulkDocsInner.bind(_this2)(body, options, callback));
        } catch (e) {
          return Promise.reject(e);
        }
      });
      BULK_DOC_RUN_QUEUE.set(_this2, queue);
      return Promise.resolve(queue);
    } catch (e) {
      return Promise.reject(e);
    }
  };

  var newBulkDocsInner = function newBulkDocsInner(body, options, callback) {
    try {
      var _temp8 = function _temp8() {
        /**
         * Custom handling if the call came from RxDB (options.custom is set).
         */
        var usePouchResult = [];
        var hasNonErrorWrite = false;

        if (options.custom && options.hasOwnProperty('new_edits') && options.new_edits === false) {
          /**
           * Reset the write docs array,
           * because we only write non-conflicting documents.
           */
          docs = [];
          var writeRowById = options.custom.writeRowById;
          var insertDocsById = options.custom.insertDocsById;
          Array.from(writeRowById.entries()).forEach(function (_ref) {
            var id = _ref[0],
                writeRow = _ref[1];
            var previousRev = writeRow.previous ? writeRow.previous._rev : null;
            var newRev = (0, _util.parseRevision)(writeRow.document._rev);
            var docInDb = previousDocsInDb.get(id);
            var docInDbRev = docInDb ? docInDb._rev : null;

            if (docInDbRev !== previousRev) {
              // we have a conflict
              usePouchResult.push({
                error: true,
                id: id,
                status: 409
              });
            } else {
              var useRevisions = {
                start: newRev.height,
                ids: docInDb ? docInDb._revisions.ids.slice(0) : []
              };
              useRevisions.ids.unshift(newRev.hash);
              var useNewRev = useRevisions.start + '-' + newRev.hash;
              hasNonErrorWrite = true;
              var writeToPouchDocData = Object.assign({}, insertDocsById.get(id), {
                _revisions: useRevisions,
                _rev: useNewRev
              });
              docs.push(writeToPouchDocData);
              usePouchResult.push({
                ok: true,
                id: id,
                rev: writeRow.document._rev
              });
            }
          });
          /**
           * Optimization shortcut,
           * if all document writes were conflict errors,
           * we can skip directly.
           */

          if (!hasNonErrorWrite) {
            return usePouchResult;
          }
        }
        /**
         * pouchdb calls this function again with transformed input.
         * This would lead to duplicate events. So we marks the deeper calls via the options
         * parameter and do not emit events if it is set.
         */


        var deeperOptions = (0, _util.flatClone)(options);
        deeperOptions.isDeeper = true;
        var callReturn;
        var callPromise = new Promise(function (res, rej) {
          /**
           * The emitted EventBulk from the write to the pouchdb, needs to contain a checkpoint field.
           * Because PouchDB works on sequence number to sort changes,
           * we have to fetch the latest sequence number out of the events because it
           * is not possible to that that from pouch.bulkDocs().
           */
          var docIds = new Set(docs.map(function (d) {
            return d._id;
          }));
          var heighestSequence = 0;
          var changesSub;
          var heighestSequencePromise = new Promise(function (res) {
            changesSub = _this4.changes({
              since: 'now',
              live: true,
              include_docs: true
            }).on('change', function (change) {
              var docId = change.id;

              if (docIds.has(docId)) {
                docIds["delete"](docId);

                if (heighestSequence < change.seq) {
                  heighestSequence = change.seq;
                }

                if (docIds.size === 0) {
                  changesSub.cancel();
                  res(heighestSequence);
                }
              }
            });
          });
          callReturn = oldBulkDocs.call(_this4, docs, deeperOptions, function (err, result) {
            if (err) {
              callback ? callback(err) : rej(err);
            } else {
              return function () {
                try {
                  var _temp6 = function _temp6() {
                    result.forEach(function (row) {
                      usePouchResult.push(row);
                    });
                    /**
                     * For calls that came from RxDB,
                     * we have to ensure that the events are emitted
                     * before the actual call resolves.
                     */

                    var eventsPromise = _util.PROMISE_RESOLVE_VOID;

                    if (!options.isDeeper) {
                      var endTime = (0, _util.now)();
                      var emitData = {
                        emitId: runId,
                        writeDocs: docs,
                        writeOptions: options,
                        writeResult: usePouchResult,
                        previousDocs: previousDocsInDb,
                        startTime: startTime,
                        endTime: endTime
                      };
                      eventsPromise = eventEmitDataToStorageEvents(_this4, '_id', emitData).then(function (events) {
                        var eventBulk = {
                          id: (0, _util.randomCouchString)(10),
                          events: events,
                          checkpoint: {
                            sequence: _heighestSequence
                          },
                          context: options.custom ? options.custom.context : 'pouchdb-internal'
                        };
                        var emitter = getCustomEventEmitterByPouch(_this4);
                        emitter.subject.next(eventBulk);
                      });
                    }

                    if (callback) {
                      callback(null, usePouchResult);
                    } else {
                      return eventsPromise.then(function () {
                        res(usePouchResult);
                        return usePouchResult;
                      });
                    }
                  };

                  var hasError = result.find(function (row) {
                    return row.error;
                  });

                  var _heighestSequence = -1;

                  var _temp7 = function () {
                    if (!hasError) {
                      return Promise.resolve(heighestSequencePromise).then(function (_heighestSequenceProm) {
                        _heighestSequence = _heighestSequenceProm;
                      });
                    } else {
                      changesSub.cancel();
                    }
                  }();

                  return Promise.resolve(_temp7 && _temp7.then ? _temp7.then(_temp6) : _temp6(_temp7));
                } catch (e) {
                  return Promise.reject(e);
                }
              }();
            }
          });
        });
        return options.custom ? callPromise : callReturn;
      };

      var _this4 = this;

      var startTime = (0, _util.now)();
      var runId = i++;
      /**
       * Normalize inputs
       * because there are many ways to call pouchdb.bulkDocs()
       */

      if (typeof options === 'function') {
        callback = options;
        options = {};
      }

      if (!options) {
        options = {};
      }

      var docs;

      if (Array.isArray(body)) {
        docs = body;
      } else if (body === undefined) {
        docs = [];
      } else {
        docs = body.docs;

        if (body.hasOwnProperty('new_edits')) {
          options.new_edits = body.new_edits;
        }
      } // throw if no docs given, because RxDB should never make such a call.


      if (docs.length === 0) {
        throw (0, _rxError.newRxError)('SNH', {
          args: {
            body: body,
            options: options
          }
        });
      }
      /**
       * If new_edits=false we have to first find the current state
       * of the document and can later check if the state was changed
       * because a new revision was written and we have to emit an event.
       */


      var previousDocsInDb = options.custom ? options.custom.previousDocsInDb : new Map();

      var _temp9 = function () {
        if (options.hasOwnProperty('new_edits') && options.new_edits === false) {
          return Promise.resolve(_this4.bulkGet({
            docs: docs.map(function (doc) {
              return {
                id: doc._id
              };
            }),
            revs: true,
            latest: true
          })).then(function (viaBulkGet) {
            /**
             * bulkGet() does not return deleted documents,
             * so we must refetch them via allDocs() afterwards.
             */
            var mustRefetchBecauseDeleted = [];
            viaBulkGet.results.forEach(function (resultRow) {
              var firstDoc = resultRow.docs[0];

              if (firstDoc.ok) {
                previousDocsInDb.set(firstDoc.ok._id, firstDoc.ok);
              } else {
                if (firstDoc.error && firstDoc.error.reason === 'deleted') {
                  mustRefetchBecauseDeleted.push(resultRow.id);
                }
              }
            });

            var _temp = function () {
              if (mustRefetchBecauseDeleted.length > 0) {
                return Promise.resolve(_this4.allDocs({
                  keys: mustRefetchBecauseDeleted,
                  include_docs: true,
                  conflicts: true
                })).then(function (deletedDocsViaAllDocs) {
                  var idsWithRevs = [];
                  deletedDocsViaAllDocs.rows.forEach(function (row) {
                    idsWithRevs.push({
                      id: row.id,
                      rev: row.value.rev
                    });
                  });
                  return Promise.resolve(_this4.bulkGet({
                    docs: idsWithRevs,
                    revs: true,
                    latest: true
                  })).then(function (deletedDocsViaBulkGetWithRev) {
                    deletedDocsViaBulkGetWithRev.results.forEach(function (resultRow) {
                      var firstDoc = resultRow.docs[0];

                      if (firstDoc.ok) {
                        previousDocsInDb.set(firstDoc.ok._id, firstDoc.ok);
                      } else {
                        throw (0, _rxError.newRxError)('SNH', {
                          args: {
                            deletedDocsViaBulkGetWithRev: deletedDocsViaBulkGetWithRev,
                            resultRow: resultRow
                          }
                        });
                      }
                    });
                  });
                });
              }
            }();

            if (_temp && _temp.then) return _temp.then(function () {});
          });
        }
      }();

      return Promise.resolve(_temp9 && _temp9.then ? _temp9.then(_temp8) : _temp8(_temp9));
    } catch (e) {
      return Promise.reject(e);
    }
  };

  _pouchdbCore["default"].plugin({
    bulkDocs: newBulkDocs
  });
}

function changeEventToNormal(pouchDBInstance, primaryPath, change, startTime, endTime) {
  var doc = change.operation === 'DELETE' ? change.previous : change.doc;
  var primary = doc[primaryPath];
  var storageChangeEvent = {
    eventId: (0, _pouchdbHelper.getEventKey)(pouchDBInstance, primary, change),
    documentId: primary,
    change: change,
    startTime: startTime,
    endTime: endTime
  };
  return storageChangeEvent;
}
//# sourceMappingURL=custom-events-plugin.js.map