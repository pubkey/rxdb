"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStoragePouch = void 0;
exports.checkPouchAdapter = checkPouchAdapter;
exports.createIndexesOnPouch = createIndexesOnPouch;
exports.getPouchLocation = getPouchLocation;
exports.getRxStoragePouch = getRxStoragePouch;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _util = require("../../util");

var _pouchDb = require("./pouch-db");

var _rxError = require("../../rx-error");

var _rxSchema = require("../../rx-schema");

var _rxStorageInstancePouch = require("./rx-storage-instance-pouch");

var _rxStorageKeyObjectInstancePouch = require("./rx-storage-key-object-instance-pouch");

var _pouchdbHelper = require("./pouchdb-helper");

var RxStoragePouch = /*#__PURE__*/function () {
  function RxStoragePouch(adapter) {
    var pouchSettings = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.name = 'pouchdb';
    this.adapter = adapter;
    this.pouchSettings = pouchSettings;
    checkPouchAdapter(adapter);
  }
  /**
   * create the same diggest as an attachment with that data
   * would have created by pouchdb internally.
   */


  var _proto = RxStoragePouch.prototype;

  _proto.hash = function hash(data) {
    return (0, _pouchdbHelper.pouchHash)(data);
  };

  _proto.createPouch = /*#__PURE__*/function () {
    var _createPouch = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(location, options) {
      var pouchDbParameters, pouchDBOptions, pouch;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              pouchDbParameters = {
                location: location,
                adapter: (0, _util.adapterObject)(this.adapter),
                settings: options
              };
              pouchDBOptions = Object.assign({}, pouchDbParameters.adapter, this.pouchSettings, pouchDbParameters.settings);
              pouch = new _pouchDb.PouchDB(pouchDbParameters.location, pouchDBOptions);
              /**
               * In the past we found some errors where the PouchDB is not directly useable
               * so we we had to call .info() first to ensure it can be used.
               * I commented this out for now to get faster database/collection creation.
               * We might have to add this again if something fails.
               */
              // await pouch.info();

              return _context.abrupt("return", pouch);

            case 4:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    function createPouch(_x, _x2) {
      return _createPouch.apply(this, arguments);
    }

    return createPouch;
  }();

  _proto.createStorageInstance = /*#__PURE__*/function () {
    var _createStorageInstance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(params) {
      var pouchLocation, pouch;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              pouchLocation = getPouchLocation(params.databaseName, params.collectionName, params.schema.version);
              _context2.next = 3;
              return this.createPouch(pouchLocation, params.options);

            case 3:
              pouch = _context2.sent;
              _context2.next = 6;
              return createIndexesOnPouch(pouch, params.schema);

            case 6:
              return _context2.abrupt("return", new _rxStorageInstancePouch.RxStorageInstancePouch(params.databaseName, params.collectionName, params.schema, {
                pouch: pouch
              }, params.options));

            case 7:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    function createStorageInstance(_x3) {
      return _createStorageInstance.apply(this, arguments);
    }

    return createStorageInstance;
  }();

  _proto.createKeyObjectStorageInstance = /*#__PURE__*/function () {
    var _createKeyObjectStorageInstance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(params) {
      var useOptions, pouchLocation, pouch;
      return _regenerator["default"].wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              useOptions = (0, _util.flatClone)(params.options); // no compaction because this only stores local documents

              useOptions.auto_compaction = false;
              useOptions.revs_limit = 1;
              /**
               * TODO shouldnt we use a different location
               * for the local storage? Or at least make sure we
               * reuse the same pouchdb instance?
               */

              pouchLocation = getPouchLocation(params.databaseName, params.collectionName, 0);
              _context3.next = 6;
              return this.createPouch(pouchLocation, params.options);

            case 6:
              pouch = _context3.sent;
              return _context3.abrupt("return", new _rxStorageKeyObjectInstancePouch.RxStorageKeyObjectInstancePouch(params.databaseName, params.collectionName, {
                pouch: pouch
              }, params.options));

            case 8:
            case "end":
              return _context3.stop();
          }
        }
      }, _callee3, this);
    }));

    function createKeyObjectStorageInstance(_x4) {
      return _createKeyObjectStorageInstance.apply(this, arguments);
    }

    return createKeyObjectStorageInstance;
  }();

  return RxStoragePouch;
}();
/**
 * Checks if all is ok with the given adapter,
 * else throws an error.
 */


