import getPort, { makeRange } from 'get-port';
import { PROMISE_RESOLVE_VOID } from "../utils/index.js";

/**
 * For easier debugging, we increase the port each time
 * to ensure that no port is reused in the tests.
 */
var startPort = 18669;
var PORT_MAX = 65535;
var portQueue = PROMISE_RESOLVE_VOID;

/**
 * Returns an unused port.
 * Used to ensure that different tests
 * do not accidentally use the same port.
 */
export function nextPort() {
  portQueue = portQueue.then(async () => {
    var port = await getPort({
      port: makeRange(startPort, PORT_MAX),
      host: '0.0.0.0'
    });
    startPort = port + 1;
    return port;
  });
  return portQueue;
}
//# sourceMappingURL=port-manager.js.map