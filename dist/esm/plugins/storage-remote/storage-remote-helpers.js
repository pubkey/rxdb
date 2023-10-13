import { errorToPlainJson } from "../../plugins/utils/index.js";
export function createErrorAnswer(msg, error) {
  return {
    connectionId: msg.connectionId,
    answerTo: msg.requestId,
    method: msg.method,
    error: errorToPlainJson(error)
  };
}
export function createAnswer(msg, ret) {
  return {
    connectionId: msg.connectionId,
    answerTo: msg.requestId,
    method: msg.method,
    return: ret
  };
}
//# sourceMappingURL=storage-remote-helpers.js.map