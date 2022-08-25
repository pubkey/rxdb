import getPort, { makeRange } from 'get-port';

/**
 * For easier debugging, we increase the port each time
 * to ensure that no port is reused in the tests.
 */
let startPort = 18669;

const PORT_MAX = 65535;

/**
 * Returns an unused port.
 * Used to ensure that different tests
 * do not accidentiall use the same port.
 */
export async function nextPort(): Promise<number> {
    const port = await getPort({
        port: makeRange(startPort, PORT_MAX),
        host: '0.0.0.0',
    });
    startPort = port + 1;
    return port;
}
