import _regeneratorRuntime from "@babel/runtime/regenerator";
import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";

/**
 * this plugin adds the checkAdapter-function to rxdb
 * you can use it to check if the given adapter is working in the current environmet
 */
import PouchDB from '../pouch-db';
import { generateId, adapterObject } from '../util';
/**
 * The same pouchdb-location is used on each run
 * To ensure when this is run multiple times,
 * there will not be many created databases
 */

export var POUCHDB_LOCATION = 'rxdb-adapter-check';
export function checkAdapter(_x) {
  return _checkAdapter.apply(this, arguments);
}

function _checkAdapter() {
  _checkAdapter = _asyncToGenerator(
  /*#__PURE__*/
  _regeneratorRuntime.mark(function _callee(adapter) {
    var _id, recoveredDoc, pouch;

    return _regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            // id of the document which is stored and removed to ensure everything works
            _id = POUCHDB_LOCATION + '-' + generateId();
            recoveredDoc = null;
            _context.prev = 2;
            pouch = new PouchDB(POUCHDB_LOCATION, adapterObject(adapter), {
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

export var rxdb = true;
export var prototypes = {};
export var overwritable = {
  checkAdapter: checkAdapter
};
export default {
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable
};