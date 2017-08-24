'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.prototypes = exports.rxdb = exports.RxQuery_update = exports.update = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

/**
 * this plugin allows delta-updates with mongo-like-syntax
 * It's using modifyjs internally
 * @link https://github.com/lgandecki/modifyjs
 */
var update = exports.update = function () {
    var _ref = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee(updateObj) {
        var _this = this;

        var newDoc;
        return _regenerator2['default'].wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        newDoc = (0, _modifyjs2['default'])(this._data, updateObj);


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
                        _context.next = 7;
                        return this.save();

                    case 7:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function update(_x) {
        return _ref.apply(this, arguments);
    };
}();

var RxQuery_update = exports.RxQuery_update = function () {
    var _ref2 = (0, _asyncToGenerator3['default'])( /*#__PURE__*/_regenerator2['default'].mark(function _callee2(updateObj) {
        var docs;
        return _regenerator2['default'].wrap(function _callee2$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        _context2.next = 2;
                        return this.exec();

                    case 2:
                        docs = _context2.sent;

                        if (docs) {
                            _context2.next = 5;
                            break;
                        }

                        return _context2.abrupt('return', null);

                    case 5:
                        if (!Array.isArray(docs)) {
                            _context2.next = 10;
                            break;
                        }

                        _context2.next = 8;
                        return Promise.all(docs.map(function (doc) {
                            return doc.update(updateObj);
                        }));

                    case 8:
                        _context2.next = 12;
                        break;

                    case 10:
                        _context2.next = 12;
                        return docs.update(updateObj);

                    case 12:
                        return _context2.abrupt('return', docs);

                    case 13:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, _callee2, this);
    }));

    return function RxQuery_update(_x2) {
        return _ref2.apply(this, arguments);
    };
}();

var _modifyjs = require('modifyjs');

var _modifyjs2 = _interopRequireDefault(_modifyjs);

var _deepEqual = require('deep-equal');

var _deepEqual2 = _interopRequireDefault(_deepEqual);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var rxdb = exports.rxdb = true;
var prototypes = exports.prototypes = {
    RxDocument: function RxDocument(proto) {
        proto.update = update;
    },
    RxQuery: function RxQuery(proto) {
        proto.update = RxQuery_update;
    }
};

exports['default'] = {
    rxdb: rxdb,
    prototypes: prototypes
};
