import getPort, { makeRange } from 'get-port';
import { PROMISE_RESOLVE_VOID } from '../utils/index.ts';

/**
 * For easier debugging, we increase the port each time
 * to ensure that no port is reused in the tests.
 */
let startPort = 18669;

const PORT_MAX = 65535;
let portQueue: Promise<number> = PROMISE_RESOLVE_VOID as any;

/**
 * Returns an unused port.
 * Used to ensure that different tests
 * do not accidentally use the same port.
 */
export function nextPort(): Promise<number> {
    portQueue = portQueue.then(async () => {
        const port = await getPort({
            port: makeRange(startPort, PORT_MAX),
            host: '0.0.0.0',
        });
        startPort = port + 1;
        return port;
    });
    return portQueue;
}
