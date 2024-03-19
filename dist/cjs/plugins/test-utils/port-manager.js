"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.nextPort = nextPort;
var _getPort = _interopRequireWildcard(require("get-port"));
var _index = require("../utils/index.js");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
/**
 * For easier debugging, we increase the port each time
 * to ensure that no port is reused in the tests.
 */
var startPort = 18669;
var PORT_MAX = 65535;
var portQueue = _index.PROMISE_RESOLVE_VOID;

/**
 * Returns an unused port.
 * Used to ensure that different tests
 * do not accidentally use the same port.
 */
function nextPort() {
  portQueue = portQueue.then(async () => {
    var port = await (0, _getPort.default)({
      port: (0, _getPort.makeRange)(startPort, PORT_MAX),
      host: '0.0.0.0'
    });
    startPort = port + 1;
    return port;
  });
  return portQueue;
}
//# sourceMappingURL=port-manager.js.map