exports.RxStoragePouch = RxStoragePouch;

function checkPouchAdapter(adapter) {
  if (typeof adapter === 'string') {
    // TODO make a function hasAdapter()
    if (!_pouchDb.PouchDB.adapters || !_pouchDb.PouchDB.adapters[adapter]) {
      throw (0, _rxError.newRxError)('DB9', {
        adapter: adapter
      });
    }
  } else {
    (0, _pouchDb.isLevelDown)(adapter);

    if (!_pouchDb.PouchDB.adapters || !_pouchDb.PouchDB.adapters.leveldb) {
      throw (0, _rxError.newRxError)('DB10', {
        adapter: adapter
      });
    }
  }
}
/**
 * Creates the indexes of the schema inside of the pouchdb instance.
 * Will skip indexes that already exist.
 */


function createIndexesOnPouch(_x5, _x6) {
  return _createIndexesOnPouch.apply(this, arguments);
}
/**
 * returns the pouchdb-database-name
 */


function _createIndexesOnPouch() {
  _createIndexesOnPouch = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5(pouch, schema) {
    var primaryKey, before, existingIndexes;
    return _regenerator["default"].wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            if (schema.indexes) {
              _context5.next = 2;
              break;
            }

            return _context5.abrupt("return");

          case 2:
            primaryKey = (0, _rxSchema.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
            _context5.next = 5;
            return pouch.getIndexes();

          case 5:
            before = _context5.sent;
            existingIndexes = new Set(before.indexes.map(function (idx) {
              return idx.name;
            }));
            _context5.next = 9;
            return Promise.all(schema.indexes.map( /*#__PURE__*/function () {
              var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(indexMaybeArray) {
                var indexArray, indexName;
                return _regenerator["default"].wrap(function _callee4$(_context4) {
                  while (1) {
                    switch (_context4.prev = _context4.next) {
                      case 0:
                        indexArray = Array.isArray(indexMaybeArray) ? indexMaybeArray : [indexMaybeArray];
                        /**
                         * replace primary key with _id
                         * because that is the enforced primary key on pouchdb.
                         */

                        /**
                         * replace primary key with _id
                         * because that is the enforced primary key on pouchdb.
                         */
                        indexArray = indexArray.map(function (key) {
                          if (key === primaryKey) {
                            return '_id';
                          } else {
                            return key;
                          }
                        });
                        indexName = 'idx-rxdb-index-' + indexArray.join(',');

                        if (!existingIndexes.has(indexName)) {
                          _context4.next = 5;
                          break;
                        }

                        return _context4.abrupt("return");

                      case 5:
                        return _context4.abrupt("return", pouch.createIndex({
                          name: indexName,
                          ddoc: indexName,
                          index: {
                            fields: indexArray
                          }
                        }));

                      case 6:
                      case "end":
                        return _context4.stop();
                    }
                  }
                }, _callee4);
              }));

              return function (_x7) {
                return _ref.apply(this, arguments);
              };
            }()));

          case 9:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5);
  }));
  return _createIndexesOnPouch.apply(this, arguments);
}

function getPouchLocation(dbName, collectionName, schemaVersion) {
  var prefix = dbName + '-rxdb-' + schemaVersion + '-';

  if (!collectionName.includes('/')) {
    return prefix + collectionName;
  } else {
    // if collectionName is a path, we have to prefix the last part only
    var split = collectionName.split('/');
    var last = split.pop();
    var ret = split.join('/');
    ret += '/' + prefix + last;
    return ret;
  }
}

function getRxStoragePouch(adapter, pouchSettings) {
  if (!adapter) {
    throw new Error('adapter missing');
  }

  var storage = new RxStoragePouch(adapter, pouchSettings);
  return storage;
}
//# sourceMappingURL=rx-storage-pouchdb.js.map