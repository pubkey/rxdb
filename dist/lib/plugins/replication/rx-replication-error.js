"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxReplicationPushError = exports.RxReplicationPullError = void 0;

var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));

var _wrapNativeSuper2 = _interopRequireDefault(require("@babel/runtime/helpers/wrapNativeSuper"));

var RxReplicationPullError = /*#__PURE__*/function (_Error) {
  (0, _inheritsLoose2["default"])(RxReplicationPullError, _Error);

  function RxReplicationPullError(message,
  /**
   * The last pulled document that exists on the client.
   * Null if there was no pull operation before
   * so that there is no last pulled document.
   */
  latestPulledDocument, innerErrors) {
    var _this;

    _this = _Error.call(this, message) || this;
    _this.type = 'pull';
    _this.message = message;
    _this.latestPulledDocument = latestPulledDocument;
    _this.innerErrors = innerErrors;
    return _this;
  }

  return RxReplicationPullError;
}( /*#__PURE__*/(0, _wrapNativeSuper2["default"])(Error));

exports.RxReplicationPullError = RxReplicationPullError;

var RxReplicationPushError = /*#__PURE__*/function (_Error2) {
  (0, _inheritsLoose2["default"])(RxReplicationPushError, _Error2);

  function RxReplicationPushError(message,
  /**
   * The documents that failed to be pushed.
   */
  documentsData, innerErrors) {
    var _this2;

    _this2 = _Error2.call(this, message) || this;
    _this2.type = 'push';
    _this2.message = message;
    _this2.documentsData = documentsData;
    _this2.innerErrors = innerErrors;
    return _this2;
  }

  return RxReplicationPushError;
}( /*#__PURE__*/(0, _wrapNativeSuper2["default"])(Error));

exports.RxReplicationPushError = RxReplicationPushError;
//# sourceMappingURL=rx-replication-error.js.map