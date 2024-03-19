"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DocumentCache = void 0;
exports.mapDocumentsDataToCacheDocs = mapDocumentsDataToCacheDocs;
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _index = require("./plugins/utils/index.js");
var _overwritable = require("./overwritable.js");
var _rxChangeEvent = require("./rx-change-event.js");
/**
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
 */
/**
 * The DocumentCache stores RxDocument objects
 * by their primary key and revision.
 * This is useful on client side applications where
 * it is not known how much memory can be used, so
 * we de-duplicate RxDocument states to save memory.
 * To not fill up the memory with old document states, the DocumentCache
 * only contains weak references to the RxDocuments themself.
 * @link https://caniuse.com/?search=weakref
 */
var DocumentCache = exports.DocumentCache = /*#__PURE__*/function () {
  /**
   * Some JavaScript runtimes like QuickJS,
   * so not have a FinalizationRegistry or WeakRef.
   * Therefore we need a workaround which might waste a lot of memory,
   * but at least works.
   */

  /**
   * Calling registry.register(() has shown to have
   * really bad performance. So we add the cached documents
   * lazily.
   */

  function DocumentCache(primaryPath, changes$,
  /**
   * A method that can create a RxDocument by the given document data.
   */
  documentCreator) {
    this.cacheItemByDocId = new Map();
    this.registry = typeof FinalizationRegistry === 'function' ? new FinalizationRegistry(docMeta => {
      var docId = docMeta.docId;
      var cacheItem = this.cacheItemByDocId.get(docId);
      if (cacheItem) {
        cacheItem.byRev.delete(docMeta.revisionHeight);
        if (cacheItem.byRev.size === 0) {
          /**
           * No state of the document is cached anymore,
           * so we can clean up.
           */
          this.cacheItemByDocId.delete(docId);
        }
      }
    }) : undefined;
    this.registerIdleTasks = [];
    this.primaryPath = primaryPath;
    this.changes$ = changes$;
    this.documentCreator = documentCreator;
    changes$.subscribe(changeEvent => {
      var docId = changeEvent.documentId;
      var cacheItem = this.cacheItemByDocId.get(docId);
      if (cacheItem) {
        var documentData = (0, _rxChangeEvent.getDocumentDataOfRxChangeEvent)(changeEvent);
        cacheItem.last = documentData;
      }
    });
  }

  /**
   * Get the RxDocument from the cache
   * and create a new one if not exits before.
   * @overwrites itself with the actual function
   * because this is @performance relevant.
   * It is called on each document row for each write and read.
   */
  var _proto = DocumentCache.prototype;
  /**
   * Throws if not exists
   */
  _proto.getLatestDocumentData = function getLatestDocumentData(docId) {
    var cacheItem = (0, _index.getFromMapOrThrow)(this.cacheItemByDocId, docId);
    return cacheItem.last;
  };
  _proto.getLatestDocumentDataIfExists = function getLatestDocumentDataIfExists(docId) {
    var cacheItem = this.cacheItemByDocId.get(docId);
    if (cacheItem) {
      return cacheItem.last;
    }
  };
  return (0, _createClass2.default)(DocumentCache, [{
    key: "getCachedRxDocument",
    get: function () {
      var fn = getCachedRxDocumentMonad(this);
      return (0, _index.overwriteGetterForCaching)(this, 'getCachedRxDocument', fn);
    }
  }]);
}();
/**
 * This function is called very very often.
 * This is likely the most important function for RxDB overall performance
 */
function getCachedRxDocumentMonad(docCache) {
  var primaryPath = docCache.primaryPath;
  var cacheItemByDocId = docCache.cacheItemByDocId;
  var registry = docCache.registry;
  var deepFreezeWhenDevMode = _overwritable.overwritable.deepFreezeWhenDevMode;
  var documentCreator = docCache.documentCreator;
  var fn = docData => {
    var docId = docData[primaryPath];
    var revisionHeight = (0, _index.getHeightOfRevision)(docData._rev);
    var cacheItem = (0, _index.getFromMapOrCreate)(cacheItemByDocId, docId, () => getNewCacheItem(docData));
    var byRev = cacheItem.byRev;
    var cachedRxDocumentWeakRef = byRev.get(revisionHeight);
    var cachedRxDocument = cachedRxDocumentWeakRef ? cachedRxDocumentWeakRef.deref() : undefined;
    if (!cachedRxDocument) {
      docData = deepFreezeWhenDevMode(docData);
      cachedRxDocument = documentCreator(docData);
      byRev.set(revisionHeight, createWeakRefWithFallback(cachedRxDocument));
      if (registry) {
        docCache.registerIdleTasks.push(cachedRxDocument);
        if (!docCache.registerIdlePromise) {
          docCache.registerIdlePromise = (0, _index.requestIdlePromiseNoQueue)().then(() => {
            docCache.registerIdlePromise = undefined;
            var tasks = docCache.registerIdleTasks;
            if (tasks.length === 0) {
              return;
            }
            docCache.registerIdleTasks = [];
            tasks.forEach(doc => {
              registry.register(doc, {
                docId: doc.primary,
                revisionHeight: (0, _index.getHeightOfRevision)(doc.revision)
              });
            });
          });
        }
      }
    }
    return cachedRxDocument;
  };
  return fn;
}
function mapDocumentsDataToCacheDocs(docCache, docsData) {
  var getCachedRxDocument = docCache.getCachedRxDocument;
  var documents = [];
  for (var i = 0; i < docsData.length; i++) {
    var _docData = docsData[i];
    var doc = getCachedRxDocument(_docData);
    documents.push(doc);
  }
  return documents;
}
function getNewCacheItem(docData) {
  return {
    byRev: new Map(),
    last: docData
  };
}

/**
 * Fallback for JavaScript runtimes that do not support WeakRef.
 * The fallback will keep the items in cache forever,
 * but at least works.
 */
var HAS_WEAK_REF = typeof WeakRef === 'function';
var createWeakRefWithFallback = HAS_WEAK_REF ? createWeakRef : createWeakRefFallback;
function createWeakRef(obj) {
  return new WeakRef(obj);
}
function createWeakRefFallback(obj) {
  return {
    deref() {
      return obj;
    }
  };
}
//# sourceMappingURL=doc-cache.js.map