import * as path from 'path';
import { BehaviorSubject, firstValueFrom, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { newRxError } from '../../rx-error';
import { getFromMapOrThrow, PROMISE_RESOLVE_FALSE, PROMISE_RESOLVE_TRUE, PROMISE_RESOLVE_VOID } from '../../util';
import { clearFolder, deleteFolder, documentFolder, ensureFolderExists, getMeta, prepareFolders, setMeta, writeJsonToFile, writeToFile } from './file-util';

/**
 * Backups a single documents,
 * returns the paths to all written files
 */
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
    const observer = pact.o;
    if (observer) {
      observer(pact);
    }
  }
}
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
export var backupSingleDocument = function backupSingleDocument(rxDocument, options) {
  try {
    var data = rxDocument.toJSON(true);
    var writtenFiles = [];
    var docFolder = documentFolder(options, rxDocument.primary);
    return Promise.resolve(clearFolder(docFolder)).then(function () {
      var fileLocation = path.join(docFolder, 'document.json');
      return Promise.resolve(writeJsonToFile(fileLocation, data)).then(function () {
        writtenFiles.push(fileLocation);
        var _temp = function () {
          if (options.attachments) {
            var attachmentsFolder = path.join(docFolder, 'attachments');
            ensureFolderExists(attachmentsFolder);
            var attachments = rxDocument.allAttachments();
            return Promise.resolve(Promise.all(attachments.map(function (attachment) {
              try {
                return Promise.resolve(attachment.getData()).then(function (content) {
                  var attachmentFileLocation = path.join(attachmentsFolder, attachment.id);
                  return Promise.resolve(writeToFile(attachmentFileLocation, content)).then(function () {
                    writtenFiles.push(attachmentFileLocation);
                  });
                });
              } catch (e) {
                return Promise.reject(e);
              }
            }))).then(function () {});
          }
        }();
        return _temp && _temp.then ? _temp.then(function () {
          return writtenFiles;
        }) : writtenFiles;
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
var BACKUP_STATES_BY_DB = new WeakMap();
function addToBackupStates(db, state) {
  if (!BACKUP_STATES_BY_DB.has(db)) {
    BACKUP_STATES_BY_DB.set(db, []);
  }
  var ar = getFromMapOrThrow(BACKUP_STATES_BY_DB, db);
  if (!ar) {
    throw newRxError('SNH');
  }
  ar.push(state);
}
export var RxBackupState = /*#__PURE__*/function () {
  function RxBackupState(database, options) {
    this.isStopped = false;
    this.subs = [];
    this.persistRunning = PROMISE_RESOLVE_VOID;
    this.initialReplicationDone$ = new BehaviorSubject(false);
    this.internalWriteEvents$ = new Subject();
    this.writeEvents$ = this.internalWriteEvents$.asObservable();
    this.database = database;
    this.options = options;
    if (!this.options.batchSize) {
      this.options.batchSize = 10;
    }
    addToBackupStates(database, this);
    prepareFolders(database, options);
  }

  /**
   * Persists all data from all collections,
   * beginning from the oldest sequence checkpoint
   * to the newest one.
   * Do not call this while it is already running.
   * Returns true if there are more documents to process
   */
  var _proto = RxBackupState.prototype;
  _proto.persistOnce = function persistOnce() {
    var _this = this;
    return this.persistRunning = this.persistRunning.then(function () {
      return _this._persistOnce();
    });
  };
  _proto._persistOnce = function _persistOnce() {
    try {
      var _this3 = this;
      return Promise.resolve(getMeta(_this3.options)).then(function (meta) {
        return Promise.resolve(Promise.all(Object.entries(_this3.database.collections).map(function (_ref) {
          try {
            var collectionName = _ref[0],
              collection = _ref[1];
            var primaryKey = collection.schema.primaryPath;
            var processedDocuments = new Set();
            return Promise.resolve(_this3.database.requestIdlePromise()).then(function () {
              function _temp3() {
                meta.collectionStates[collectionName].checkpoint = lastCheckpoint;
                return Promise.resolve(setMeta(_this3.options, meta)).then(function () {});
              }
              if (!meta.collectionStates[collectionName]) {
                meta.collectionStates[collectionName] = {};
              }
              var lastCheckpoint = meta.collectionStates[collectionName].checkpoint;
              var hasMore = true;
              var _temp2 = _for(function () {
                return !!hasMore && !_this3.isStopped;
              }, void 0, function () {
                return Promise.resolve(_this3.database.requestIdlePromise()).then(function () {
                  return Promise.resolve(collection.storageInstance.getChangedDocumentsSince(_this3.options.batchSize ? _this3.options.batchSize : 0, lastCheckpoint)).then(function (changesResult) {
                    lastCheckpoint = changesResult.documents.length > 0 ? changesResult.checkpoint : lastCheckpoint;
                    meta.collectionStates[collectionName].checkpoint = lastCheckpoint;
                    var docIds = changesResult.documents.map(function (doc) {
                      return doc[primaryKey];
                    }).filter(function (id) {
                      if (processedDocuments.has(id)) {
                        return false;
                      } else {
                        processedDocuments.add(id);
                        return true;
                      }
                    }).filter(function (elem, pos, arr) {
                      return arr.indexOf(elem) === pos;
                    }); // unique
                    return Promise.resolve(_this3.database.requestIdlePromise()).then(function () {
                      return Promise.resolve(collection.findByIds(docIds)).then(function (docs) {
                        if (docs.size === 0) {
                          hasMore = false;
                          return;
                        }
                        return Promise.resolve(Promise.all(Array.from(docs.values()).map(function (doc) {
                          try {
                            return Promise.resolve(backupSingleDocument(doc, _this3.options)).then(function (writtenFiles) {
                              _this3.internalWriteEvents$.next({
                                collectionName: collection.name,
                                documentId: doc.primary,
                                files: writtenFiles,
                                deleted: false
                              });
                            });
                          } catch (e) {
                            return Promise.reject(e);
                          }
                        }))).then(function () {
                          // handle deleted documents
                          return Promise.resolve(Promise.all(docIds.filter(function (docId) {
                            return !docs.has(docId);
                          }).map(function (docId) {
                            try {
                              return Promise.resolve(deleteFolder(documentFolder(_this3.options, docId))).then(function () {
                                _this3.internalWriteEvents$.next({
                                  collectionName: collection.name,
                                  documentId: docId,
                                  files: [],
                                  deleted: true
                                });
                              });
                            } catch (e) {
                              return Promise.reject(e);
                            }
                          }))).then(function () {});
                        });
                      });
                    });
                  });
                });
              });
              return _temp2 && _temp2.then ? _temp2.then(_temp3) : _temp3(_temp2);
            });
          } catch (e) {
            return Promise.reject(e);
          }
        }))).then(function () {
          if (!_this3.initialReplicationDone$.getValue()) {
            _this3.initialReplicationDone$.next(true);
          }
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.watchForChanges = function watchForChanges() {
    var _this4 = this;
    var collections = Object.values(this.database.collections);
    collections.forEach(function (collection) {
      var changes$ = collection.storageInstance.changeStream();
      var sub = changes$.subscribe(function () {
        _this4.persistOnce();
      });
      _this4.subs.push(sub);
    });
  }

  /**
   * Returns a promise that resolves when the initial backup is done
   * and the filesystem is in sync with the database state
   */;
  _proto.awaitInitialBackup = function awaitInitialBackup() {
    return firstValueFrom(this.initialReplicationDone$.pipe(filter(function (v) {
      return !!v;
    }), map(function () {
      return true;
    })));
  };
  _proto.cancel = function cancel() {
    if (this.isStopped) {
      return PROMISE_RESOLVE_FALSE;
    }
    this.isStopped = true;
    this.subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
    return PROMISE_RESOLVE_TRUE;
  };
  return RxBackupState;
}();
export function backup(options) {
  var backupState = new RxBackupState(this, options);
  backupState.persistOnce();
  if (options.live) {
    backupState.watchForChanges();
  }
  return backupState;
}
export * from './file-util';
export var RxDBBackupPlugin = {
  name: 'backup',
  rxdb: true,
  prototypes: {
    RxDatabase: function RxDatabase(proto) {
      proto.backup = backup;
    }
  },
  hooks: {
    preDestroyRxDatabase: {
      after: function preDestroyRxDatabase(db) {
        var states = BACKUP_STATES_BY_DB.get(db);
        if (states) {
          states.forEach(function (state) {
            return state.cancel();
          });
        }
      }
    }
  }
};
//# sourceMappingURL=index.js.map