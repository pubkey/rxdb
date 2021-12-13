"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStoragePouchStatics = exports.RxStoragePouch = void 0;
exports.checkPouchAdapter = checkPouchAdapter;
exports.createIndexesOnPouch = createIndexesOnPouch;
exports.getPouchLocation = getPouchLocation;
exports.getRxStoragePouch = getRxStoragePouch;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _util = require("../../util");

var _pouchDb = require("./pouch-db");

var _pouchdbSelectorCore = require("pouchdb-selector-core");

var _rxError = require("../../rx-error");

var _rxSchema = require("../../rx-schema");

var _rxStorageInstancePouch = require("./rx-storage-instance-pouch");

var _rxStorageKeyObjectInstancePouch = require("./rx-storage-key-object-instance-pouch");

var _pouchdbHelper = require("./pouchdb-helper");

var _rxSchemaHelper = require("../../rx-schema-helper");

var RxStoragePouchStatics = {
  /**
   * create the same diggest as an attachment with that data
   * would have created by pouchdb internally.
   */
  hash: function hash(data) {
    return (0, _pouchdbHelper.pouchHash)(data);
  },
  getSortComparator: function getSortComparator(schema, query) {
    var _ref;

    var primaryPath = (0, _rxSchema.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
    var sortOptions = query.sort ? query.sort : [(_ref = {}, _ref[primaryPath] = 'asc', _ref)];
    var inMemoryFields = Object.keys(query.selector).filter(function (key) {
      return !key.startsWith('$');
    });

    var fun = function fun(a, b) {
      /**
       * Sorting on two documents with the same primary is not allowed
       * because it might end up in a non-deterministic result.
       */
      if (a[primaryPath] === b[primaryPath]) {
        throw (0, _rxError.newRxError)('SNH', {
          args: {
            a: a,
            b: b
          },
          primaryPath: primaryPath
        });
      } // TODO use createFieldSorter
      // TODO make a performance test


      var rows = [a, b].map(function (doc) {
        return {
          doc: (0, _pouchdbHelper.pouchSwapPrimaryToId)(primaryPath, doc)
        };
      });
      var sortedRows = (0, _pouchdbSelectorCore.filterInMemoryFields)(rows, {
        selector: {},
        sort: sortOptions
      }, inMemoryFields);

      if (sortedRows.length !== 2) {
        throw (0, _rxError.newRxError)('SNH', {
          query: query,
          primaryPath: primaryPath,
          args: {
            rows: rows,
            sortedRows: sortedRows
          }
        });
      }

      if (sortedRows[0].doc._id === rows[0].doc._id) {
        return -1;
      } else {
        return 1;
      }
    };

    return fun;
  },

  /**
   * @link https://github.com/pouchdb/pouchdb/blob/master/packages/node_modules/pouchdb-selector-core/src/matches-selector.js
   */
  getQueryMatcher: function getQueryMatcher(schema, query) {
    var primaryPath = (0, _rxSchema.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
    var massagedSelector = (0, _pouchdbSelectorCore.massageSelector)(query.selector);

    var fun = function fun(doc) {
      var cloned = (0, _pouchdbHelper.pouchSwapPrimaryToId)(primaryPath, doc);
      var row = {
        doc: cloned
      };
      var rowsMatched = (0, _pouchdbSelectorCore.filterInMemoryFields)([row], {
        selector: massagedSelector
      }, Object.keys(query.selector));
      var ret = rowsMatched && rowsMatched.length === 1;
      return ret;
    };

    return fun;
  },

  /**
   * pouchdb has many bugs and strange behaviors
   * this functions takes a normal mango query
   * and transforms it to one that fits for pouchdb
   */
  prepareQuery: function prepareQuery(schema, mutateableQuery) {
    var primaryKey = (0, _rxSchema.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
    var query = mutateableQuery;
    /**
     * because sort wont work on unused keys we have to workaround
     * so we add the key to the selector if necessary
     * @link https://github.com/nolanlawson/pouchdb-find/issues/204
     */

    if (query.sort) {
      query.sort.forEach(function (sortPart) {
        var key = Object.keys(sortPart)[0];
        var comparisonOperators = ['$gt', '$gte', '$lt', '$lte'];
        var keyUsed = query.selector[key] && Object.keys(query.selector[key]).some(function (op) {
          return comparisonOperators.includes(op);
        }) || false;

        if (!keyUsed) {
          var schemaObj = (0, _rxSchemaHelper.getSchemaByObjectPath)(schema, key);

          if (!schemaObj) {
            throw (0, _rxError.newRxError)('QU5', {
              query: query,
              key: key,
              schema: schema
            });
          }

          if (!query.selector[key]) {
            query.selector[key] = {};
          }

          switch (schemaObj.type) {
            case 'number':
            case 'integer':
              // TODO change back to -Infinity when issue resolved
              // @link https://github.com/pouchdb/pouchdb/issues/6454
              // -Infinity does not work since pouchdb 6.2.0
              query.selector[key].$gt = -9999999999999999999999999999;
              break;

            case 'string':
              /**
               * strings need an empty string, see
               * @link https://github.com/pubkey/rxdb/issues/585
               */
              if (typeof query.selector[key] !== 'string') {
                query.selector[key].$gt = '';
              }

              break;

            default:
              query.selector[key].$gt = null;
              break;
          }
        }
      });
    } // regex does not work over the primary key
    // TODO move this to dev mode


    if (query.selector[primaryKey] && query.selector[primaryKey].$regex) {
      throw (0, _rxError.newRxError)('QU4', {
        path: primaryKey,
        query: mutateableQuery
      });
    } // primary-swap sorting


    if (query.sort) {
      var sortArray = query.sort.map(function (part) {
        var _newPart;

        var key = Object.keys(part)[0];
        var direction = Object.values(part)[0];
        var useKey = key === primaryKey ? '_id' : key;
        var newPart = (_newPart = {}, _newPart[useKey] = direction, _newPart);
        return newPart;
      });
      query.sort = sortArray;
    } // strip empty selectors


    Object.entries(query.selector).forEach(function (_ref2) {
      var k = _ref2[0],
          v = _ref2[1];

      if (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length === 0) {
        delete query.selector[k];
      }
    });
    query.selector = (0, _pouchdbHelper.primarySwapPouchDbQuerySelector)(query.selector, primaryKey);
    /**
     * To ensure a deterministic sorting,
     * we have to ensure the primary key is always part
     * of the sort query.
     * TODO This should be done but will not work with pouchdb
     * because it will throw
     * 'Cannot sort on field(s) "key" when using the default index'
     * So we likely have to modify the indexes so that this works. 
     */

    /*
    if (!mutateableQuery.sort) {
        mutateableQuery.sort = [{ [this.primaryPath]: 'asc' }] as any;
    } else {
        const isPrimaryInSort = mutateableQuery.sort
            .find(p => firstPropertyNameOfObject(p) === this.primaryPath);
        if (!isPrimaryInSort) {
            mutateableQuery.sort.push({ [this.primaryPath]: 'asc' } as any);
        }
    }
    */

    return query;
  }
};
exports.RxStoragePouchStatics = RxStoragePouchStatics;

var RxStoragePouch = /*#__PURE__*/function () {
  function RxStoragePouch(adapter) {
    var pouchSettings = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.name = 'pouchdb';
    this.statics = RxStoragePouchStatics;
    this.adapter = adapter;
    this.pouchSettings = pouchSettings;
    checkPouchAdapter(adapter);
  }

  var _proto = RxStoragePouch.prototype;

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
              var _ref3 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(indexMaybeArray) {
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
                return _ref3.apply(this, arguments);
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