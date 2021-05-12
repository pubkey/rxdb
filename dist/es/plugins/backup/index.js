import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import * as path from 'path';
import { BehaviorSubject, firstValueFrom, fromEvent, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { getNewestSequence } from '../../pouch-db';
import { clearFolder, deleteFolder, documentFolder, ensureFolderExists, getMeta, prepareFolders, setMeta, writeJsonToFile, writeToFile } from './file-util';
/**
 * Backups a single documents,
 * returns the paths to all written files
 */

export function backupSingleDocument(_x, _x2) {
  return _backupSingleDocument.apply(this, arguments);
}

function _backupSingleDocument() {
  _backupSingleDocument = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee7(rxDocument, options) {
    var data, writtenFiles, docFolder, fileLocation, attachmentsFolder, attachments;
    return _regeneratorRuntime.wrap(function _callee7$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            data = rxDocument.toJSON(true);
            writtenFiles = [];
            docFolder = documentFolder(options, rxDocument.primary);
            _context8.next = 5;
            return clearFolder(docFolder);

          case 5:
            fileLocation = path.join(docFolder, 'document.json');
            _context8.next = 8;
            return writeJsonToFile(fileLocation, data);

          case 8:
            writtenFiles.push(fileLocation);

            if (!options.attachments) {
              _context8.next = 15;
              break;
            }

            attachmentsFolder = path.join(docFolder, 'attachments');
            ensureFolderExists(attachmentsFolder);
            attachments = rxDocument.allAttachments();
            _context8.next = 15;
            return Promise.all(attachments.map( /*#__PURE__*/function () {
              var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6(attachment) {
                var content, attachmentFileLocation;
                return _regeneratorRuntime.wrap(function _callee6$(_context7) {
                  while (1) {
                    switch (_context7.prev = _context7.next) {
                      case 0:
                        _context7.next = 2;
                        return attachment.getData();

                      case 2:
                        content = _context7.sent;
                        attachmentFileLocation = path.join(attachmentsFolder, attachment.id);
                        _context7.next = 6;
                        return writeToFile(attachmentFileLocation, content);

                      case 6:
                        writtenFiles.push(attachmentFileLocation);

                      case 7:
                      case "end":
                        return _context7.stop();
                    }
                  }
                }, _callee6);
              }));

              return function (_x6) {
                return _ref4.apply(this, arguments);
              };
            }()));

          case 15:
            return _context8.abrupt("return", writtenFiles);

          case 16:
          case "end":
            return _context8.stop();
        }
      }
    }, _callee7);
  }));
  return _backupSingleDocument.apply(this, arguments);
}

var BACKUP_STATES_BY_DB = new WeakMap();

function addToBackupStates(db, state) {
  if (!BACKUP_STATES_BY_DB.has(db)) {
    BACKUP_STATES_BY_DB.set(db, []);
  }

  var ar = BACKUP_STATES_BY_DB.get(db);

  if (!ar) {
    throw new Error('this should never happen');
  }

  ar.push(state);
}

