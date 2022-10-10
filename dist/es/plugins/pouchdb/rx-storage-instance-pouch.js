import { ObliviousSet } from 'oblivious-set';
import { Subject } from 'rxjs';
import { newRxError } from '../../rx-error';
import { OPEN_POUCHDB_STORAGE_INSTANCES, OPEN_POUCH_INSTANCES, POUCHDB_DESIGN_PREFIX, pouchDocumentDataToRxDocumentData, pouchSwapIdToPrimary, rxDocumentDataToPouchDocumentData, writeAttachmentsToAttachments } from './pouchdb-helper';
import { blobBufferUtil, flatClone, getFromMapOrThrow, getFromObjectOrThrow, lastOfArray, PROMISE_RESOLVE_VOID } from '../../util';
import { getCustomEventEmitterByPouch } from './custom-events-plugin';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';
function _settle(pact, state, value) {
  if (!pact.s) {
    if (value instanceof _Pact) {
      if (value.s) {
        if (state & 1) {
          state = value.s;
        }
        value = value.v;
      } else {
        value.o = _settle.bind(null, pact, state);
        return;
      }
    }
    if (value && value.then) {
      value.then(_settle.bind(null, pact, state), _settle.bind(null, pact, 2));
      return;
    }
    pact.s = state;
    pact.v = value;
    var observer = pact.o;
    if (observer) {
      observer(pact);
    }
  }
}
/**
 * Because we internally use the findDocumentsById()
 * method, it is defined here because RxStorage wrappers
 * might swap out the function.
 */var pouchFindDocumentsById = function pouchFindDocumentsById(instance, ids, deleted) {
  try {
    ensureNotClosed(instance);
    var ret = {};

    /**
     * On deleted documents, PouchDB will only return the tombstone.
     * So we have to get the properties directly for each document
     * with the hack of getting the changes and then make one request per document
     * with the latest revision.
     * TODO create an issue at pouchdb on how to get the document data of deleted documents,
     * when one past revision was written via new_edits=false
     * @link https://stackoverflow.com/a/63516761/3443137
     */
    if (deleted) {
      instance.nonParallelQueue = instance.nonParallelQueue.then(function () {
        try {
          return Promise.resolve(instance.internals.pouch.changes({
            live: false,
            since: 0,
            doc_ids: ids,
            style: 'all_docs'
          })).then(function (viaChanges) {
            return Promise.resolve(Promise.all(viaChanges.results.map(function (result) {
              try {
                return Promise.resolve(instance.internals.pouch.get(result.id, {
                  rev: result.changes[0].rev,
                  deleted: 'ok',
                  style: 'all_docs'
                })).then(function (firstDoc) {
                  var useFirstDoc = pouchDocumentDataToRxDocumentData(instance.primaryPath, firstDoc);
                  ret[result.id] = useFirstDoc;
                });
              } catch (e) {
                return Promise.reject(e);
              }
            }))).then(function () {});
          });
        } catch (e) {
          return Promise.reject(e);
        }
      });
      return Promise.resolve(instance.nonParallelQueue).then(function () {
        return ret;
      });
    } else {
      instance.nonParallelQueue = instance.nonParallelQueue.then(function () {
        try {
          return Promise.resolve(instance.internals.pouch.allDocs({
            include_docs: true,
            keys: ids
          })).then(function (pouchResult) {
            pouchResult.rows.filter(function (row) {
              return !!row.doc;
            }).forEach(function (row) {
              var docData = row.doc;
              docData = pouchDocumentDataToRxDocumentData(instance.primaryPath, docData);
              ret[row.id] = docData;
            });
          });
        } catch (e) {
          return Promise.reject(e);
        }
      });
      return Promise.resolve(instance.nonParallelQueue).then(function () {
        return ret;
      });
    }
  } catch (e) {
    return Promise.reject(e);
  }
};
var _Pact = /*#__PURE__*/function () {
  function _Pact() {}
  _Pact.prototype.then = function (onFulfilled, onRejected) {
    var result = new _Pact();
    var state = this.s;
    if (state) {
      var callback = state & 1 ? onFulfilled : onRejected;
      if (callback) {
        try {
          _settle(result, 1, callback(this.v));
        } catch (e) {
          _settle(result, 2, e);
        }
        return result;
      } else {
        return this;
      }
    }
    this.o = function (_this) {
      try {
        var value = _this.v;
        if (_this.s & 1) {
          _settle(result, 1, onFulfilled ? onFulfilled(value) : value);
        } else if (onRejected) {
          _settle(result, 1, onRejected(value));
        } else {
          _settle(result, 2, value);
        }
      } catch (e) {
        _settle(result, 2, e);
      }
    };
    return result;
  };
  return _Pact;
}();
function _isSettledPact(thenable) {
  return thenable instanceof _Pact && thenable.s & 1;
}
function _for(test, update, body) {
  var stage;
  for (;;) {
    var shouldContinue = test();
    if (_isSettledPact(shouldContinue)) {
      shouldContinue = shouldContinue.v;
    }
    if (!shouldContinue) {
      return result;
    }
    if (shouldContinue.then) {
      stage = 0;
      break;
    }
    var result = body();
    if (result && result.then) {
      if (_isSettledPact(result)) {
        result = result.s;
      } else {
        stage = 1;
        break;
      }
    }
    if (update) {
      var updateValue = update();
      if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
        stage = 2;
        break;
      }
    }
  }
  var pact = new _Pact();
  var reject = _settle.bind(null, pact, 2);
  (stage === 0 ? shouldContinue.then(_resumeAfterTest) : stage === 1 ? result.then(_resumeAfterBody) : updateValue.then(_resumeAfterUpdate)).then(void 0, reject);
  return pact;
  function _resumeAfterBody(value) {
    result = value;
    do {
      if (update) {
        updateValue = update();
        if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
          updateValue.then(_resumeAfterUpdate).then(void 0, reject);
          return;
        }
      }
      shouldContinue = test();
      if (!shouldContinue || _isSettledPact(shouldContinue) && !shouldContinue.v) {
        _settle(pact, 1, result);
        return;
      }
      if (shouldContinue.then) {
        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
        return;
      }
      result = body();
      if (_isSettledPact(result)) {
        result = result.v;
      }
    } while (!result || !result.then);
    result.then(_resumeAfterBody).then(void 0, reject);
  }
  function _resumeAfterTest(shouldContinue) {
    if (shouldContinue) {
      result = body();
      if (result && result.then) {
        result.then(_resumeAfterBody).then(void 0, reject);
      } else {
        _resumeAfterBody(result);
      }
    } else {
      _settle(pact, 1, result);
    }
  }
  function _resumeAfterUpdate() {
    if (shouldContinue = test()) {
      if (shouldContinue.then) {
        shouldContinue.then(_resumeAfterTest).then(void 0, reject);
      } else {
        _resumeAfterTest(shouldContinue);
      }
    } else {
      _settle(pact, 1, result);
    }
  }
}
var lastId = 0;
export var RxStorageInstancePouch = /*#__PURE__*/function () {
  /**
   * Some PouchDB operations give wrong results when they run in parallel.
   * So we have to ensure they are queued up.
   */

  function RxStorageInstancePouch(storage, databaseName, collectionName, schema, internals, options) {
    var _this = this;
    this.id = lastId++;
    this.changes$ = new Subject();
    this.subs = [];
    this.closed = false;
    this.nonParallelQueue = PROMISE_RESOLVE_VOID;
    this.storage = storage;
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.schema = schema;
    this.internals = internals;
    this.options = options;
    OPEN_POUCHDB_STORAGE_INSTANCES.add(this);
    this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
    /**
     * Instead of listening to pouch.changes,
     * we have overwritten pouchdbs bulkDocs()
     * and create our own event stream, this will work more relyable
     * and does not mix up with write events from other sources.
     */
    var emitter = getCustomEventEmitterByPouch(this.internals.pouch);

    /**
     * Contains all eventIds that of emitted events,
     * used because multi-instance pouchdbs often will reemit the same
     * event on the other browser tab so we have to de-duplicate them.
     */
    var emittedEventBulkIds = new ObliviousSet(60 * 1000);
    var eventSub = emitter.subject.subscribe(function (eventBulk) {
      if (eventBulk.events.length === 0 || emittedEventBulkIds.has(eventBulk.id)) {
        return;
      }
      emittedEventBulkIds.add(eventBulk.id);

      // rewrite primaryPath of all events
      eventBulk.events.forEach(function (event) {
        if (event.documentData) {
          event.documentData = pouchSwapIdToPrimary(_this.primaryPath, event.documentData);
        }
        if (event.previousDocumentData) {
          event.previousDocumentData = pouchSwapIdToPrimary(_this.primaryPath, event.previousDocumentData);
        }
      });
      _this.changes$.next(eventBulk);
    });
    this.subs.push(eventSub);
  }
  var _proto = RxStorageInstancePouch.prototype;
  _proto.close = function close() {
    ensureNotClosed(this);
    this.closed = true;
    this.subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
    OPEN_POUCHDB_STORAGE_INSTANCES["delete"](this);
    OPEN_POUCH_INSTANCES["delete"](this.internals.pouchInstanceId);

    // TODO this did not work because a closed pouchdb cannot be recreated in the same process run
    // await this.internals.pouch.close();
    return PROMISE_RESOLVE_VOID;
  };
  _proto.remove = function remove() {
    try {
      var _this3 = this;
      ensureNotClosed(_this3);
      _this3.closed = true;
      _this3.subs.forEach(function (sub) {
        return sub.unsubscribe();
      });
      OPEN_POUCHDB_STORAGE_INSTANCES["delete"](_this3);
      OPEN_POUCH_INSTANCES["delete"](_this3.internals.pouchInstanceId);
      return Promise.resolve(_this3.internals.pouch.destroy()).then(function () {});
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.bulkWrite = function bulkWrite(documentWrites, context) {
    try {
      var _this5 = this;
      ensureNotClosed(_this5);
      if (documentWrites.length === 0) {
        throw newRxError('P2', {
          args: {
            documentWrites: documentWrites
          }
        });
      }
      var writeRowById = new Map();
      var insertDocsById = new Map();
      var writeDocs = documentWrites.map(function (writeData) {
        /**
         * Ensure that _meta.lwt is set correctly
         */
        if (writeData.document._meta.lwt < 1000 || writeData.previous && writeData.previous._meta.lwt >= writeData.document._meta.lwt) {
          throw newRxError('SNH', {
            args: writeData
          });
        }

        /**
         * Ensure that a revision exists,
         * having an empty revision here would not throw
         * but just not resolve forever.
         */
        if (!writeData.document._rev) {
          throw newRxError('SNH', {
            args: writeData
          });
        }
        var primary = writeData.document[_this5.primaryPath];
        writeRowById.set(primary, writeData);
        var storeDocumentData = rxDocumentDataToPouchDocumentData(_this5.primaryPath, writeData.document);
        insertDocsById.set(primary, storeDocumentData);
        return storeDocumentData;
      });
      var previousDocsInDb = new Map();
      var ret = {
        success: {},
        error: {}
      };
      _this5.nonParallelQueue = _this5.nonParallelQueue.then(function () {
        try {
          return Promise.resolve(_this5.internals.pouch.bulkDocs(writeDocs, {
            new_edits: false,
            custom: {
              primaryPath: _this5.primaryPath,
              writeRowById: writeRowById,
              insertDocsById: insertDocsById,
              previousDocsInDb: previousDocsInDb,
              context: context
            }
          })).then(function (pouchResult) {
            return Promise.all(pouchResult.map(function (resultRow) {
              try {
                var writeRow = getFromMapOrThrow(writeRowById, resultRow.id);
                var _temp4 = function () {
                  if (resultRow.error) {
                    var previousDoc = getFromMapOrThrow(previousDocsInDb, resultRow.id);
                    var err = {
                      isError: true,
                      status: 409,
                      documentId: resultRow.id,
                      writeRow: writeRow,
                      documentInDb: pouchDocumentDataToRxDocumentData(_this5.primaryPath, previousDoc)
                    };
                    ret.error[resultRow.id] = err;
                  } else {
                    var _temp5 = function _temp5() {
                      ret.success[resultRow.id] = _pushObj;
                    };
                    var _pushObj = flatClone(writeRow.document);
                    _pushObj = pouchSwapIdToPrimary(_this5.primaryPath, _pushObj);
                    _pushObj._rev = resultRow.rev;

                    // replace the inserted attachments with their diggest
                    _pushObj._attachments = {};
                    var _temp6 = function () {
                      if (!writeRow.document._attachments) {
                        writeRow.document._attachments = {};
                      } else {
                        return Promise.resolve(writeAttachmentsToAttachments(writeRow.document._attachments)).then(function (_writeAttachmentsToAt) {
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
            }));
          });
        } catch (e) {
          return Promise.reject(e);
        }
      });
      return Promise.resolve(_this5.nonParallelQueue).then(function () {
        return ret;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.query = function query(preparedQuery) {
    try {
      var _this7 = this;
      ensureNotClosed(_this7);
      return Promise.resolve(_this7.internals.pouch.find(preparedQuery)).then(function (findResult) {
        var ret = {
          documents: findResult.docs.map(function (pouchDoc) {
            var useDoc = pouchDocumentDataToRxDocumentData(_this7.primaryPath, pouchDoc);
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
      var _this9 = this;
      ensureNotClosed(_this9);
      return Promise.resolve(_this9.internals.pouch.getAttachment(documentId, attachmentId)).then(function (attachmentData) {
        /**
         * In Node.js, PouchDB works with Buffers because it is old and Node.js did
         * not support Blob at the time is was coded.
         * So here we have to transform the Buffer to a Blob.
         */
        var isBuffer = typeof Buffer !== 'undefined' && Buffer.isBuffer(attachmentData);
        if (isBuffer) {
          attachmentData = new Blob([attachmentData]);
        }
        return Promise.resolve(blobBufferUtil.toBase64String(attachmentData));
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.findDocumentsById = function findDocumentsById(ids, deleted) {
    return pouchFindDocumentsById(this, ids, deleted);
  };
  _proto.changeStream = function changeStream() {
    ensureNotClosed(this);
    return this.changes$.asObservable();
  };
  _proto.cleanup = function cleanup(_minimumDeletedTime) {
    ensureNotClosed(this);
    /**
     * PouchDB does not support purging documents.
     * So instead we run a compaction that might at least help a bit
     * in freeing up disc space.
     * @link https://github.com/pouchdb/pouchdb/issues/802
     */
    return this.internals.pouch.compact().then(function () {
      return true;
    });
  };
  _proto.getChangedDocumentsSince = function getChangedDocumentsSince(limit, checkpoint) {
    try {
      var _temp9 = function _temp9() {
        return Promise.resolve(pouchFindDocumentsById(_this11, changedDocuments.map(function (o) {
          return o.id;
        }), true)).then(function (documentsData) {
          if (Object.keys(documentsData).length > 0 && checkpoint && checkpoint.sequence === lastSequence) {
            /**
             * When documents are returned, it makes no sense
             * if the sequence is equal to the one given at the checkpoint.
             */
            throw new Error('same sequence');
          }
          var lastRow = lastOfArray(changedDocuments);
          var documents = changedDocuments.map(function (changeRow) {
            return getFromObjectOrThrow(documentsData, changeRow.id);
          });
          return {
            documents: documents,
            checkpoint: lastRow ? {
              sequence: lastRow.sequence
            } : checkpoint ? checkpoint : {
              sequence: -1
            }
          };
        });
      };
      var _this11 = this;
      ensureNotClosed(_this11);
      if (!limit || typeof limit !== 'number') {
        throw new Error('wrong limit');
      }
      var pouchChangesOpts = {
        live: false,
        limit: limit,
        include_docs: false,
        since: checkpoint ? checkpoint.sequence : 0,
        descending: false
      };
      var lastSequence = 0;
      var first = true;
      var skippedDesignDocuments = 0;
      var changedDocuments = [];
      /**
       * Because PouchDB also returns changes of _design documents,
       * we have to fill up the results with more changes if this happens.
       */
      var _temp10 = _for(function () {
        return !!first || skippedDesignDocuments > 0;
      }, void 0, function () {
        first = false;
        skippedDesignDocuments = 0;
        return Promise.resolve(_this11.internals.pouch.changes(pouchChangesOpts)).then(function (pouchResults) {
          var addChangedDocuments = pouchResults.results.filter(function (row) {
            var isDesignDoc = row.id.startsWith(POUCHDB_DESIGN_PREFIX);
            if (isDesignDoc) {
              skippedDesignDocuments = skippedDesignDocuments + 1;
              return false;
            } else {
              return true;
            }
          }).map(function (row) {
            return {
              id: row.id,
              sequence: row.seq
            };
          });
          changedDocuments = changedDocuments.concat(addChangedDocuments);
          lastSequence = pouchResults.last_seq;

          // modify pouch options for next run of pouch.changes()
          pouchChangesOpts.since = lastSequence;
          pouchChangesOpts.limit = skippedDesignDocuments;
        });
      });
      return Promise.resolve(_temp10 && _temp10.then ? _temp10.then(_temp9) : _temp9(_temp10));
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.conflictResultionTasks = function conflictResultionTasks() {
    return new Subject();
  };
  _proto.resolveConflictResultionTask = function resolveConflictResultionTask(_taskSolution) {
    return Promise.resolve();
  };
  return RxStorageInstancePouch;
}();
function ensureNotClosed(instance) {
  if (instance.closed) {
    throw new Error('RxStorageInstancePouch is closed ' + instance.databaseName + '-' + instance.collectionName);
  }
}
//# sourceMappingURL=rx-storage-instance-pouch.js.map