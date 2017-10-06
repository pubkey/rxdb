'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.prototypes = exports.rxdb = exports.RxQueryUpdate = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var RxQueryUpdate = exports.RxQueryUpdate = function () {
    var _ref = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee(updateObj) {
        var docs;
        return _regenerator2['default'].wrap(function _callee$(_context) {
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

                        return _context.abrupt('return', null);

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
                        return _context.abrupt('return', docs);

                    case 13:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function RxQueryUpdate(_x) {
        return _ref.apply(this, arguments);
    };
}();

exports.update = update;

var _modifyjs = require('modifyjs');

var _modifyjs2 = _interopRequireDefault(_modifyjs);

var _deepEqual = require('deep-equal');

var _deepEqual2 = _interopRequireDefault(_deepEqual);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * this plugin allows delta-updates with mongo-like-syntax
 * It's using modifyjs internally
 * @link https://github.com/lgandecki/modifyjs
 */
function update(updateObj) {
    var _this = this;

    var newDoc = (0, _modifyjs2['default'])(this._data, updateObj);

    Object.keys(this._data).forEach(function (previousPropName) {
        if (newDoc[previousPropName]) {
            // if we don't check inequality, it triggers an update attempt on fields that didn't really change,
            // which causes problems with "readonly" fields
            if (!(0, _deepEqual2['default'])(_this._data[previousPropName], newDoc[previousPropName])) _this._data[previousPropName] = newDoc[previousPropName];
        } else delete _this._data[previousPropName];
    });
    delete newDoc._rev;
    delete newDoc._id;
    Object.keys(newDoc).filter(function (newPropName) {
        return !(0, _deepEqual2['default'])(_this._data[newPropName], newDoc[newPropName]);
    }).forEach(function (newPropName) {
        return _this._data[newPropName] = newDoc[newPropName];
    });

    return this.save();
}

var rxdb = exports.rxdb = true;
var prototypes = exports.prototypes = {
    RxDocument: function RxDocument(proto) {
        proto.update = update;
    },
    RxQuery: function RxQuery(proto) {
        proto.update = RxQueryUpdate;
    }
};

exports['default'] = {
    rxdb: rxdb,
    prototypes: prototypes
};
