"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkAdapter = checkAdapter;
exports["default"] = exports.overwritable = exports.prototypes = exports.rxdb = exports.POUCHDB_LOCATION = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _pouchDb = _interopRequireDefault(require("../pouch-db"));

var _util = require("../util");

/**
 * this plugin adds the checkAdapter-function to rxdb
 * you can use it to check if the given adapter is working in the current environmet
 */

/**
 * The same pouchdb-location is used on each run
 * To ensure when this is run multiple times,
 * there will not be many created databases
 */
var POUCHDB_LOCATION = 'rxdb-adapter-check';
exports.POUCHDB_LOCATION = POUCHDB_LOCATION;

function checkAdapter(_x) {
  return _checkAdapter.apply(this, arguments);
}

function _checkAdapter() {
  _checkAdapter = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee(adapter) {
    var _id, recoveredDoc, pouch;

    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            // id of the document which is stored and removed to ensure everything works
            _id = POUCHDB_LOCATION + '-' + (0, _util.generateId)();
            recoveredDoc = null;
            _context.prev = 2;
            pouch = new _pouchDb["default"](POUCHDB_LOCATION, (0, _util.adapterObject)(adapter), {
              auto_compaction: true,
              revs_limit: 1
            });
            _context.next = 6;
            return pouch.info();

          case 6:
            _context.next = 8;
            return pouch.put({
              _id: _id,
              value: {
                ok: true,
                time: new Date().getTime()
              }
            });

          case 8:
            _context.next = 10;
            return pouch.get(_id);

          case 10:
            recoveredDoc = _context.sent;
            _context.next = 13;
            return pouch.remove(recoveredDoc);

          case 13:
            _context.next = 18;
            break;

          case 15:
            _context.prev = 15;
            _context.t0 = _context["catch"](2);
            return _context.abrupt("return", false);

          case 18:
            if (!(recoveredDoc && recoveredDoc.value && recoveredDoc.value.ok)) {
              _context.next = 22;
              break;
            }

            return _context.abrupt("return", true);

          case 22:
            return _context.abrupt("return", false);

          case 23:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, this, [[2, 15]]);
  }));
  return _checkAdapter.apply(this, arguments);
}

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {};
exports.prototypes = prototypes;
var overwritable = {
  checkAdapter: checkAdapter
};
exports.overwritable = overwritable;
var _default = {
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable
};
exports["default"] = _default;
