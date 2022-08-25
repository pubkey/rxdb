import findFreePorts from 'find-free-ports';
import { ensureNotFalsy } from '../../';

let startPort = 12000;

/**
 * Returns an unused port.
 * Used to ensure that different tests
 * do not accidentiall use the same port.
 */
export async function nextPort(): Promise<number> {
    const freePorts = await findFreePorts(1, {
        startPort
    });
    const port = freePorts[0];

    /**
     * Even if a port gets free again,
     * do never reuse it to make debugging easier.
     */
    startPort = port + 1;

    return ensureNotFalsy(port);
}
