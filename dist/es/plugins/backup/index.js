import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
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
export function backupSingleDocument(_x, _x2) {
  return _backupSingleDocument.apply(this, arguments);
}
function _backupSingleDocument() {
  _backupSingleDocument = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee6(rxDocument, options) {
    var data, writtenFiles, docFolder, fileLocation, attachmentsFolder, attachments;
    return _regeneratorRuntime.wrap(function _callee6$(_context7) {
      while (1) switch (_context7.prev = _context7.next) {
        case 0:
          data = rxDocument.toJSON(true);
          writtenFiles = [];
          docFolder = documentFolder(options, rxDocument.primary);
          _context7.next = 5;
          return clearFolder(docFolder);
        case 5:
          fileLocation = path.join(docFolder, 'document.json');
          _context7.next = 8;
          return writeJsonToFile(fileLocation, data);
        case 8:
          writtenFiles.push(fileLocation);
          if (!options.attachments) {
            _context7.next = 15;
            break;
          }
          attachmentsFolder = path.join(docFolder, 'attachments');
          ensureFolderExists(attachmentsFolder);
          attachments = rxDocument.allAttachments();
          _context7.next = 15;
          return Promise.all(attachments.map( /*#__PURE__*/function () {
            var _ref5 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee5(attachment) {
              var content, attachmentFileLocation;
              return _regeneratorRuntime.wrap(function _callee5$(_context6) {
                while (1) switch (_context6.prev = _context6.next) {
                  case 0:
                    _context6.next = 2;
                    return attachment.getData();
                  case 2:
                    content = _context6.sent;
                    attachmentFileLocation = path.join(attachmentsFolder, attachment.id);
                    _context6.next = 6;
                    return writeToFile(attachmentFileLocation, content);
                  case 6:
                    writtenFiles.push(attachmentFileLocation);
                  case 7:
                  case "end":
                    return _context6.stop();
                }
              }, _callee5);
            }));
            return function (_x6) {
              return _ref5.apply(this, arguments);
            };
          }()));
        case 15:
          return _context7.abrupt("return", writtenFiles);
        case 16:
        case "end":
          return _context7.stop();
      }
    }, _callee6);
  }));
  return _backupSingleDocument.apply(this, arguments);
}
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
  _proto._persistOnce = /*#__PURE__*/function () {
    var _persistOnce2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4() {
      var _this2 = this;
      var meta;
      return _regeneratorRuntime.wrap(function _callee4$(_context5) {
        while (1) switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return getMeta(this.options);
          case 2:
            meta = _context5.sent;
            _context5.next = 5;
            return Promise.all(Object.entries(this.database.collections).map( /*#__PURE__*/function () {
              var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(_ref) {
                var collectionName, collection, primaryKey, processedDocuments, lastCheckpoint, hasMore, _loop, _ret;
                return _regeneratorRuntime.wrap(function _callee3$(_context4) {
                  while (1) switch (_context4.prev = _context4.next) {
                    case 0:
                      collectionName = _ref[0], collection = _ref[1];
                      primaryKey = collection.schema.primaryPath;
                      processedDocuments = new Set();
                      _context4.next = 5;
                      return _this2.database.requestIdlePromise();
                    case 5:
                      if (!meta.collectionStates[collectionName]) {
                        meta.collectionStates[collectionName] = {};
                      }
                      lastCheckpoint = meta.collectionStates[collectionName].checkpoint;
                      hasMore = true;
                      _loop = /*#__PURE__*/_regeneratorRuntime.mark(function _loop() {
                        var changesResult, docIds, docs;
                        return _regeneratorRuntime.wrap(function _loop$(_context3) {
                          while (1) switch (_context3.prev = _context3.next) {
                            case 0:
                              _context3.next = 2;
                              return _this2.database.requestIdlePromise();
                            case 2:
                              _context3.next = 4;
                              return collection.storageInstance.getChangedDocumentsSince(_this2.options.batchSize ? _this2.options.batchSize : 0, lastCheckpoint);
                            case 4:
                              changesResult = _context3.sent;
                              lastCheckpoint = changesResult.documents.length > 0 ? changesResult.checkpoint : lastCheckpoint;
                              meta.collectionStates[collectionName].checkpoint = lastCheckpoint;
                              docIds = changesResult.documents.map(function (doc) {
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
                              _context3.next = 10;
                              return _this2.database.requestIdlePromise();
                            case 10:
                              _context3.next = 12;
                              return collection.findByIds(docIds).exec();
                            case 12:
                              docs = _context3.sent;
                              if (!(docs.size === 0)) {
                                _context3.next = 16;
                                break;
                              }
                              hasMore = false;
                              return _context3.abrupt("return", "continue");
                            case 16:
                              _context3.next = 18;
                              return Promise.all(Array.from(docs.values()).map( /*#__PURE__*/function () {
                                var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(doc) {
                                  var writtenFiles;
                                  return _regeneratorRuntime.wrap(function _callee$(_context) {
                                    while (1) switch (_context.prev = _context.next) {
                                      case 0:
                                        _context.next = 2;
                                        return backupSingleDocument(doc, _this2.options);
                                      case 2:
                                        writtenFiles = _context.sent;
                                        _this2.internalWriteEvents$.next({
                                          collectionName: collection.name,
                                          documentId: doc.primary,
                                          files: writtenFiles,
                                          deleted: false
                                        });
                                      case 4:
                                      case "end":
                                        return _context.stop();
                                    }
                                  }, _callee);
                                }));
                                return function (_x4) {
                                  return _ref3.apply(this, arguments);
                                };
                              }()));
                            case 18:
                              _context3.next = 20;
                              return Promise.all(docIds.filter(function (docId) {
                                return !docs.has(docId);
                              }).map( /*#__PURE__*/function () {
                                var _ref4 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(docId) {
                                  return _regeneratorRuntime.wrap(function _callee2$(_context2) {
                                    while (1) switch (_context2.prev = _context2.next) {
                                      case 0:
                                        _context2.next = 2;
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
                                        return _context2.stop();
                                    }
                                  }, _callee2);
                                }));
                                return function (_x5) {
                                  return _ref4.apply(this, arguments);
                                };
                              }()));
                            case 20:
                            case "end":
                              return _context3.stop();
                          }
                        }, _loop);
                      });
                    case 9:
                      if (!(hasMore && !_this2.isStopped)) {
                        _context4.next = 16;
                        break;
                      }
                      return _context4.delegateYield(_loop(), "t0", 11);
                    case 11:
                      _ret = _context4.t0;
                      if (!(_ret === "continue")) {
                        _context4.next = 14;
                        break;
                      }
                      return _context4.abrupt("continue", 9);
                    case 14:
                      _context4.next = 9;
                      break;
                    case 16:
                      meta.collectionStates[collectionName].checkpoint = lastCheckpoint;
                      _context4.next = 19;
                      return setMeta(_this2.options, meta);
                    case 19:
                    case "end":
                      return _context4.stop();
                  }
                }, _callee3);
              }));
              return function (_x3) {
                return _ref2.apply(this, arguments);
              };
            }()));
          case 5:
            if (!this.initialReplicationDone$.getValue()) {
              this.initialReplicationDone$.next(true);
            }
          case 6:
          case "end":
            return _context5.stop();
        }
      }, _callee4, this);
    }));
    function _persistOnce() {
      return _persistOnce2.apply(this, arguments);
    }
    return _persistOnce;
  }();
  _proto.watchForChanges = function watchForChanges() {
    var _this3 = this;
    var collections = Object.values(this.database.collections);
    collections.forEach(function (collection) {
      var changes$ = collection.storageInstance.changeStream();
      var sub = changes$.subscribe(function () {
        _this3.persistOnce();
      });
      _this3.subs.push(sub);
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