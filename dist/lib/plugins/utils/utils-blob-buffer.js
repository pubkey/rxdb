"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.blobBufferUtil = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _utilsBase = require("./utils-base64");
/**
 * This is an abstraction over the Blob/Buffer data structure.
 * We need this because it behaves different in different JavaScript runtimes.
 * Since RxDB 13.0.0 we switch to Blob-only because Node.js does not support
 * the Blob data structure which is also supported by the browsers.
 */
var blobBufferUtil = {
  /**
   * depending if we are on node or browser,
   * we have to use Buffer(node) or Blob(browser)
   */
  createBlobBuffer: function createBlobBuffer(data, type) {
    var blobBuffer = new Blob([data], {
      type: type
    });
    return blobBuffer;
  },
  /**
   * depending if we are on node or browser,
   * we have to use Buffer(node) or Blob(browser)
   */
  createBlobBufferFromBase64: function () {
    var _createBlobBufferFromBase = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(base64String, type) {
      var base64Response, blob;
      return _regenerator["default"].wrap(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return fetch("data:" + type + ";base64," + base64String);
          case 2:
            base64Response = _context.sent;
            _context.next = 5;
            return base64Response.blob();
          case 5:
            blob = _context.sent;
            return _context.abrupt("return", blob);
          case 7:
          case "end":
            return _context.stop();
        }
      }, _callee);
    }));
    function createBlobBufferFromBase64(_x, _x2) {
      return _createBlobBufferFromBase.apply(this, arguments);
    }
    return createBlobBufferFromBase64;
  }(),
  isBlobBuffer: function isBlobBuffer(data) {
    if (data instanceof Blob || typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
      return true;
    } else {
      return false;
    }
  },
  toString: function toString(blobBuffer) {
    /**
     * in the electron-renderer we have a typed array insteaf of a blob
     * so we have to transform it.
     * @link https://github.com/pubkey/rxdb/issues/1371
     */
    var blobBufferType = Object.prototype.toString.call(blobBuffer);
    if (blobBufferType === '[object Uint8Array]') {
      blobBuffer = new Blob([blobBuffer]);
    }
    if (typeof blobBuffer === 'string') {
      return Promise.resolve(blobBuffer);
    }
    return blobBuffer.text();
  },
  toBase64String: function () {
    var _toBase64String = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(blobBuffer) {
      var blobBufferType, arrayBuffer;
      return _regenerator["default"].wrap(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            if (!(typeof blobBuffer === 'string')) {
              _context2.next = 2;
              break;
            }
            return _context2.abrupt("return", blobBuffer);
          case 2:
            /**
             * in the electron-renderer we have a typed array insteaf of a blob
             * so we have to transform it.
             * @link https://github.com/pubkey/rxdb/issues/1371
             */
            blobBufferType = Object.prototype.toString.call(blobBuffer);
            if (blobBufferType === '[object Uint8Array]') {
              blobBuffer = new Blob([blobBuffer]);
            }
            _context2.next = 6;
            return fetch(URL.createObjectURL(blobBuffer)).then(function (res) {
              return res.arrayBuffer();
            });
          case 6:
            arrayBuffer = _context2.sent;
            return _context2.abrupt("return", (0, _utilsBase.arrayBufferToBase64)(arrayBuffer));
          case 8:
          case "end":
            return _context2.stop();
        }
      }, _callee2);
    }));
    function toBase64String(_x3) {
      return _toBase64String.apply(this, arguments);
    }
    return toBase64String;
  }(),
  size: function size(blobBuffer) {
    return blobBuffer.size;
  }
};
exports.blobBufferUtil = blobBufferUtil;
//# sourceMappingURL=utils-blob-buffer.js.map