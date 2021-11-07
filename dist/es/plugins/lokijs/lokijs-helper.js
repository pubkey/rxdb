import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import lokijs from 'lokijs';
import { add as unloadAdd } from 'unload';
import { flatClone } from '../../util';
export var CHANGES_COLLECTION_SUFFIX = '-rxdb-changes';
export var CHANGES_LOCAL_SUFFIX = '-rxdb-local';
export var LOKI_BROADCAST_CHANNEL_MESSAGE_TYPE = 'rxdb-lokijs-remote-request';
export var LOKI_KEY_OBJECT_BROADCAST_CHANNEL_MESSAGE_TYPE = 'rxdb-lokijs-remote-request-key-object';
/**
 * Loki attaches a $loki property to all data
 * which must be removed before returning the data back to RxDB.
 */

export function stripLokiKey(docData) {
  var cloned = flatClone(docData);
  delete cloned.$loki;
  return cloned;
}
export function getLokiEventKey(isLocal, primary, revision) {
  var prefix = isLocal ? 'local' : 'non-local';
  var eventKey = prefix + '|' + primary + '|' + revision;
  return eventKey;
}
/**
 * Used to check in tests if all instances have been cleaned up.
 */

export var OPEN_LOKIJS_STORAGE_INSTANCES = new Set();
export var LOKIJS_COLLECTION_DEFAULT_OPTIONS = {
  disableChangesApi: true,
  disableMeta: true,
  disableDeltaChangesApi: true,
  disableFreeze: true,
  // TODO use 'immutable' like WatermelonDB does it
  cloneMethod: 'shallow-assign',
  clone: false,
  transactional: false,
  autoupdate: false
};
var LOKI_DATABASE_STATE_BY_NAME = new Map();
export function getLokiDatabase(databaseName, databaseSettings) {
  var databaseState = LOKI_DATABASE_STATE_BY_NAME.get(databaseName);

  if (!databaseState) {
    /**
     * We assume that as soon as an adapter is passed,
     * the database has to be persistend.
     */
    var hasPersistence = !!databaseSettings.adapter;
    databaseState = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee() {
      var persistenceMethod, useSettings, database, state;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              persistenceMethod = hasPersistence ? 'adapter' : 'memory';

              if (databaseSettings.persistenceMethod) {
                persistenceMethod = databaseSettings.persistenceMethod;
              }

              useSettings = Object.assign( // defaults
              {
                autoload: hasPersistence,
                autosave: hasPersistence,
                persistenceMethod: persistenceMethod,
                autosaveInterval: hasPersistence ? 500 : undefined,
                verbose: true,
                throttledSaves: false,
                // TODO remove this log
                autosaveCallback: hasPersistence ? function () {
                  return console.log('LokiJS autosave done!');
                } : undefined
              }, databaseSettings);
              console.log('useSettings:');
              console.dir(flatClone(useSettings));
              database = new lokijs(databaseName + '.db', useSettings); // Wait until all data is load from persistence adapter.

              if (!hasPersistence) {
                _context.next = 9;
                break;
              }

              _context.next = 9;
              return new Promise(function (res, rej) {
                database.loadDatabase({}, function (err) {
                  err ? rej(err) : res();
                });
              });

            case 9:
              /**
               * Autosave database on process end
               */
              if (hasPersistence) {
                unloadAdd(function () {
                  return database.saveDatabase();
                });
              }

              state = {
                database: database,
                openCollections: {}
              };
              return _context.abrupt("return", state);

            case 12:
            case "end":
              return _context.stop();
          }
        }
      }, _callee);
    }))();
    LOKI_DATABASE_STATE_BY_NAME.set(databaseName, databaseState);
  }

  return databaseState;
}
export function closeLokiCollections(_x, _x2) {
  return _closeLokiCollections.apply(this, arguments);
}

function _closeLokiCollections() {
  _closeLokiCollections = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(databaseName, collections) {
    var databaseState;
    return _regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return LOKI_DATABASE_STATE_BY_NAME.get(databaseName);

          case 2:
            databaseState = _context2.sent;

            if (databaseState) {
              _context2.next = 5;
              break;
            }

            return _context2.abrupt("return");

          case 5:
            collections.forEach(function (collection) {
              var collectionName = collection.name;
              delete databaseState.openCollections[collectionName];
            });

            if (!(Object.keys(databaseState.openCollections).length === 0)) {
              _context2.next = 10;
              break;
            }

            // all collections closed -> also close database
            LOKI_DATABASE_STATE_BY_NAME["delete"](databaseName);
            _context2.next = 10;
            return new Promise(function (res, rej) {
              databaseState.database.close(function (err) {
                err ? rej(err) : res();
              });
            });

          case 10:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _closeLokiCollections.apply(this, arguments);
}
//# sourceMappingURL=lokijs-helper.js.map