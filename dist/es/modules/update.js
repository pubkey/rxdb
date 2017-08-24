import _regeneratorRuntime from 'babel-runtime/regenerator';
import _asyncToGenerator from 'babel-runtime/helpers/asyncToGenerator';
/**
 * this plugin allows delta-updates with mongo-like-syntax
 * It's using modifyjs internally
 * @link https://github.com/lgandecki/modifyjs
 */
import modifyjs from 'modifyjs';
import deepEqual from 'deep-equal';

export var update = function () {
    var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(updateObj) {
        var _this = this;

        var newDoc;
        return _regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        newDoc = modifyjs(this._data, updateObj);


                        Object.keys(this._data).forEach(function (previousPropName) {
                            if (newDoc[previousPropName]) {
                                // if we don't check inequality, it triggers an update attempt on fields that didn't really change,
                                // which causes problems with "readonly" fields
                                if (!deepEqual(_this._data[previousPropName], newDoc[previousPropName])) _this._data[previousPropName] = newDoc[previousPropName];
                            } else delete _this._data[previousPropName];
                        });
                        delete newDoc._rev;
                        delete newDoc._id;
                        Object.keys(newDoc).filter(function (newPropName) {
                            return !deepEqual(_this._data[newPropName], newDoc[newPropName]);
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

export var RxQuery_update = function () {
    var _ref2 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(updateObj) {
        var docs;
        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
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

export var rxdb = true;
export var prototypes = {
    RxDocument: function RxDocument(proto) {
        proto.update = update;
    },
    RxQuery: function RxQuery(proto) {
        proto.update = RxQuery_update;
    }
};

export default {
    rxdb: rxdb,
    prototypes: prototypes
};