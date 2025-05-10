import { Subject, distinctUntilChanged, map, merge, shareReplay, startWith, tap } from 'rxjs';
import { overwritable } from "../../overwritable.js";
import { getChangedDocumentsSince } from "../../rx-storage-helper.js";
import { RXJS_SHARE_REPLAY_DEFAULTS, getProperty, setProperty, PROMISE_RESOLVE_VOID, appendToArray, clone, randomToken, deepEqual, getFromMapOrCreate } from "../utils/index.js";
import { RX_STATE_COLLECTION_SCHEMA, isValidWeakMapKey, nextRxStateId } from "./helpers.js";
import { newRxError } from "../../rx-error.js";
import { runPluginHooks } from "../../hooks.js";
var debugId = 0;
var deepFrozenCache = new WeakMap();

/**
 * RxDB internally used properties are
 * prefixed with lodash _ to make them less
 * likely to clash with actual state properties
 * from the user.
 */
export var RxStateBase = /*#__PURE__*/function () {
  // used for debugging

  function RxStateBase(prefix, collection) {
    this._id = debugId++;
    this._state = {};
    this._nonPersisted = [];
    this._writeQueue = PROMISE_RESOLVE_VOID;
    this._initDone = false;
    this._instanceId = randomToken(RX_STATE_COLLECTION_SCHEMA.properties.sId.maxLength);
    this._ownEmits$ = new Subject();
    this.prefix = prefix;
    this.collection = collection;
    this.collection.onClose.push(() => this._writeQueue);
    this._lastIdQuery = this.collection.findOne({
      sort: [{
        id: 'desc'
      }]
    });
    // make it "hot" for better write performance
    this._lastIdQuery.$.subscribe();
    this.$ = merge(this._ownEmits$, this.collection.eventBulks$.pipe(tap(eventBulk => {
      if (!this._initDone) {
        return;
      }
      var events = eventBulk.events;
      for (var index = 0; index < events.length; index++) {
        var event = events[index];
        if (event.operation === 'INSERT' && event.documentData.sId !== this._instanceId) {
          this.mergeOperationsIntoState(event.documentData.ops);
        }
      }
    }))).pipe(shareReplay(RXJS_SHARE_REPLAY_DEFAULTS), map(() => this._state));
    // directly subscribe because of the tap() side effect
    this.$.subscribe();
  }
  var _proto = RxStateBase.prototype;
  _proto.set = async function set(path, modifier) {
    this._nonPersisted.push({
      path,
      modifier
    });
    return this._triggerWrite();
  }

  /**
   * To have deterministic writes,
   * and to ensure that multiple js realms do not overwrite
   * each other, the write happens with incremental ids
   * that would throw conflict errors and trigger a retry.
   */;
  _proto._triggerWrite = function _triggerWrite() {
    this._writeQueue = this._writeQueue.then(async () => {
      if (this._nonPersisted.length === 0) {
        return;
      }
      var useWrites = [];
      var done = false;
      while (!done) {
        var lastIdDoc = await this._lastIdQuery.exec();
        appendToArray(useWrites, this._nonPersisted);
        this._nonPersisted = [];
        var nextId = nextRxStateId(lastIdDoc ? lastIdDoc.id : undefined);
        try {
          /**
           * TODO instead of a deep-clone we should
           * only clone the parts where we know that they
           * will be changed. This would improve performance.
           */
          var newState = clone(this._state);
          var ops = [];
          for (var index = 0; index < useWrites.length; index++) {
            var writeRow = useWrites[index];
            var value = getProperty(newState, writeRow.path);
            var newValue = writeRow.modifier(value);
            /**
             * Here we have to clone the value because
             * some storages like the memory storage
             * make input data deep-frozen in dev-mode.
             */
            if (writeRow.path === '') {
              newState = clone(newValue);
            } else {
              setProperty(newState, writeRow.path, clone(newValue));
            }
            ops.push({
              k: writeRow.path,
              /**
               * Here we have to clone the value because
               * some storages like the memory storage
               * make input data deep-frozen in dev-mode.
               */
              v: clone(newValue)
            });
          }
          await this.collection.insert({
            id: nextId,
            sId: this._instanceId,
            ops
          });
          this._state = newState;
          this._ownEmits$.next(this._state);
          done = true;
        } catch (err) {
          if (err.code !== 'CONFLICT') {
            throw err;
          }
        }
      }
    }).catch(error => {
      throw newRxError('SNH', {
        name: 'RxState WRITE QUEUE ERROR',
        error
      });
    });
    return this._writeQueue;
  };
  _proto.mergeOperationsIntoState = function mergeOperationsIntoState(operations) {
    var state = clone(this._state);
    for (var index = 0; index < operations.length; index++) {
      var operation = operations[index];
      if (operation.k === '') {
        state = clone(operation.v);
      } else {
        setProperty(state, operation.k, clone(operation.v));
      }
    }
    this._state = state;
  };
  _proto.get = function get(path) {
    var ret;
    if (!path) {
      ret = this._state;
    } else {
      ret = getProperty(this._state, path);
    }

    /**
     * In dev-mode we have to clone the value before deep-freezing
     * it to not have an immutable subobject in the state value.
     * But calling .get() with the same path multiple times,
     * should return exactly the same object instance
     * so it does not cause re-renders on react.
     * So in dev-mode we have to 
     */
    if (overwritable.isDevMode() && isValidWeakMapKey(ret)) {
      var frozen = getFromMapOrCreate(deepFrozenCache, ret, () => overwritable.deepFreezeWhenDevMode(clone(ret)));
      return frozen;
    }
    return ret;
  };
  _proto.get$ = function get$(path) {
    return this.$.pipe(map(() => this.get(path)), startWith(this.get(path)), distinctUntilChanged(deepEqual), shareReplay(RXJS_SHARE_REPLAY_DEFAULTS));
  };
  _proto.get$$ = function get$$(path) {
    var obs = this.get$(path);
    var reactivity = this.collection.database.getReactivityFactory();
    return reactivity.fromObservable(obs, this.get(path), this.collection.database);
  }

  /**
   * Merges the state operations into a single write row
   * to store space and make recreating the state from
   * disc faster.
   */;
  _proto._cleanup = async function _cleanup() {
    var firstWrite = await this.collection.findOne({
      sort: [{
        id: 'asc'
      }]
    }).exec();
    var lastWrite = await this._lastIdQuery.exec();
    if (!firstWrite || !lastWrite) {
      return;
    }
    var firstNr = parseInt(firstWrite.id, 10);
    var lastNr = parseInt(lastWrite.id, 10);
    if (lastNr - 5 < firstNr) {
      // only run if more then 5 write rows
      return;
    }

    // update whole state object
    await this._writeQueue;
    await this.set('', () => this._state);

    // delete old ones
    await this.collection.find({
      selector: {
        id: {
          $lte: lastWrite.id
        }
      }
    }).remove();
  };
  return RxStateBase;
}();
export async function createRxState(database, prefix) {
  var collectionName = 'rx-state-' + prefix;
  await database.addCollections({
    [collectionName]: {
      schema: RX_STATE_COLLECTION_SCHEMA
    }
  });
  var collection = database.collections[collectionName];
  var rxState = new RxStateBase(prefix, collection);

  /**
   * Directly get the state and put it into memory.
   * This ensures we can do non-async accesses to the
   * correct state.
   */
  var done = false;
  var checkpoint = undefined;
  while (!done) {
    var result = await getChangedDocumentsSince(collection.storageInstance, 1000, checkpoint);
    checkpoint = result.checkpoint;
    var documents = result.documents;
    if (documents.length === 0) {
      done = true;
    } else {
      for (var index = 0; index < documents.length; index++) {
        var document = documents[index];
        mergeOperationsIntoState(rxState._state, document.ops);
      }
    }
  }
  rxState._initDone = true;
  var proxy = new Proxy(rxState, {
    get(target, property) {
      if (typeof property !== 'string') {
        return target[property];
      }
      if (rxState[property]) {
        var ret = rxState[property];
        if (typeof ret === 'function') {
          return ret.bind(rxState);
        } else {
          return ret;
        }
      }
      var lastChar = property.charAt(property.length - 1);
      if (property.endsWith('$$')) {
        var key = property.slice(0, -2);
        return rxState.get$$(key);
      } else if (lastChar === '$') {
        var _key = property.slice(0, -1);
        return rxState.get$(_key);
      } else {
        return rxState.get(property);
      }
    },
    set(target, newValue, receiver) {
      throw new Error('Do not write to RxState');
    }
  });
  runPluginHooks('createRxState', {
    collection,
    state: proxy
  });
  return proxy;
}
export function mergeOperationsIntoState(state, operations) {
  for (var index = 0; index < operations.length; index++) {
    var operation = operations[index];
    setProperty(state, operation.k, clone(operation.v));
  }
}
//# sourceMappingURL=rx-state.js.map