export var RxBackupState = /*#__PURE__*/function () {
  function RxBackupState(database, options) {
    this.isStopped = false;
    this.subs = [];
    this.persistRunning = Promise.resolve();
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
   * beginning from the last sequence checkpoint
   * to the newest one.
   * Do not call this while it is already running.
   * Returns true if there are more documents to process
   */


  var _proto = RxBackupState.prototype;

  _proto.persistOnce =
  /*#__PURE__*/
  function () {
    var _persistOnce2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
      var _this = this;

      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              return _context.abrupt("return", this.persistRunning = this.persistRunning.then(function () {
                return _this._persistOnce();
              }));

            case 1:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    function persistOnce() {
      return _persistOnce2.apply(this, arguments);
    }

    return persistOnce;
  }();

  _proto._persistOnce = /*#__PURE__*/function () {
    var _persistOnce3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5() {
      var _this2 = this;

      var meta;
      return _regeneratorRuntime.wrap(function _callee5$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              _context6.next = 2;
              return getMeta(this.options);

            case 2:
              meta = _context6.sent;
              _context6.next = 5;
              return Promise.all(Object.keys(this.database.collections).map( /*#__PURE__*/function () {
                var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(collectionName) {
                  var processedDocuments, collection, newestSeq, lastSequence, hasMore, _loop, _ret;

                  return _regeneratorRuntime.wrap(function _callee4$(_context5) {
                    while (1) {
                      switch (_context5.prev = _context5.next) {
                        case 0:
                          processedDocuments = new Set();
                          collection = _this2.database.collections[collectionName];
                          _context5.next = 4;
                          return _this2.database.requestIdlePromise();

                        case 4:
                          _context5.next = 6;
                          return getNewestSequence(collection.pouch);

                        case 6:
                          newestSeq = _context5.sent;

                          if (!meta.collectionStates[collectionName]) {
                            meta.collectionStates[collectionName] = {
                              newestKnownSequence: newestSeq,
                              lastSequence: 0
                            };
                          }

                          lastSequence = meta.collectionStates[collectionName].lastSequence;
                          hasMore = true;
                          _loop = /*#__PURE__*/_regeneratorRuntime.mark(function _loop() {
                            var pouchChanges, docIds, docs;
                            return _regeneratorRuntime.wrap(function _loop$(_context4) {
                              while (1) {
                                switch (_context4.prev = _context4.next) {
                                  case 0:
                                    _context4.next = 2;
                                    return _this2.database.requestIdlePromise();

                                  case 2:
                                    _context4.next = 4;
                                    return collection.pouch.changes({
                                      live: false,
                                      since: lastSequence,
                                      limit: _this2.options.batchSize,
                                      include_docs: false
                                    });

                                  case 4:
                                    pouchChanges = _context4.sent;
                                    lastSequence = pouchChanges.last_seq;
                                    meta.collectionStates[collectionName].lastSequence = lastSequence;
                                    docIds = pouchChanges.results.filter(function (doc) {
                                      if (processedDocuments.has(doc.id) && doc.seq < newestSeq) {
                                        return false;
                                      } else {
                                        processedDocuments.add(doc.id);
                                        return true;
                                      }
                                    }).map(function (r) {
                                      return r.id;
                                    }).filter(function (id) {
                                      return !id.startsWith('_design/');
                                    }) // unique
                                    . // unique
                                    filter(function (elem, pos, arr) {
                                      return arr.indexOf(elem) === pos;
                                    });
                                    _context4.next = 10;
                                    return _this2.database.requestIdlePromise();

                                  case 10:
                                    _context4.next = 12;
                                    return collection.findByIds(docIds);

                                  case 12:
                                    docs = _context4.sent;

                                    if (!(docs.size === 0)) {
                                      _context4.next = 16;
                                      break;
                                    }

                                    hasMore = false;
                                    return _context4.abrupt("return", "continue");

                                  case 16:
                                    _context4.next = 18;
                                    return Promise.all(Array.from(docs.values()).map( /*#__PURE__*/function () {
                                      var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(doc) {
                                        var writtenFiles;
                                        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
                                          while (1) {
                                            switch (_context2.prev = _context2.next) {
                                              case 0:
                                                _context2.next = 2;
                                                return backupSingleDocument(doc, _this2.options);

                                              case 2:
                                                writtenFiles = _context2.sent;

                                                _this2.internalWriteEvents$.next({
                                                  collectionName: collection.name,
                                                  documentId: doc.primary,
                                                  files: writtenFiles,
                                                  deleted: false
                                                });

                                              case 4:
                                              case "end":
                                                return _context2.stop();
                                            }
                                          }
                                        }, _callee2);
                                      }));

                                      return function (_x4) {
                                        return _ref2.apply(this, arguments);
                                      };
                                    }()));

                                  case 18:
                                    _context4.next = 20;
                                    return Promise.all(docIds.filter(function (docId) {
                                      return !docs.has(docId);
                                    }).map( /*#__PURE__*/function () {
                                      var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(docId) {
                                        return _regeneratorRuntime.wrap(function _callee3$(_context3) {
                                          while (1) {
                                            switch (_context3.prev = _context3.next) {
                                              case 0:
                                                _context3.next = 2;
                                                return deleteFolder(documentFolder(_this2.options, docId));

                                              case 2:
                                                _this2.internalWriteEvents$.next({
                                                  collectionName: collection.name,
                                                  documentId: docId,
                                                  files: [],
                                                  deleted: true
                                                });

                                              case 3:
                                              case "end":
                                                return _context3.stop();
                                            }
                                          }
                                        }, _callee3);
                                      }));

                                      return function (_x5) {
                                        return _ref3.apply(this, arguments);
                                      };
                                    }()));

                                  case 20:
                                  case "end":
                                    return _context4.stop();
                                }
                              }
                            }, _loop);
                          });

                        case 11:
                          if (!(hasMore && !_this2.isStopped)) {
                            _context5.next = 18;
                            break;
                          }

                          return _context5.delegateYield(_loop(), "t0", 13);

                        case 13:
                          _ret = _context5.t0;

                          if (!(_ret === "continue")) {
                            _context5.next = 16;
                            break;
                          }

                          return _context5.abrupt("continue", 11);

                        case 16:
                          _context5.next = 11;
                          break;

                        case 18:
                          meta.collectionStates[collectionName].lastSequence = lastSequence;
                          _context5.next = 21;
                          return setMeta(_this2.options, meta);

                        case 21:
                        case "end":
                          return _context5.stop();
                      }
                    }
                  }, _callee4);
                }));

                return function (_x3) {
                  return _ref.apply(this, arguments);
                };
              }()));

            case 5:
              if (!this.initialReplicationDone$.getValue()) {
                this.initialReplicationDone$.next(true);
              }

            case 6:
            case "end":
              return _context6.stop();
          }
        }
      }, _callee5, this);
    }));

    function _persistOnce() {
      return _persistOnce3.apply(this, arguments);
    }

    return _persistOnce;
  }();

  _proto.watchForChanges = function watchForChanges() {
    var _this3 = this;

    var collections = Object.values(this.database.collections);
    collections.forEach(function (collection) {
      var changes$ = fromEvent(collection.pouch.changes({
        since: 'now',
        live: true,
        include_docs: false
      }), 'change');
      var sub = changes$.subscribe(function () {
        _this3.persistOnce();
      });

      _this3.subs.push(sub);
    });
  }
  /**
   * Returns a promise that resolves when the initial backup is done
   * and the filesystem is in sync with the database state
   */
  ;

  _proto.awaitInitialBackup = function awaitInitialBackup() {
    return firstValueFrom(this.initialReplicationDone$.pipe(filter(function (v) {
      return !!v;
    }), map(function () {
      return true;
    })));
  };

  _proto.cancel = function cancel() {
    if (this.isStopped) {
      return Promise.resolve(false);
    }

    this.isStopped = true;
    this.subs.forEach(function (sub) {
      return sub.unsubscribe();
    });
    return Promise.resolve(true);
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
    preDestroyRxDatabase: function preDestroyRxDatabase(db) {
      var states = BACKUP_STATES_BY_DB.get(db);

      if (states) {
        states.forEach(function (state) {
          return state.cancel();
        });
      }
    }
  }
};
//# sourceMappingURL=index.js.map