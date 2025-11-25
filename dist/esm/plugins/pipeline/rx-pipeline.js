import { BehaviorSubject, Subject, filter, firstValueFrom } from 'rxjs';
import { PROMISE_RESOLVE_VOID, clone, createRevision, ensureNotFalsy, lastOfArray, now, randomToken } from "../utils/index.js";
import { getChangedDocumentsSince } from "../../rx-storage-helper.js";
import { mapDocumentsDataToCacheDocs } from "../../doc-cache.js";
import { INTERNAL_CONTEXT_PIPELINE_CHECKPOINT, getPrimaryKeyOfInternalDocument } from "../../rx-database-internal-store.js";
import { FLAGGED_FUNCTIONS, blockFlaggedFunctionKey, releaseFlaggedFunctionKey } from "./flagged-functions.js";
export var RxPipeline = /*#__PURE__*/function () {
  /**
   * The handler of the pipeline must never throw.
   * If it did anyway, the pipeline will be stuck and always
   * throw the previous error on all operations.
   */

  function RxPipeline(identifier, source, destination, handler, batchSize = 100) {
    this.processQueue = PROMISE_RESOLVE_VOID;
    this.subs = [];
    this.stopped = false;
    this.toRun = 1;
    this.lastSourceDocTime = new BehaviorSubject(-1);
    this.lastProcessedDocTime = new BehaviorSubject(0);
    this.somethingChanged = new Subject();
    this.secretFunctionName = 'tx_fn_' + randomToken(10);
    this.waitBeforeWriteFn = async () => {
      var stack = new Error().stack;
      if (stack && stack.includes(this.secretFunctionName)) {} else {
        await this.awaitIdle();
      }
    };
    this.identifier = identifier;
    this.source = source;
    this.destination = destination;
    this.handler = handler;
    this.batchSize = batchSize;
    this.checkpointId = 'rx-pipeline-' + identifier;
    this.source.onClose.push(() => this.close());
    this.destination.awaitBeforeReads.add(this.waitBeforeWriteFn);
    this.subs.push(this.source.eventBulks$.pipe(filter(bulk => !this.stopped && !bulk.isLocal)).subscribe(bulk => {
      this.lastSourceDocTime.next(bulk.events[0].documentData._meta.lwt);
      this.somethingChanged.next({});
    }));
    this.subs.push(this.destination.database.internalStore.changeStream().subscribe(eventBulk => {
      var events = eventBulk.events;
      for (var index = 0; index < events.length; index++) {
        var event = events[index];
        if (event.documentData.context === INTERNAL_CONTEXT_PIPELINE_CHECKPOINT && event.documentData.key === this.checkpointId) {
          this.lastProcessedDocTime.next(event.documentData.data.lastDocTime);
          this.somethingChanged.next({});
        }
      }
    }));
  }
  var _proto = RxPipeline.prototype;
  _proto.trigger = function trigger() {
    var _this2 = this;
    /**
     * Do not stack up too many
     * so that fast writes to the source collection
     * do not block anything too long.
     */
    if (this.toRun > 2) {
      return;
    }
    this.toRun = this.toRun + 1;
    this.processQueue = this.processQueue.then(async () => {
      this.toRun = this.toRun - 1;
      var done = false;
      var _loop = async function () {
          var checkpointDoc = await getCheckpointDoc(_this2);
          var checkpoint = checkpointDoc ? checkpointDoc.data.checkpoint : undefined;
          var docsSinceResult = await getChangedDocumentsSince(_this2.source.storageInstance, _this2.batchSize, checkpoint);
          var lastTime = checkpointDoc ? checkpointDoc.data.lastDocTime : 0;
          if (docsSinceResult.documents.length > 0) {
            var rxDocuments = mapDocumentsDataToCacheDocs(_this2.source._docCache, docsSinceResult.documents);
            var _this = _this2;

            // const o: any = {};
            // eval(`
            //     async function ${this.secretFunctionName}(docs){ const x = await _this.handler(docs); return x; }
            //     o.${this.secretFunctionName} = ${this.secretFunctionName};
            // `);
            // await o[this.secretFunctionName](rxDocuments);

            var fnKey = blockFlaggedFunctionKey();
            _this2.secretFunctionName = fnKey;
            try {
              await FLAGGED_FUNCTIONS[fnKey](() => _this.handler(rxDocuments));
            } catch (err) {
              _this2.error = err;
            } finally {
              releaseFlaggedFunctionKey(fnKey);
            }
            if (_this2.error) {
              return {
                v: void 0
              };
            }
            lastTime = ensureNotFalsy(lastOfArray(docsSinceResult.documents))._meta.lwt;
          }
          if (!_this2.destination.closed) {
            await setCheckpointDoc(_this2, {
              checkpoint: docsSinceResult.checkpoint,
              lastDocTime: lastTime
            }, checkpointDoc);
          }
          if (docsSinceResult.documents.length < _this2.batchSize) {
            done = true;
          }
        },
        _ret;
      while (!done && !this.stopped && !this.destination.closed && !this.source.closed && !this.error) {
        _ret = await _loop();
        if (_ret) return _ret.v;
      }
    });
  };
  _proto.awaitIdle = async function awaitIdle() {
    if (this.error) {
      throw this.error;
    }
    var done = false;
    while (!done) {
      await this.processQueue;
      if (this.error) {
        throw this.error;
      }
      if (this.lastProcessedDocTime.getValue() >= this.lastSourceDocTime.getValue()) {
        done = true;
      } else {
        await firstValueFrom(this.somethingChanged);
      }
    }
  };
  _proto.close = async function close() {
    await this.processQueue;
    this.stopped = true;
    this.destination.awaitBeforeReads.delete(this.waitBeforeWriteFn);
    this.subs.forEach(s => s.unsubscribe());
    await this.processQueue;
  }

  /**
   * Remove the pipeline and all metadata which it has stored
   */;
  _proto.remove = async function remove() {
    var insternalStore = this.destination.database.internalStore;
    var checkpointDoc = await getCheckpointDoc(this);
    if (checkpointDoc) {
      var newDoc = clone(checkpointDoc);
      newDoc._deleted = true;
      var writeResult = await insternalStore.bulkWrite([{
        previous: checkpointDoc,
        document: newDoc
      }], 'rx-pipeline');
      if (writeResult.error.length > 0) {
        throw writeResult.error;
      }
    }
    return this.close();
  };
  return RxPipeline;
}();
export async function getCheckpointDoc(pipeline) {
  var insternalStore = pipeline.destination.database.internalStore;
  var checkpointId = getPrimaryKeyOfInternalDocument(pipeline.checkpointId, INTERNAL_CONTEXT_PIPELINE_CHECKPOINT);
  var results = await insternalStore.findDocumentsById([checkpointId], false);
  var result = results[0];
  if (result) {
    return result;
  } else {
    return undefined;
  }
}
export async function setCheckpointDoc(pipeline, newCheckpoint, previous) {
  var insternalStore = pipeline.destination.database.internalStore;
  var newDoc = {
    _attachments: {},
    _deleted: false,
    _meta: {
      lwt: now()
    },
    _rev: createRevision(pipeline.destination.database.token, previous),
    context: INTERNAL_CONTEXT_PIPELINE_CHECKPOINT,
    data: newCheckpoint,
    id: getPrimaryKeyOfInternalDocument(pipeline.checkpointId, INTERNAL_CONTEXT_PIPELINE_CHECKPOINT),
    key: pipeline.checkpointId
  };
  var writeResult = await insternalStore.bulkWrite([{
    previous,
    document: newDoc
  }], 'rx-pipeline');
  if (writeResult.error.length > 0) {
    throw writeResult.error;
  }
}
export async function addPipeline(options) {
  var pipeline = new RxPipeline(options.identifier, this, options.destination, options.handler, options.batchSize);
  var waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;
  var startPromise = waitForLeadership ? this.database.waitForLeadership() : PROMISE_RESOLVE_VOID;
  startPromise.then(() => {
    pipeline.trigger();
    pipeline.subs.push(this.eventBulks$.pipe(filter(bulk => {
      if (pipeline.stopped) {
        return false;
      }
      return !bulk.isLocal;
    })).subscribe(() => pipeline.trigger()));
  });
  return pipeline;
}
//# sourceMappingURL=rx-pipeline.js.map