import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";
/**
 * this plugin adds the RxCollection.syncCouchDBNew()-function to rxdb
 * you can use it to sync collections with a remote CouchDB endpoint.
 */
import { ensureNotFalsy, fastUnsecureHash, flatClone } from '../../util';
import { RxDBLeaderElectionPlugin } from '../leader-election';
import { RxReplicationState, startReplicationOnLeaderShip } from '../replication';
import { addRxPlugin, newRxError } from '../../index';
import { Subject } from 'rxjs';
import { couchDBDocToRxDocData, COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX, mergeUrlQueryParams } from './couchdb-helper';
import { pouchSwapPrimaryToId } from '../pouchdb';
function _catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }
  if (result && result.then) {
    return result.then(void 0, recover);
  }
  return result;
}
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
export * from './couchdb-helper';
export * from './couchdb-types';
export var RxCouchDBNewReplicationState = /*#__PURE__*/function (_RxReplicationState) {
  _inheritsLoose(RxCouchDBNewReplicationState, _RxReplicationState);
  function RxCouchDBNewReplicationState(url, fetch, replicationIdentifierHash, collection, pull, push) {
    var _this;
    var live = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : true;
    var retryTime = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : 1000 * 5;
    var autoStart = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : true;
    _this = _RxReplicationState.call(this, replicationIdentifierHash, collection, '_deleted', pull, push, live, retryTime, autoStart) || this;
    _this.url = url;
    _this.fetch = fetch;
    _this.replicationIdentifierHash = replicationIdentifierHash;
    _this.collection = collection;
    _this.pull = pull;
    _this.push = push;
    _this.live = live;
    _this.retryTime = retryTime;
    _this.autoStart = autoStart;
    return _this;
  }
  return RxCouchDBNewReplicationState;
}(RxReplicationState);
export function syncCouchDBNew(options) {
  options = flatClone(options);
  if (!options.url.endsWith('/')) {
    options.url = options.url + '/';
  }
  options.waitForLeadership = typeof options.waitForLeadership === 'undefined' ? true : options.waitForLeadership;
  var collection = this;
  var pullStream$ = new Subject();
  var replicationPrimitivesPull;
  if (options.pull) {
    replicationPrimitivesPull = {
      handler: function handler(lastPulledCheckpoint, batchSize) {
        try {
          /**
           * @link https://docs.couchdb.org/en/3.2.2-docs/api/database/changes.html
           */
          var _url = options.url + '_changes?' + mergeUrlQueryParams({
            style: 'all_docs',
            feed: 'normal',
            include_docs: true,
            since: lastPulledCheckpoint ? lastPulledCheckpoint.sequence : 0,
            heartbeat: options.pull && options.pull.heartbeat ? options.pull.heartbeat : 60000,
            limit: batchSize,
            seq_interval: batchSize
          });
          return Promise.resolve(replicationState.fetch(_url)).then(function (response) {
            return Promise.resolve(response.json()).then(function (jsonResponse) {
              var documents = jsonResponse.results.map(function (row) {
                return couchDBDocToRxDocData(collection.schema.primaryPath, ensureNotFalsy(row.doc));
              });
              return {
                documents: documents,
                checkpoint: {
                  sequence: jsonResponse.last_seq
                }
              };
            });
          });
        } catch (e) {
          return Promise.reject(e);
        }
      },
      batchSize: ensureNotFalsy(options.pull).batchSize,
      modifier: ensureNotFalsy(options.pull).modifier,
      stream$: pullStream$.asObservable()
    };
  }
  var replicationPrimitivesPush;
  if (options.push) {
    replicationPrimitivesPush = {
      handler: function handler(rows) {
        try {
          /**
           * @link https://docs.couchdb.org/en/3.2.2-docs/api/database/bulk-api.html#db-bulk-docs
           */
          var _url2 = options.url + '_bulk_docs?' + mergeUrlQueryParams({});
          var body = {
            docs: rows.map(function (row) {
              var sendDoc = flatClone(row.newDocumentState);
              if (row.assumedMasterState) {
                sendDoc._rev = ensureNotFalsy(row.assumedMasterState._rev);
              }
              return pouchSwapPrimaryToId(collection.schema.primaryPath, sendDoc);
            })
          };
          return Promise.resolve(replicationState.fetch(_url2, {
            method: 'POST',
            headers: {
              'content-type': 'application/json'
            },
            body: JSON.stringify(body)
          })).then(function (response) {
            return Promise.resolve(response.json()).then(function (responseJson) {
              var conflicts = responseJson.filter(function (row) {
                var isConflict = row.error === 'conflict';
                if (!row.ok && !isConflict) {
                  throw newRxError('SNH', {
                    args: {
                      row: row
                    }
                  });
                }
                return isConflict;
              });
              if (conflicts.length === 0) {
                return [];
              }
              var getConflictDocsUrl = options.url + '_all_docs?' + mergeUrlQueryParams({
                include_docs: true,
                keys: JSON.stringify(conflicts.map(function (c) {
                  return c.id;
                }))
              });
              return Promise.resolve(replicationState.fetch(getConflictDocsUrl)).then(function (conflictResponse) {
                return Promise.resolve(conflictResponse.json()).then(function (conflictResponseJson) {
                  var conflictDocsMasterState = conflictResponseJson.rows.map(function (r) {
                    return couchDBDocToRxDocData(collection.schema.primaryPath, r.doc);
                  });
                  return conflictDocsMasterState;
                });
              });
            });
          });
        } catch (e) {
          return Promise.reject(e);
        }
      },
      batchSize: options.push.batchSize,
      modifier: options.push.modifier
    };
  }
  var replicationState = new RxCouchDBNewReplicationState(options.url, options.fetch ? options.fetch : fetch, COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX + fastUnsecureHash(options.url), collection, replicationPrimitivesPull, replicationPrimitivesPush, options.live, options.retryTime, options.autoStart);

  /**
   * Use long polling to get live changes for the pull.stream$
   */
  if (options.live && options.pull) {
    var startBefore = replicationState.start.bind(replicationState);
    replicationState.start = function () {
      var since = 'now';
      var batchSize = options.pull && options.pull.batchSize ? options.pull.batchSize : 20;
      (function () {
        try {
          var _temp4 = _for(function () {
            return !replicationState.isStopped();
          }, void 0, function () {
            function _temp2() {
              var documents = jsonResponse.results.map(function (row) {
                return couchDBDocToRxDocData(collection.schema.primaryPath, ensureNotFalsy(row.doc));
              });
              since = jsonResponse.last_seq;
              pullStream$.next({
                documents: documents,
                checkpoint: {
                  sequence: jsonResponse.last_seq
                }
              });
            }
            var url = options.url + '_changes?' + mergeUrlQueryParams({
              style: 'all_docs',
              feed: 'longpoll',
              since: since,
              include_docs: true,
              heartbeat: options.pull && options.pull.heartbeat ? options.pull.heartbeat : 60000,
              limit: batchSize,
              seq_interval: batchSize
            });
            var jsonResponse;
            var _temp = _catch(function () {
              return Promise.resolve(replicationState.fetch(url)).then(function (_replicationState$fet) {
                return Promise.resolve(_replicationState$fet.json()).then(function (_await$replicationSta) {
                  jsonResponse = _await$replicationSta;
                });
              });
            }, function (err) {
              pullStream$.error(err);
            });
            return _temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp);
          });
          return _temp4 && _temp4.then ? _temp4.then(function () {}) : void 0;
        } catch (e) {
          Promise.reject(e);
        }
      })();
      return startBefore();
    };
  }
  startReplicationOnLeaderShip(options.waitForLeadership, replicationState);
  return replicationState;
}
export var RxDBReplicationCouchDBNewPlugin = {
  name: 'replication-couchdb-new',
  init: function init() {
    addRxPlugin(RxDBLeaderElectionPlugin);
  },
  rxdb: true,
  prototypes: {
    RxCollection: function RxCollection(proto) {
      proto.syncCouchDBNew = syncCouchDBNew;
    }
  }
};
//# sourceMappingURL=index.js.map