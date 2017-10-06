'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.overwritable = exports.prototypes = exports.rxdb = exports.checkAdapter = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

/**
 * this plugin adds the checkAdapter-function to rxdb
 * you can use it to check if the given adapter is working in the current environmet
 */
var checkAdapter = exports.checkAdapter = function () {
    var _ref = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee(adapter) {
        var id, recoveredDoc, pouch;
        return _regenerator2['default'].wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        id = 'rxdb-test-adapter-' + util.generateId();
                        recoveredDoc = null;
                        pouch = void 0;
                        _context.prev = 3;

                        pouch = new _pouchDb2['default'](id, util.adapterObject(adapter), {
                            auto_compaction: false, // no compaction because this only stores local documents
                            revs_limit: 1
                        });
                        _context.next = 7;
                        return pouch.info();

                    case 7:
                        _context.next = 9;
                        return pouch.put({
                            _id: id,
                            value: true
                        });

                    case 9:
                        _context.next = 11;
                        return pouch.get(id);

                    case 11:
                        recoveredDoc = _context.sent;
                        _context.next = 17;
                        break;

                    case 14:
                        _context.prev = 14;
                        _context.t0 = _context['catch'](3);
                        return _context.abrupt('return', false);

                    case 17:
                        _context.prev = 17;
                        _context.next = 20;
                        return pouch.destroy();

                    case 20:
                        _context.next = 24;
                        break;

                    case 22:
                        _context.prev = 22;
                        _context.t1 = _context['catch'](17);

                    case 24:
                        if (!(recoveredDoc && recoveredDoc.value)) {
                            _context.next = 28;
                            break;
                        }

                        return _context.abrupt('return', true);

                    case 28:
                        return _context.abrupt('return', false);

                    case 29:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this, [[3, 14], [17, 22]]);
    }));

    return function checkAdapter(_x) {
        return _ref.apply(this, arguments);
    };
}();

var _pouchDb = require('../pouch-db');

var _pouchDb2 = _interopRequireDefault(_pouchDb);

var _util = require('../util');

var util = _interopRequireWildcard(_util);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var rxdb = exports.rxdb = true;
var prototypes = exports.prototypes = {};
var overwritable = exports.overwritable = {
    checkAdapter: checkAdapter
};

exports['default'] = {
    rxdb: rxdb,
    prototypes: prototypes,
    overwritable: overwritable
};
