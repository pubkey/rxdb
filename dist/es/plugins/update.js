import _regeneratorRuntime from "@babel/runtime/regenerator";
import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";

/**
 * this plugin allows delta-updates with mongo-like-syntax
 * It's using modifyjs internally
 * @link https://github.com/lgandecki/modifyjs
 */
import modifyjs from 'modifyjs';
import { clone } from '../util.js';
export function update(updateObj) {
  var oldDocData = clone(this._data);
  var newDocData = modifyjs(oldDocData, updateObj);
  return this._saveData(newDocData, oldDocData);
}
export function RxQueryUpdate(_x) {
  return _RxQueryUpdate.apply(this, arguments);
}

function _RxQueryUpdate() {
  _RxQueryUpdate = _asyncToGenerator(
  /*#__PURE__*/
  _regeneratorRuntime.mark(function _callee(updateObj) {
    var docs;
    return _regeneratorRuntime.wrap(function _callee$(_context) {
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

export var rxdb = true;
export var prototypes = {
  RxDocument: function RxDocument(proto) {
    proto.update = update;
  },
  RxQuery: function RxQuery(proto) {
    proto.update = RxQueryUpdate;
  }
};
export default {
  rxdb: rxdb,
  prototypes: prototypes
};