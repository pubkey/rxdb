let lastPort = 6600;

/**
 * Returns an unused port.
 * Used to ensure that different tests
 * do not accidentiall use the same port.
 */
export function nextPort() {
    lastPort = lastPort + 1;
    return lastPort;
}
