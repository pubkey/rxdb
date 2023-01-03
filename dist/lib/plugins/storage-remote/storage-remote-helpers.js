"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createAnswer = createAnswer;
exports.createErrorAnswer = createErrorAnswer;
var _utils = require("../../plugins/utils");
function createErrorAnswer(msg, error) {
  return {
    connectionId: msg.connectionId,
    answerTo: msg.requestId,
    method: msg.method,
    error: (0, _utils.errorToPlainJson)(error)
  };
}
function createAnswer(msg, ret) {
  return {
    connectionId: msg.connectionId,
    answerTo: msg.requestId,
    method: msg.method,
    return: ret
  };
}
//# sourceMappingURL=storage-remote-helpers.js.map