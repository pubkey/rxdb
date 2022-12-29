import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _inheritsLoose from "@babel/runtime/helpers/inheritsLoose";
import _regeneratorRuntime from "@babel/runtime/regenerator";
/**
 * this plugin adds the RxCollection.syncCouchDB()-function to rxdb
 * you can use it to sync collections with a remote CouchDB endpoint.
 */
import { ensureNotFalsy, errorToPlainJson, fastUnsecureHash, flatClone } from '../../util';
import { RxDBLeaderElectionPlugin } from '../leader-election';
import { RxReplicationState, startReplicationOnLeaderShip } from '../replication';
import { addRxPlugin, newRxError } from '../../index';
import { Subject } from 'rxjs';
import { couchDBDocToRxDocData, COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX, mergeUrlQueryParams, couchSwapPrimaryToId, getDefaultFetch } from './couchdb-helper';
export * from './couchdb-helper';
export * from './couchdb-types';
export var RxCouchDBReplicationState = /*#__PURE__*/function (_RxReplicationState) {
  _inheritsLoose(RxCouchDBReplicationState, _RxReplicationState);
  function RxCouchDBReplicationState(url, fetch, replicationIdentifierHash, collection, pull, push) {
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
  return RxCouchDBReplicationState;
}(RxReplicationState);
export function syncCouchDB(options) {
  var _this2 = this;
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
      handler: function () {
        var _handler = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(lastPulledCheckpoint, batchSize) {
          var url, response, jsonResponse, documents;
          return _regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) switch (_context.prev = _context.next) {
              case 0:
                /**
                 * @link https://docs.couchdb.org/en/3.2.2-docs/api/database/changes.html
                 */
                url = options.url + '_changes?' + mergeUrlQueryParams({
                  style: 'all_docs',
                  feed: 'normal',
                  include_docs: true,
                  since: lastPulledCheckpoint ? lastPulledCheckpoint.sequence : 0,
                  heartbeat: options.pull && options.pull.heartbeat ? options.pull.heartbeat : 60000,
                  limit: batchSize,
                  seq_interval: batchSize
                });
                _context.next = 3;
                return replicationState.fetch(url);
              case 3:
                response = _context.sent;
                _context.next = 6;
                return response.json();
              case 6:
                jsonResponse = _context.sent;
                documents = jsonResponse.results.map(function (row) {
                  return couchDBDocToRxDocData(collection.schema.primaryPath, ensureNotFalsy(row.doc));
                });
                return _context.abrupt("return", {
                  documents: documents,
                  checkpoint: {
                    sequence: jsonResponse.last_seq
                  }
                });
              case 9:
              case "end":
                return _context.stop();
            }
          }, _callee);
        }));
        function handler(_x, _x2) {
          return _handler.apply(this, arguments);
        }
        return handler;
      }(),
      batchSize: ensureNotFalsy(options.pull).batchSize,
      modifier: ensureNotFalsy(options.pull).modifier,
      stream$: pullStream$.asObservable()
    };
  }
  var replicationPrimitivesPush;
  if (options.push) {
    replicationPrimitivesPush = {
      handler: function () {
        var _handler2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(rows) {
          var url, body, response, responseJson, conflicts, getConflictDocsUrl, conflictResponse, conflictResponseJson, conflictDocsMasterState;
          return _regeneratorRuntime.wrap(function _callee2$(_context2) {
            while (1) switch (_context2.prev = _context2.next) {
              case 0:
                /**
                 * @link https://docs.couchdb.org/en/3.2.2-docs/api/database/bulk-api.html#db-bulk-docs
                 */
                url = options.url + '_bulk_docs?' + mergeUrlQueryParams({});
                body = {
                  docs: rows.map(function (row) {
                    var sendDoc = flatClone(row.newDocumentState);
                    if (row.assumedMasterState) {
                      sendDoc._rev = ensureNotFalsy(row.assumedMasterState._rev);
                    }
                    return couchSwapPrimaryToId(collection.schema.primaryPath, sendDoc);
                  })
                };
                _context2.next = 4;
                return replicationState.fetch(url, {
                  method: 'POST',
                  headers: {
                    'content-type': 'application/json'
                  },
                  body: JSON.stringify(body)
                });
              case 4:
                response = _context2.sent;
                _context2.next = 7;
                return response.json();
              case 7:
                responseJson = _context2.sent;
                conflicts = responseJson.filter(function (row) {
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
                if (!(conflicts.length === 0)) {
                  _context2.next = 11;
                  break;
                }
                return _context2.abrupt("return", []);
              case 11:
                getConflictDocsUrl = options.url + '_all_docs?' + mergeUrlQueryParams({
                  include_docs: true,
                  keys: JSON.stringify(conflicts.map(function (c) {
                    return c.id;
                  }))
                });
                _context2.next = 14;
                return replicationState.fetch(getConflictDocsUrl);
              case 14:
                conflictResponse = _context2.sent;
                _context2.next = 17;
                return conflictResponse.json();
              case 17:
                conflictResponseJson = _context2.sent;
                conflictDocsMasterState = conflictResponseJson.rows.map(function (r) {
                  return couchDBDocToRxDocData(collection.schema.primaryPath, r.doc);
                });
                return _context2.abrupt("return", conflictDocsMasterState);
              case 20:
              case "end":
                return _context2.stop();
            }
          }, _callee2);
        }));
        function handler(_x3) {
          return _handler2.apply(this, arguments);
        }
        return handler;
      }(),
      batchSize: options.push.batchSize,
      modifier: options.push.modifier
    };
  }
  var replicationState = new RxCouchDBReplicationState(options.url, options.fetch ? options.fetch : getDefaultFetch(), COUCHDB_NEW_REPLICATION_PLUGIN_IDENTITY_PREFIX + fastUnsecureHash(options.url), collection, replicationPrimitivesPull, replicationPrimitivesPush, options.live, options.retryTime, options.autoStart);

  /**
   * Use long polling to get live changes for the pull.stream$
   */
  if (options.live && options.pull) {
    var startBefore = replicationState.start.bind(replicationState);
    replicationState.start = function () {
      var since = 'now';
      var batchSize = options.pull && options.pull.batchSize ? options.pull.batchSize : 20;
      _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3() {
        var _url, jsonResponse, documents;
        return _regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              if (replicationState.isStopped()) {
                _context3.next = 22;
                break;
              }
              _url = options.url + '_changes?' + mergeUrlQueryParams({
                style: 'all_docs',
                feed: 'longpoll',
                since: since,
                include_docs: true,
                heartbeat: options.pull && options.pull.heartbeat ? options.pull.heartbeat : 60000,
                limit: batchSize,
                seq_interval: batchSize
              });
              jsonResponse = void 0;
              _context3.prev = 3;
              _context3.next = 6;
              return replicationState.fetch(_url);
            case 6:
              _context3.next = 8;
              return _context3.sent.json();
            case 8:
              jsonResponse = _context3.sent;
              _context3.next = 17;
              break;
            case 11:
              _context3.prev = 11;
              _context3.t0 = _context3["catch"](3);
              pullStream$.error(newRxError('RC_STREAM', {
                args: {
                  url: _url
                },
                error: errorToPlainJson(_context3.t0)
              }));
              // await next tick here otherwise we could go in to a 100% CPU blocking cycle.
              _context3.next = 16;
              return _this2.promiseWait(0);
            case 16:
              return _context3.abrupt("continue", 0);
            case 17:
              documents = jsonResponse.results.map(function (row) {
                return couchDBDocToRxDocData(collection.schema.primaryPath, ensureNotFalsy(row.doc));
              });
              since = jsonResponse.last_seq;
              pullStream$.next({
                documents: documents,
                checkpoint: {
                  sequence: jsonResponse.last_seq
                }
              });
              _context3.next = 0;
              break;
            case 22:
            case "end":
              return _context3.stop();
          }
        }, _callee3, null, [[3, 11]]);
      }))();
      return startBefore();
    };
  }
  startReplicationOnLeaderShip(options.waitForLeadership, replicationState);
  return replicationState;
}
export var RxDBReplicationCouchDBPlugin = {
  name: 'replication-couchdb',
  init: function init() {
    addRxPlugin(RxDBLeaderElectionPlugin);
  },
  rxdb: true,
  prototypes: {
    RxCollection: function RxCollection(proto) {
      proto.syncCouchDB = syncCouchDB;
    }
  }
};
//# sourceMappingURL=index.js.map