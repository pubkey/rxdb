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
 */
var eventEmitDataToStorageEvents = function eventEmitDataToStorageEvents(pouchDBInstance, primaryPath, emitData) {
  try {
    var ret = [];

    var _temp11 = function () {
      if (emitData.writeOptions.hasOwnProperty('new_edits') && !emitData.writeOptions.new_edits) {
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
        var _temp12 = function () {
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
                  function _temp15() {
                    if (writeRow.document._deleted && (!writeRow.previous || writeRow.previous._deleted)) {} else {
                      var changeEvent = changeEventToNormal(pouchDBInstance, emitData.writeOptions.custom.primaryPath, event, emitData.startTime, emitData.endTime);
                      ret.push(changeEvent);
                    }
                  }

                  var newDoc = Object.assign({}, writeRow.document, {
                    _attachments: attachments,
                    _rev: resultRow.rev
                  });
                  var event;

                  var _temp14 = function () {
                    if (!writeRow.previous || writeRow.previous._deleted) {
                      // was insert
                      event = {
                        operation: 'INSERT',
                        doc: newDoc,
                        id: id,
                        previous: null
                      };
                    } else {
                      var _temp16 = function () {
                        if (writeRow.document._deleted) {
                          // was delete
                          // we need to add the new revision to the previous doc
                          // so that the eventkey is calculated correctly.
                          // Is this a hack? idk.
                          return Promise.resolve((0, _pouchdbHelper.writeAttachmentsToAttachments)(writeRow.previous._attachments)).then(function (attachments) {
                            var previousDoc = Object.assign({}, writeRow.previous, {
                              _attachments: attachments,
                              _rev: resultRow.rev
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

                      if (_temp16 && _temp16.then) return _temp16.then(function () {});
                    }
                  }();

                  return _temp14 && _temp14.then ? _temp14.then(_temp15) : _temp15(_temp14);
                });
              } catch (e) {
                return Promise.reject(e);
              }
            }))).then(function () {});
          }
        }();

        if (_temp12 && _temp12.then) return _temp12.then(function () {});
      }
    }();

    return Promise.resolve(_temp11 && _temp11.then ? _temp11.then(function () {
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

var i = 0;

function addCustomEventsPluginToPouch() {
  if (addedToPouch) {
    return;
  }

  addedToPouch = true;
  var oldBulkDocs = _pouchdbCore["default"].prototype.bulkDocs;

  var newBulkDocs = function newBulkDocs(body, options, callback) {
    try {
      var _temp7 = function _temp7() {
        /**
         * pouchdb calls this function again with transformed input.
         * This would lead to duplicate events. So we marks the deeper calls via the options
         * parameter and do not emit events if it is set.
         */
        var deeperOptions = (0, _util.flatClone)(options);
        deeperOptions.isDeeper = true;
        return oldBulkDocs.call(_this2, docs, deeperOptions, function (err, result) {
          if (err) {
            if (callback) {
              callback(err);
            } else {
              throw err;
            }
          } else {
            return function () {
              try {
                var _temp5 = function _temp5() {
                  if (callback) {
                    callback(null, result);
                  } else {
                    return result;
                  }
                };

                var _temp6 = function () {
                  if (!options.isDeeper) {
                    var endTime = (0, _util.now)();
                    var emitData = {
                      emitId: t,
                      writeDocs: docs,
                      writeOptions: options,
                      writeResult: result,
                      previousDocs: previousDocs,
                      startTime: startTime,
                      endTime: endTime
                    };
                    return Promise.resolve(eventEmitDataToStorageEvents(_this2, '_id', emitData)).then(function (events) {
                      var eventBulk = {
                        id: (0, _util.randomCouchString)(10),
                        events: events
                      };
                      var emitter = getCustomEventEmitterByPouch(_this2);
                      emitter.subject.next(eventBulk);
                    });
                  }
                }();

                /**
                 * For calls that came from RxDB,
                 * we have to ensure that the events are emitted
                 * before the actual call resolves.
                 */
                return Promise.resolve(_temp6 && _temp6.then ? _temp6.then(_temp5) : _temp5(_temp6));
              } catch (e) {
                return Promise.reject(e);
              }
            }();
          }
        });
      };

      var _this2 = this;

      var startTime = (0, _util.now)();
      var t = i++; // normalize input

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
      }

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


      var previousDocs = new Map();

      var _temp8 = function () {
        if (options.hasOwnProperty('new_edits') && options.new_edits === false) {
          var ids = docs.map(function (doc) {
            return doc._id;
          });
          /**
           * Pouchdb does not return deleted documents via allDocs()
           * So have to do use our hack with getting the newest revisions from the
           * changes.
           * @link https://github.com/pouchdb/pouchdb/issues/7877#issuecomment-522775955
           */

          return Promise.resolve(_this2.changes({
            live: false,
            since: 0,
            doc_ids: ids,
            style: 'all_docs'
          })).then(function (viaChanges) {
            return Promise.resolve(Promise.all(viaChanges.results.map(function (result) {
              try {
                return Promise.resolve(_this2.get(result.id, {
                  rev: result.changes[0].rev,
                  deleted: 'ok',
                  revs: options.set_new_edit_as_latest_revision ? true : false,
                  style: 'all_docs'
                }));
              } catch (e) {
                return Promise.reject(e);
              }
            }))).then(function (previousDocsResult) {
              previousDocsResult.forEach(function (doc) {
                return previousDocs.set(doc._id, doc);
              });

              if (options.set_new_edit_as_latest_revision) {
                docs.forEach(function (doc) {
                  var id = doc._id;
                  var previous = previousDocs.get(id);

                  if (previous) {
                    var splittedRev = doc._rev.split('-');

                    var revHeight = parseInt(splittedRev[0], 10);
                    var revLabel = splittedRev[1];

                    if (!previous._revisions) {
                      previous._revisions = {
                        ids: []
                      };
                    }

                    doc._revisions = {
                      start: revHeight,
                      ids: previous._revisions.ids
                    };

                    doc._revisions.ids.unshift(revLabel);

                    delete previous._revisions;
                  }
                });
              }
            });
          });
        }
      }();

      return Promise.resolve(_temp8 && _temp8.then ? _temp8.then(_temp7) : _temp7(_temp8));
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
    eventId: (0, _pouchdbHelper.getEventKey)(pouchDBInstance, primary, doc._rev),
    documentId: primary,
    change: change,
    startTime: startTime,
    endTime: endTime
  };
  return storageChangeEvent;
}
//# sourceMappingURL=custom-events-plugin.js.map