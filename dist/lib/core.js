"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.isRxSchema = exports.isRxQuery = exports.isRxDocument = exports.isRxCollection = exports.dbCount = exports.isRxDatabase = exports.plugin = exports.checkAdapter = exports.removeDatabase = exports.create = void 0;

var _rxDatabase = _interopRequireDefault(require("./rx-database"));

var _rxSchema = _interopRequireDefault(require("./rx-schema"));

var _rxDocument = _interopRequireDefault(require("./rx-document"));

var _rxQuery = _interopRequireDefault(require("./rx-query"));

var _rxCollection = _interopRequireDefault(require("./rx-collection"));

var _queryChangeDetector = _interopRequireDefault(require("./query-change-detector"));

var _plugin = _interopRequireDefault(require("./plugin"));

var _pouchDb = _interopRequireDefault(require("./pouch-db"));

/**
 * this is the main entry-point for custom builds
 * it can be used as standalone but is also used in the batteries-included main-export
 */
var create = _rxDatabase["default"].create;
exports.create = create;
var removeDatabase = _rxDatabase["default"].removeDatabase;
exports.removeDatabase = removeDatabase;
var checkAdapter = _rxDatabase["default"].checkAdapter;
exports.checkAdapter = checkAdapter;
var plugin = _plugin["default"].addPlugin;
exports.plugin = plugin;
var isRxDatabase = _rxDatabase["default"].isInstanceOf;
exports.isRxDatabase = isRxDatabase;
var dbCount = _rxDatabase["default"].dbCount;
exports.dbCount = dbCount;
var isRxCollection = _rxCollection["default"].isInstanceOf;
exports.isRxCollection = isRxCollection;
var isRxDocument = _rxDocument["default"].isInstanceOf;
exports.isRxDocument = isRxDocument;
var isRxQuery = _rxQuery["default"].isInstanceOf;
exports.isRxQuery = isRxQuery;
var isRxSchema = _rxSchema["default"].isInstanceOf;
exports.isRxSchema = isRxSchema;
var _default = {
  create: create,
  removeDatabase: removeDatabase,
  checkAdapter: checkAdapter,
  plugin: plugin,
  dbCount: dbCount,
  isRxDatabase: isRxDatabase,
  isRxCollection: isRxCollection,
  isRxDocument: isRxDocument,
  isRxQuery: isRxQuery,
  isRxSchema: isRxSchema,
  RxSchema: _rxSchema["default"],
  PouchDB: _pouchDb["default"],
  QueryChangeDetector: _queryChangeDetector["default"],
  RxDatabase: _rxDatabase["default"]
};
exports["default"] = _default;
