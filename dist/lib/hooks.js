"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.runAsyncPluginHooks = exports.HOOKS = undefined;

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var runAsyncPluginHooks = exports.runAsyncPluginHooks = function () {
  var _ref = (0, _asyncToGenerator3["default"])( /*#__PURE__*/_regenerator2["default"].mark(function _callee(hookKey, obj) {
    return _regenerator2["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            return _context.abrupt("return", Promise.all(HOOKS[hookKey].map(function (fun) {
              return fun(obj);
            })));

          case 1:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function runAsyncPluginHooks(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

exports.runPluginHooks = runPluginHooks;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * stores the hooks that where added by the plugins
 */

/**
 * hook-functions that can be extended by the plugin
 */
var HOOKS = exports.HOOKS = {
  createRxDatabase: [],
  createRxCollection: [],
  /**
   * functions that get the json-schema as input
   * to do additionally checks/manipulation
   */
  preCreateRxSchema: [],
  /**
   * functions that run after the RxSchema is created
   * gets RxSchema as attribute
   */
  createRxSchema: [],
  createRxQuery: [],
  createRxDocument: [],
  /**
   * runs after a RxDocument is created,
   * async
   * @type {Array}
   */
  postCreateRxDocument: [],
  /**
   * runs before a pouchdb-instance is created
   * gets pouchParameters as attribute so you can manipulate them
   * {
   *   location: string,
   *   adapter: any,
   *   settings: object
   * }
   * @type {Array}
   */
  preCreatePouchDb: [],
  /**
   * runs on the document-data before the document is migrated
   * {
   *   doc: Object, // originam doc-data
   *   migrated: // migrated doc-data after run throught migration-strategies
   * }
   * @type {Array}
   */
  preMigrateDocument: [],
  /**
   * runs after the migration of a document has been done
   * @type {Array}
   */
  postMigrateDocument: []
};

function runPluginHooks(hookKey, obj) {
  HOOKS[hookKey].forEach(function (fun) {
    return fun(obj);
  });
}

;

exports["default"] = {
  runPluginHooks: runPluginHooks,
  runAsyncPluginHooks: runAsyncPluginHooks,
  HOOKS: HOOKS
};
