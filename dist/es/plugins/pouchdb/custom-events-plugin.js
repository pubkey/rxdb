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

import PouchDBCore from 'pouchdb-core';
import { Subject } from 'rxjs';
import { ensureNotFalsy, flatClone, getFromMapOrThrow, now, parseRevision, PROMISE_RESOLVE_VOID, randomCouchString } from '../../util';
import { newRxError } from '../../rx-error';
import { getEventKey, pouchChangeRowToChangeEvent, POUCHDB_DESIGN_PREFIX, POUCHDB_LOCAL_PREFIX, pouchDocumentDataToRxDocumentData, writeAttachmentsToAttachments } from './pouchdb-helper';
export var eventEmitDataToStorageEvents = function eventEmitDataToStorageEvents(pouchDBInstance, primaryPath, emitData) {
  try {
    var ret = [];
    var _temp7 = function () {
      if (!emitData.writeOptions.custom && emitData.writeOptions.hasOwnProperty('new_edits') && emitData.writeOptions.new_edits === false) {
        return Promise.resolve(Promise.all(emitData.writeDocs.map(function (writeDoc) {
          try {
            var id = writeDoc._id;
            writeDoc = pouchDocumentDataToRxDocumentData(primaryPath, writeDoc);
            return Promise.resolve(writeAttachmentsToAttachments(writeDoc._attachments)).then(function (_writeAttachmentsToAt) {
              writeDoc._attachments = _writeAttachmentsToAt;
              var previousDoc = emitData.previousDocs.get(id);
              if (previousDoc) {
                previousDoc = pouchDocumentDataToRxDocumentData(primaryPath, previousDoc);
              }
              if (previousDoc) {
                var parsedRevPrevious = parseRevision(previousDoc._rev);
                var parsedRevNew = parseRevision(writeDoc._rev);
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
                  doc: writeDoc,
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
                throw newRxError('SNH', {
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
        }))).then(function () {}); // eslint-disable-next-line brace-style
      } else {
        var _temp8 = function () {
          if (!emitData.writeOptions.custom || emitData.writeOptions.custom && !emitData.writeOptions.custom.writeRowById) {
            var writeDocsById = new Map();
            emitData.writeDocs.forEach(function (writeDoc) {
              return writeDocsById.set(writeDoc._id, writeDoc);
            });
            return Promise.resolve(Promise.all(emitData.writeResult.map(function (resultRow) {
              try {
                var id = resultRow.id;
                if (id.startsWith(POUCHDB_DESIGN_PREFIX) || id.startsWith(POUCHDB_LOCAL_PREFIX)) {
                  return Promise.resolve();
                }
                var writeDoc = getFromMapOrThrow(writeDocsById, resultRow.id);
                writeDoc = pouchDocumentDataToRxDocumentData(primaryPath, writeDoc);
                return Promise.resolve(writeAttachmentsToAttachments(writeDoc._attachments)).then(function (_writeAttachmentsToAt2) {
                  writeDoc._attachments = _writeAttachmentsToAt2;
                  writeDoc = flatClone(writeDoc);
                  writeDoc._rev = resultRow.rev;
                  var event = pouchChangeRowToChangeEvent(primaryPath, writeDoc);
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
                var writeRow = getFromMapOrThrow(writeMap, id);
                return Promise.resolve(writeAttachmentsToAttachments(writeRow.document._attachments)).then(function (attachments) {
                  function _temp11() {
                    if (writeRow.document._deleted && (!writeRow.previous || writeRow.previous._deleted)) {} else {
                      var changeEvent = changeEventToNormal(pouchDBInstance, ensureNotFalsy(emitData.writeOptions.custom).primaryPath, event, emitData.startTime, emitData.endTime);
                      ret.push(changeEvent);
                    }
                  }
                  var newDoc = Object.assign({}, writeRow.document, {
                    _attachments: attachments,
                    _rev: resultRow.rev
                  });
                  var event;
                  var _temp10 = function () {
                    if (!writeRow.previous || writeRow.previous._deleted) {
                      // was insert
                      event = {
                        operation: 'INSERT',
                        doc: newDoc,
                        id: id,
                        previous: null
                      };
                    } else {
                      var _temp12 = function () {
                        if (writeRow.document._deleted) {
                          // was delete
                          // we need to add the new revision to the previous doc
                          // so that the eventkey is calculated correctly.
                          // Is this a hack? idk.
                          return Promise.resolve(writeAttachmentsToAttachments(writeRow.previous._attachments)).then(function (attachmentsInner) {
                            var previousDoc = Object.assign({}, writeRow.previous, {
                              _attachments: attachmentsInner
                            });
                            event = {
                              operation: 'DELETE',
                              doc: writeRow.document,
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
                      if (_temp12 && _temp12.then) return _temp12.then(function () {});
                    }
                  }();
                  return _temp10 && _temp10.then ? _temp10.then(_temp11) : _temp11(_temp10);
                });
              } catch (e) {
                return Promise.reject(e);
              }
            }))).then(function () {});
          }
        }();
        if (_temp8 && _temp8.then) return _temp8.then(function () {});
      }
    }();
    return Promise.resolve(_temp7 && _temp7.then ? _temp7.then(function () {
      return ret;
    }) : ret);
  } catch (e) {
    return Promise.reject(e);
  }
};
// ensure only added once
var addedToPouch = false;
export var EVENT_EMITTER_BY_POUCH_INSTANCE = new Map();
export function getCustomEventEmitterByPouch(pouch) {
  var key = [pouch.__opts.name, pouch.adapter].join('|');
  var emitter = EVENT_EMITTER_BY_POUCH_INSTANCE.get(key);
  if (!emitter) {
    emitter = {
      subject: new Subject()
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
 * where stuff randomly does not work dependent on some conditions.
 * So instead of doing plain writes,
 * we hack into the bulkDocs() function
 * and adjust the behavior accordingly.
 */
export function addCustomEventsPluginToPouch() {
  if (addedToPouch) {
    return;
  }
  addedToPouch = true;
  var oldBulkDocs = PouchDBCore.prototype.bulkDocs;

  /**
   * Ensure we do not run bulkDocs() in parallel on the same PouchDB instance.
   */
  var newBulkDocs = function newBulkDocs(body, options, callback) {
    var _this = this;
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

    /**
     * PouchDB internal requests
     * must still be handled normally
     * to decrease the likelyness of bugs.
     */
    var internalPouches = ['_replicator', '_users', 'pouch__all_dbs__'];
    if (internalPouches.includes(this.name) || this.name.includes('-mrview-')) {
      return oldBulkDocs.call(this, body, options, function (err, result) {
        if (err) {
          if (callback) {
            callback(err, null);
          }
        } else {
          if (callback) {
            callback(null, result);
          }
        }
      });
    }
    var queue = BULK_DOC_RUN_QUEUE.get(this);
    if (!queue) {
      queue = PROMISE_RESOLVE_VOID;
    }
    queue = queue.then(function () {
      try {
        return Promise.resolve(newBulkDocsInner.bind(_this)(body, options, callback));
      } catch (e) {
        return Promise.reject(e);
      }
    });
    BULK_DOC_RUN_QUEUE.set(this, queue);
    return queue;
  };
  var newBulkDocsInner = function newBulkDocsInner(body, options, callback) {
    try {
      var _temp3 = function _temp3() {
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
            var newRev = parseRevision(writeRow.document._rev);
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
        var deeperOptions = flatClone(options);
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
          var heighestSequencePromise = new Promise(function (res2) {
            changesSub = _this2.changes({
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
                  res2(heighestSequence);
                }
              }
            });
          });

          /**
           * We cannot send the custom here,
           * because when a migration between different major RxDB versions is done,
           * multiple versions of the RxDB PouchDB RxStorage might have added their
           * custom method via PouchDBCore.plugin()
           */
          var useOptsForOldBulkDocs = flatClone(deeperOptions);
          delete useOptsForOldBulkDocs.custom;
          callReturn = oldBulkDocs.call(_this2, docs, useOptsForOldBulkDocs, function (err, result) {
            if (err) {
              if (callback) {
                callback(err);
              } else {
                rej(err);
              }
            } else {
              return function () {
                try {
                  var _temp5 = function _temp5() {
                    result.forEach(function (row) {
                      usePouchResult.push(row);
                    });

                    /**
                     * For calls that came from RxDB,
                     * we have to ensure that the events are emitted
                     * before the actual call resolves.
                     */
                    var eventsPromise = PROMISE_RESOLVE_VOID;
                    if (!options.isDeeper) {
                      var endTime = now();
                      var emitData = {
                        emitId: runId,
                        writeDocs: docs,
                        writeOptions: options,
                        writeResult: usePouchResult,
                        previousDocs: previousDocsInDb,
                        startTime: startTime,
                        endTime: endTime
                      };
                      eventsPromise = eventEmitDataToStorageEvents(_this2, '_id', emitData).then(function (events) {
                        var eventBulk = {
                          id: randomCouchString(10),
                          events: events,
                          checkpoint: {
                            sequence: heighestSequenceInner
                          },
                          context: options.custom ? options.custom.context : 'pouchdb-internal'
                        };
                        var emitter = getCustomEventEmitterByPouch(_this2);
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
                  var heighestSequenceInner = -1;
                  var _temp4 = function () {
                    if (!hasError) {
                      return Promise.resolve(heighestSequencePromise).then(function (_heighestSequenceProm) {
                        heighestSequenceInner = _heighestSequenceProm;
                      });
                    } else {
                      changesSub.cancel();
                    }
                  }();
                  return Promise.resolve(_temp4 && _temp4.then ? _temp4.then(_temp5) : _temp5(_temp4));
                } catch (e) {
                  return Promise.reject(e);
                }
              }();
            }
          });
        });
        return options.custom ? callPromise : callReturn;
      };
      var _this2 = this;
      var startTime = now();
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
      }

      // throw if no docs given, because RxDB should never make such a call.
      if (docs.length === 0) {
        throw newRxError('SNH', {
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
      var _temp2 = function () {
        if (options.hasOwnProperty('new_edits') && options.new_edits === false) {
          return Promise.resolve(_this2.bulkGet({
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
                return Promise.resolve(_this2.allDocs({
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
                  return Promise.resolve(_this2.bulkGet({
                    docs: idsWithRevs,
                    revs: true,
                    latest: true
                  })).then(function (deletedDocsViaBulkGetWithRev) {
                    deletedDocsViaBulkGetWithRev.results.forEach(function (resultRow) {
                      var firstDoc = resultRow.docs[0];
                      if (firstDoc.ok) {
                        previousDocsInDb.set(firstDoc.ok._id, firstDoc.ok);
                      } else {
                        throw newRxError('SNH', {
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
      return Promise.resolve(_temp2 && _temp2.then ? _temp2.then(_temp3) : _temp3(_temp2));
    } catch (e) {
      return Promise.reject(e);
    }
  };
  PouchDBCore.plugin({
    bulkDocs: newBulkDocs
  });
}
export function changeEventToNormal(pouchDBInstance, primaryPath, change, startTime, endTime) {
  var doc = change.operation === 'DELETE' ? change.previous : change.doc;
  var primary = doc[primaryPath];
  var storageChangeEvent = {
    eventId: getEventKey(pouchDBInstance, primary, change),
    documentId: primary,
    documentData: change.doc,
    previousDocumentData: change.previous,
    operation: change.operation,
    startTime: startTime,
    endTime: endTime
  };
  return storageChangeEvent;
}
//# sourceMappingURL=custom-events-plugin.js.map