"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStoragePouchStatics = void 0;
exports.preparePouchDbQuery = preparePouchDbQuery;

var _pouchdbSelectorCore = require("pouchdb-selector-core");

var _rxError = require("../../rx-error");

var _pouchdbHelper = require("./pouchdb-helper");

var _rxSchemaHelper = require("../../rx-schema-helper");

var _overwritable = require("../../overwritable");

var _util = require("../../util");

var RxStoragePouchStatics = {
  /**
   * create the same diggest as an attachment with that data
   * would have created by pouchdb internally.
   */
  hash: function hash(data) {
    return (0, _pouchdbHelper.pouchHash)(data);
  },
  hashKey: 'md5',
  getSortComparator: function getSortComparator(schema, query) {
    var _ref;

    var primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
    var sortOptions = query.sort ? query.sort : [(_ref = {}, _ref[primaryPath] = 'asc', _ref)];
    var selector = query.selector ? query.selector : {};
    var inMemoryFields = Object.keys(selector).filter(function (key) {
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
    var primaryPath = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
    var selector = query.selector ? query.selector : {};
    var massagedSelector = (0, _pouchdbSelectorCore.massageSelector)(selector);

    var fun = function fun(doc) {
      if (doc._deleted) {
        return false;
      }

      var cloned = (0, _pouchdbHelper.pouchSwapPrimaryToId)(primaryPath, doc);
      var row = {
        doc: cloned
      };
      var rowsMatched = (0, _pouchdbSelectorCore.filterInMemoryFields)([row], {
        selector: massagedSelector
      }, Object.keys(selector));
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
    return preparePouchDbQuery(schema, mutateableQuery);
  }
};
/**
     * pouchdb has many bugs and strange behaviors
     * this functions takes a normal mango query
     * and transforms it to one that fits for pouchdb
     */

exports.RxStoragePouchStatics = RxStoragePouchStatics;

function preparePouchDbQuery(schema, mutateableQuery) {
  var primaryKey = (0, _rxSchemaHelper.getPrimaryFieldOfPrimaryKey)(schema.primaryKey);
  var query = mutateableQuery;
  /**
   * because sort wont work on unused keys we have to workaround
   * so we add the key to the selector if necessary
   * @link https://github.com/nolanlawson/pouchdb-find/issues/204
   */

  if (query.sort) {
    query.sort.forEach(function (sortPart) {
      var key = Object.keys(sortPart)[0];
      var comparisonOperators = ['$gt', '$gte', '$lt', '$lte', '$eq'];
      var keyUsed = query.selector && query.selector[key] && Object.keys(query.selector[key]).some(function (op) {
        return comparisonOperators.includes(op);
      });

      if (!keyUsed) {
        var schemaObj = (0, _rxSchemaHelper.getSchemaByObjectPath)(schema, key);

        if (!schemaObj) {
          throw (0, _rxError.newRxError)('QU5', {
            query: query,
            key: key,
            schema: schema
          });
        }

        if (!query.selector) {
          query.selector = {};
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


  if (_overwritable.overwritable.isDevMode() && query.selector && query.selector[primaryKey] && query.selector[primaryKey].$regex) {
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


  Object.entries((0, _util.ensureNotFalsy)(query.selector)).forEach(function (_ref2) {
    var k = _ref2[0],
        v = _ref2[1];

    if (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length === 0) {
      delete (0, _util.ensureNotFalsy)(query.selector)[k];
    }
  });
  /**
   * Set use_index
   * @link https://pouchdb.com/guides/mango-queries.html#use_index
   */

  if (mutateableQuery.index) {
    var indexMaybeArray = mutateableQuery.index;
    var indexArray = (0, _util.isMaybeReadonlyArray)(indexMaybeArray) ? indexMaybeArray : [indexMaybeArray];
    indexArray = indexArray.map(function (str) {
      if (str === primaryKey) {
        return '_id';
      } else {
        return str;
      }
    });
    var indexName = (0, _pouchdbHelper.getPouchIndexDesignDocNameByIndex)(indexArray);
    delete mutateableQuery.index;
    mutateableQuery.use_index = indexName;
  }

  query.selector = (0, _pouchdbHelper.primarySwapPouchDbQuerySelector)(query.selector, primaryKey);
  return query;
}
//# sourceMappingURL=pouch-statics.js.map