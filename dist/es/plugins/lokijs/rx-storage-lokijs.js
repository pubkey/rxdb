import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import { hash as _hash } from '../../util';
import { createLokiStorageInstance } from './rx-storage-instance-loki';
import { createLokiKeyObjectStorageInstance } from './rx-storage-key-object-instance-loki';
export var RxStorageLoki = /*#__PURE__*/function () {
  function RxStorageLoki(databaseSettings) {
    this.name = 'lokijs';
    this.databaseSettings = databaseSettings;
  }

  var _proto = RxStorageLoki.prototype;

  _proto.hash = function hash(data) {
    return Promise.resolve(_hash(data));
  };

  _proto.createStorageInstance = /*#__PURE__*/function () {
    var _createStorageInstance = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(params) {
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              return _context.abrupt("return", createLokiStorageInstance(params, this.databaseSettings));

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
    var _createKeyObjectStorageInstance = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(params) {
      return _regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              return _context2.abrupt("return", createLokiKeyObjectStorageInstance(params, this.databaseSettings));

            case 1:
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
export function getRxStorageLoki() {
  var databaseSettings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var storage = new RxStorageLoki(databaseSettings);
  return storage;
}
//# sourceMappingURL=rx-storage-lokijs.js.map