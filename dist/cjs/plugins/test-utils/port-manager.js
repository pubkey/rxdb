"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.nextPort = nextPort;
var _getPort = _interopRequireWildcard(require("get-port"));
var _index = require("../utils/index.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (var _t in e) "default" !== _t && {}.hasOwnProperty.call(e, _t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, _t)) && (i.get || i.set) ? o(f, _t, i) : f[_t] = e[_t]); return f; })(e, t); }
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