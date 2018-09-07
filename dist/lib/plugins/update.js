"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.update = update;
exports.RxQueryUpdate = RxQueryUpdate;
exports["default"] = exports.prototypes = exports.rxdb = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _modifyjs = _interopRequireDefault(require("modifyjs"));

var _util = require("../util.js");

/**
 * this plugin allows delta-updates with mongo-like-syntax
 * It's using modifyjs internally
 * @link https://github.com/lgandecki/modifyjs
 */
function update(updateObj) {
  var oldDocData = (0, _util.clone)(this._data);
  var newDocData = (0, _modifyjs["default"])(oldDocData, updateObj);
  return this._saveData(newDocData, oldDocData);
}

function RxQueryUpdate(_x) {
  return _RxQueryUpdate.apply(this, arguments);
}

function _RxQueryUpdate() {
  _RxQueryUpdate = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee(updateObj) {
    var docs;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return this.exec();

          case 2:
            docs = _context.sent;

            if (docs) {
              _context.next = 5;
              break;
            }

            return _context.abrupt("return", null);

          case 5:
            if (!Array.isArray(docs)) {
              _context.next = 10;
              break;
            }

            _context.next = 8;
            return Promise.all(docs.map(function (doc) {
              return doc.update(updateObj);
            }));

          case 8:
            _context.next = 12;
            break;

          case 10:
            _context.next = 12;
            return docs.update(updateObj);

          case 12:
            return _context.abrupt("return", docs);

          case 13:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, this);
  }));
  return _RxQueryUpdate.apply(this, arguments);
}

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  RxDocument: function RxDocument(proto) {
    proto.update = update;
  },
  RxQuery: function RxQuery(proto) {
    proto.update = RxQueryUpdate;
  }
};
exports.prototypes = prototypes;
var _default = {
  rxdb: rxdb,
  prototypes: prototypes
};
exports["default"] = _default;
