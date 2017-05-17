'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.RxDatabase = exports.QueryChangeDetector = exports.PouchDB = exports.RxSchema = exports.create = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/**
 * create a database
 * @param  {string} prefix as databaseName for the storage (this can be the foldername)
 * @param  {Object} storageEngine any leveldown instance
 * @param  {String} password if the database contains encrypted fields
 * @param  {boolean} multiInstance if true, multiInstance-handling will be done
 * @return {Promise<Database>}
 */
var create = exports.create = function () {
    var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(args) {
        return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        return _context.abrupt('return', RxDatabase.create(args));

                    case 1:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function create(_x) {
        return _ref.apply(this, arguments);
    };
}();

exports.plugin = plugin;

var _RxDatabase = require('./RxDatabase');

var RxDatabase = _interopRequireWildcard(_RxDatabase);

var _RxSchema = require('./RxSchema');

var RxSchema = _interopRequireWildcard(_RxSchema);

var _QueryChangeDetector = require('./QueryChangeDetector');

var QueryChangeDetector = _interopRequireWildcard(_QueryChangeDetector);

var _PouchDB = require('./PouchDB');

var _PouchDB2 = _interopRequireDefault(_PouchDB);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function plugin(mod) {
    if ((typeof mod === 'undefined' ? 'undefined' : _typeof(mod)) === 'object' && mod.default) mod = mod.default;
    _PouchDB2.default.plugin(mod);
}

exports.RxSchema = RxSchema;
exports.PouchDB = _PouchDB2.default;
exports.QueryChangeDetector = QueryChangeDetector;
exports.RxDatabase = RxDatabase;
