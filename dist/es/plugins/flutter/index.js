import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
export function setFlutterRxDatabaseConnector(createDB) {
  process.init = /*#__PURE__*/function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(databaseName) {
      var db, collections;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return createDB(databaseName);
          case 2:
            db = _context.sent;
            db.eventBulks$.subscribe(function (eventBulk) {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              sendRxDBEvent(JSON.stringify(eventBulk));
            });
            process.db = db;
            collections = [];
            Object.entries(db.collections).forEach(function (_ref2) {
              var collectionName = _ref2[0],
                collection = _ref2[1];
              collections.push({
                name: collectionName,
                primaryKey: collection.schema.primaryPath
              });
            });
            return _context.abrupt("return", {
              databaseName: databaseName,
              collections: collections
            });
          case 8:
          case "end":
            return _context.stop();
        }
      }, _callee);
    }));
    return function (_x) {
      return _ref.apply(this, arguments);
    };
  }();
}

/**
 * Create a simple lokijs adapter so that we can persist string via flutter
 * @link https://github.com/techfort/LokiJS/blob/master/tutorials/Persistence%20Adapters.md#creating-your-own-basic-persistence-adapter
 */
export function getLokijsAdapterFlutter() {
  var ret = {
    loadDatabase: function () {
      var _loadDatabase = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(databaseName, callback) {
        var serializedDb, success;
        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return readKeyValue(databaseName);
            case 2:
              serializedDb = _context2.sent;
              success = true;
              if (success) {
                callback(serializedDb);
              } else {
                callback(new Error('There was a problem loading the database'));
              }
            case 5:
            case "end":
              return _context2.stop();
          }
        }, _callee2);
      }));
      function loadDatabase(_x2, _x3) {
        return _loadDatabase.apply(this, arguments);
      }
      return loadDatabase;
    }(),
    saveDatabase: function () {
      var _saveDatabase = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(databaseName, dbstring, callback) {
        var success;
        return _regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) switch (_context3.prev = _context3.next) {
            case 0:
              _context3.next = 2;
              return persistKeyValue(databaseName, dbstring);
            case 2:
              success = true; // make your own determinations
              if (success) {
                callback(null);
              } else {
                callback(new Error('An error was encountered loading " + dbname + " database.'));
              }
            case 4:
            case "end":
              return _context3.stop();
          }
        }, _callee3);
      }));
      function saveDatabase(_x4, _x5, _x6) {
        return _saveDatabase.apply(this, arguments);
      }
      return saveDatabase;
    }()
  };
  return ret;
}
//# sourceMappingURL=index.js.map