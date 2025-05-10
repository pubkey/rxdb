"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  backupSingleDocument: true,
  RxBackupState: true,
  backup: true,
  RxDBBackupPlugin: true
};
exports.RxDBBackupPlugin = exports.RxBackupState = void 0;
exports.backup = backup;
exports.backupSingleDocument = backupSingleDocument;
var path = _interopRequireWildcard(require("node:path"));
var _rxjs = require("rxjs");
var _index = require("../../plugins/utils/index.js");
var _fileUtil = require("./file-util.js");
Object.keys(_fileUtil).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _fileUtil[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _fileUtil[key];
    }
  });
});
var _rxStorageHelper = require("../../rx-storage-helper.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (var _t in e) "default" !== _t && {}.hasOwnProperty.call(e, _t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, _t)) && (i.get || i.set) ? o(f, _t, i) : f[_t] = e[_t]); return f; })(e, t); }
/**
 * Backups a single documents,
 * returns the paths to all written files
 */
async function backupSingleDocument(rxDocument, options) {
  var data = rxDocument.toJSON(true);
  var writtenFiles = [];
  var docFolder = (0, _fileUtil.documentFolder)(options, rxDocument.primary);
  await (0, _fileUtil.clearFolder)(docFolder);
  var fileLocation = path.join(docFolder, 'document.json');
  await (0, _fileUtil.writeJsonToFile)(fileLocation, data);
  writtenFiles.push(fileLocation);
  if (options.attachments) {
    var attachmentsFolder = path.join(docFolder, 'attachments');
    (0, _fileUtil.ensureFolderExists)(attachmentsFolder);
    var attachments = rxDocument.allAttachments();
    await Promise.all(attachments.map(async attachment => {
      var content = await attachment.getData();
      var attachmentFileLocation = path.join(attachmentsFolder, attachment.id);
      await (0, _fileUtil.writeToFile)(attachmentFileLocation, content);
      writtenFiles.push(attachmentFileLocation);
    }));
  }
  return writtenFiles;
}
var BACKUP_STATES_BY_DB = new WeakMap();
function addToBackupStates(db, state) {
  var ar = (0, _index.getFromMapOrCreate)(BACKUP_STATES_BY_DB, db, () => []);
  ar.push(state);
}
var RxBackupState = exports.RxBackupState = /*#__PURE__*/function () {
  function RxBackupState(database, options) {
    this.isStopped = false;
    this.subs = [];
    this.persistRunning = _index.PROMISE_RESOLVE_VOID;
    this.initialReplicationDone$ = new _rxjs.BehaviorSubject(false);
    this.internalWriteEvents$ = new _rxjs.Subject();
    this.writeEvents$ = this.internalWriteEvents$.asObservable();
    this.database = database;
    this.options = options;
    if (!this.options.batchSize) {
      this.options.batchSize = 10;
    }
    addToBackupStates(database, this);
    (0, _fileUtil.prepareFolders)(database, options);
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
    return this.persistRunning = this.persistRunning.then(() => this._persistOnce());
  };
  _proto._persistOnce = async function _persistOnce() {
    var _this = this;
    var meta = await (0, _fileUtil.getMeta)(this.options);
    await Promise.all(Object.entries(this.database.collections).map(async ([collectionName, collection]) => {
      var primaryKey = collection.schema.primaryPath;
      var processedDocuments = new Set();
      await this.database.requestIdlePromise();
      if (!meta.collectionStates[collectionName]) {
        meta.collectionStates[collectionName] = {};
      }
      var lastCheckpoint = meta.collectionStates[collectionName].checkpoint;
      var hasMore = true;
      var _loop = async function () {
        await _this.database.requestIdlePromise();
        var changesResult = await (0, _rxStorageHelper.getChangedDocumentsSince)(collection.storageInstance, _this.options.batchSize ? _this.options.batchSize : 0, lastCheckpoint);
        lastCheckpoint = changesResult.documents.length > 0 ? changesResult.checkpoint : lastCheckpoint;
        meta.collectionStates[collectionName].checkpoint = lastCheckpoint;
        var docIds = changesResult.documents.map(doc => doc[primaryKey]).filter(id => {
          if (processedDocuments.has(id)) {
            return false;
          } else {
            processedDocuments.add(id);
            return true;
          }
        }).filter((elem, pos, arr) => arr.indexOf(elem) === pos); // unique
        await _this.database.requestIdlePromise();
        var docs = await collection.findByIds(docIds).exec();
        if (docs.size === 0) {
          hasMore = false;
          return 1; // continue
        }
        await Promise.all(Array.from(docs.values()).map(async doc => {
          var writtenFiles = await backupSingleDocument(doc, _this.options);
          _this.internalWriteEvents$.next({
            collectionName: collection.name,
            documentId: doc.primary,
            files: writtenFiles,
            deleted: false
          });
        }));
        // handle deleted documents
        await Promise.all(docIds.filter(docId => !docs.has(docId)).map(async docId => {
          await (0, _fileUtil.deleteFolder)((0, _fileUtil.documentFolder)(_this.options, docId));
          _this.internalWriteEvents$.next({
            collectionName: collection.name,
            documentId: docId,
            files: [],
            deleted: true
          });
        }));
      };
      while (hasMore && !this.isStopped) {
        if (await _loop()) continue;
      }
      meta.collectionStates[collectionName].checkpoint = lastCheckpoint;
      await (0, _fileUtil.setMeta)(this.options, meta);
    }));
    if (!this.initialReplicationDone$.getValue()) {
      this.initialReplicationDone$.next(true);
    }
  };
  _proto.watchForChanges = function watchForChanges() {
    var collections = Object.values(this.database.collections);
    collections.forEach(collection => {
      var changes$ = collection.storageInstance.changeStream();
      var sub = changes$.subscribe(() => {
        this.persistOnce();
      });
      this.subs.push(sub);
    });
  }

  /**
   * Returns a promise that resolves when the initial backup is done
   * and the filesystem is in sync with the database state
   */;
  _proto.awaitInitialBackup = function awaitInitialBackup() {
    return (0, _rxjs.firstValueFrom)(this.initialReplicationDone$.pipe((0, _rxjs.filter)(v => !!v), (0, _rxjs.map)(() => true)));
  };
  _proto.cancel = function cancel() {
    if (this.isStopped) {
      return _index.PROMISE_RESOLVE_FALSE;
    }
    this.isStopped = true;
    this.subs.forEach(sub => sub.unsubscribe());
    return _index.PROMISE_RESOLVE_TRUE;
  };
  return RxBackupState;
}();
function backup(options) {
  var backupState = new RxBackupState(this, options);
  backupState.persistOnce();
  if (options.live) {
    backupState.watchForChanges();
  }
  return backupState;
}
var RxDBBackupPlugin = exports.RxDBBackupPlugin = {
  name: 'backup',
  rxdb: true,
  prototypes: {
    RxDatabase(proto) {
      proto.backup = backup;
    }
  },
  hooks: {
    preCloseRxDatabase: {
      after: function preCloseRxDatabase(db) {
        var states = BACKUP_STATES_BY_DB.get(db);
        if (states) {
          states.forEach(state => state.cancel());
        }
      }
    }
  }
};
//# sourceMappingURL=index.js.map