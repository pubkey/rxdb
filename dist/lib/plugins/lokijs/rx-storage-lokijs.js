"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxStorageLoki = void 0;
exports.getRxStorageLoki = getRxStorageLoki;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _util = require("../../util");

var _rxStorageInstanceLoki = require("./rx-storage-instance-loki");

var _rxStorageKeyObjectInstanceLoki = require("./rx-storage-key-object-instance-loki");

var RxStorageLoki = /*#__PURE__*/function () {
  function RxStorageLoki(databaseSettings) {
    this.name = 'lokijs';
    this.databaseSettings = databaseSettings;
  }

  var _proto = RxStorageLoki.prototype;

  _proto.hash = function hash(data) {
    return Promise.resolve((0, _util.hash)(data));
  };

  _proto.createStorageInstance = /*#__PURE__*/function () {
    var _createStorageInstance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(params) {
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              return _context.abrupt("return", (0, _rxStorageInstanceLoki.createLokiStorageInstance)(params, this.databaseSettings));

            case 1:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    function createStorageInstance(_x) {
      return _createStorageInstance.apply(this, arguments);
    }

    return createStorageInstance;
  }();

  _proto.createKeyObjectStorageInstance = /*#__PURE__*/function () {
    var _createKeyObjectStorageInstance = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(params) {
      var useParams;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              // ensure we never mix up key-object data with normal storage documents.
              useParams = (0, _util.flatClone)(params);
              useParams.collectionName = params.collectionName + '-key-object';
              return _context2.abrupt("return", (0, _rxStorageKeyObjectInstanceLoki.createLokiKeyObjectStorageInstance)(params, this.databaseSettings));

            case 3:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    function createKeyObjectStorageInstance(_x2) {
      return _createKeyObjectStorageInstance.apply(this, arguments);
    }

    return createKeyObjectStorageInstance;
  }();

  return RxStorageLoki;
}();

exports.RxStorageLoki = RxStorageLoki;

function getRxStorageLoki() {
  var databaseSettings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var storage = new RxStorageLoki(databaseSettings);
  return storage;
}

//# sourceMappingURL=rx-storage-lokijs.js.map